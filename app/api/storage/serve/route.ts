import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { verifyMembership, isAdminEmail, getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError } from '@/app/lib/errors'

// Cloudflare R2 configuration
const r2AccountId = process.env.R2_ACCOUNT_ID!
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
const r2BucketName = process.env.R2_BUCKET_NAME! // Default bucket for books
const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'videos'
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
      } catch {
        // Ignore admin check errors, will fall through to membership check
      }
    }

    // If not admin, verify membership
    if (!isAdmin) {
      await verifyMembership(request)
    }

    // Determine which bucket to use
    const inferredBucket = bucket || (() => {
      if (key.startsWith('videos/') || key.startsWith('video-thumbnails/') || key.startsWith('video-category-covers/')) {
        return r2VideoBucketName
      }
      return r2BucketName
    })()
    const actualBucketName = inferredBucket

    const rangeHeader = request.headers.get('range')

    // Get file from R2 (fallback between common video bucket names if needed)
    const s3Client = getR2Client()
    const isVideoKey = key.startsWith('videos/') || key.startsWith('video-thumbnails/') || key.startsWith('video-category-covers/')
    const videoBucketCandidates = Array.from(new Set([
      actualBucketName,
      r2VideoBucketName,
      'videos',
      'video',
    ].filter(Boolean)))
    const bucketCandidates = isVideoKey ? videoBucketCandidates : [actualBucketName]

    let response: GetObjectCommandOutput | null = null
    let lastError: unknown = null

    for (const candidate of bucketCandidates) {
      try {
        const command = new GetObjectCommand({
          Bucket: candidate,
          Key: key,
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        })
        response = await s3Client.send(command) as GetObjectCommandOutput
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!response) {
      throw lastError || new Error('File not found')
    }

    if (!response.Body) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Determine content type
    const contentType = response.ContentType || 'application/octet-stream'
    const contentLength = response.ContentLength
    const contentRange = response.ContentRange

    // Convert stream to web stream
    const bodyStream = (() => {
      const stream = response.Body as unknown
      if (typeof (stream as { transformToWebStream?: () => ReadableStream<Uint8Array> }).transformToWebStream === 'function') {
        return (stream as { transformToWebStream: () => ReadableStream<Uint8Array> }).transformToWebStream()
      }
      if (stream && stream instanceof Readable) {
        return Readable.toWeb(stream) as ReadableStream
      }
      return null
    })()

    if (!bodyStream) {
      return NextResponse.json(
        { error: 'Unsupported stream type' },
        { status: 500 }
      )
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
      // Allow embedding in same-origin iframes (used by admin preview UI)
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
    }

    if (rangeHeader && contentRange) {
      headers['Content-Range'] = contentRange
      if (contentLength !== undefined) {
        headers['Content-Length'] = String(contentLength)
      }
      return new NextResponse(bodyStream, {
        status: 206,
        headers,
      })
    }

    if (contentLength) {
      headers['Content-Length'] = String(contentLength)
    }

    // Return file with appropriate headers
    return new NextResponse(bodyStream, { headers })
  } catch (error: unknown) {
    console.error('R2 serve error:', error)
    return handleApiError(error)
  }
}

