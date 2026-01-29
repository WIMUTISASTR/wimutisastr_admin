import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { verifyMembership, isAdminEmail, getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError } from '@/app/lib/errors'

// Cloudflare R2 configuration
const r2AccountId = process.env.R2_ACCOUNT_ID!
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
const r2BucketName = process.env.R2_BUCKET_NAME! // Default bucket for books
const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'video' // Bucket for videos

// Create R2 S3 client (R2 is S3-compatible)
function getR2Client() {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
}

// GET - Serve file from R2 storage
export async function GET(request: NextRequest) {
  try {
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      return NextResponse.json(
        { error: 'R2 storage credentials not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const bucket = searchParams.get('bucket')

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Verify membership before serving content
    // Allow admins to bypass membership check
    let isAdmin = false
    
    // Check 1: PIN-based admin authentication (for admin panel)
    try {
      await verifyPinCookie(request)
      isAdmin = true
    } catch {
      // Not admin via PIN, continue checking other auth methods
    }
    
    // Check 2: Supabase token-based admin authentication (for API calls)
    if (!isAdmin) {
      try {
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')
        
        if (token) {
          const supabaseAdmin = getSupabaseAdmin()
          const { data: { user } } = await supabaseAdmin.auth.getUser(token)
          
          if (user && user.email && isAdminEmail(user.email)) {
            isAdmin = true
          }
        }
      } catch (error) {
        // Ignore admin check errors, will fall through to membership check
      }
    }

    // If not admin, verify membership
    if (!isAdmin) {
      await verifyMembership(request)
    }

    // Determine which bucket to use
    const actualBucketName = bucket || r2BucketName

    // Get file from R2
    const s3Client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: actualBucketName,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Convert stream to buffer
    const chunks: Buffer[] = []
    const stream = response.Body as any
    
    // Handle the stream (AWS SDK v3 returns a Readable stream)
    if (typeof stream.transformToWebStream === 'function') {
      // Web stream
      const webStream = stream.transformToWebStream()
      const reader = webStream.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(Buffer.from(value))
      }
    } else {
      // Node.js stream
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }
    }

    const buffer = Buffer.concat(chunks)

    // Determine content type
    const contentType = response.ContentType || 'application/octet-stream'

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Allow embedding in same-origin iframes (used by admin preview UI)
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    })
  } catch (error: any) {
    console.error('R2 serve error:', error)
    return handleApiError(error)
  }
}

