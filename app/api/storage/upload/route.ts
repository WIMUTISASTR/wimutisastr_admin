import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Cloudflare R2 configuration
const r2AccountId = process.env.R2_ACCOUNT_ID!
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
const r2BucketName = process.env.R2_BUCKET_NAME! // Default bucket for books
const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'video' // Bucket for videos
const r2PublicUrl = process.env.R2_PUBLIC_URL || `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}`
const r2VideoPublicUrl = process.env.R2_VIDEO_PUBLIC_URL || `https://${r2AccountId}.r2.cloudflarestorage.com/${r2VideoBucketName}`

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

// POST - Upload file to Cloudflare R2 storage
export async function POST(request: NextRequest) {
  try {
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      return NextResponse.json(
        { error: 'R2 storage credentials not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string
    const categoryId = formData.get('category_id') as string | null
    const categoryName = formData.get('category_name') as string | null

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bucket, or path' },
        { status: 400 }
      )
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine which R2 bucket to use based on the bucket parameter
    let actualBucketName: string
    let publicUrlBase: string
    
    if (bucket === 'videos' || bucket === 'video-thumbnails' || bucket === 'video-category-covers') {
      // Use video bucket for video-related uploads
      actualBucketName = r2VideoBucketName
      publicUrlBase = r2VideoPublicUrl
    } else {
      // Use book bucket for documents/books
      actualBucketName = r2BucketName
      publicUrlBase = r2PublicUrl
    }

    // Build the key path with category-based organization for books
    let key = path
    
    // If category information is provided and this is a book/document upload, organize by category
    if (categoryId && categoryName && (bucket === 'documents' || bucket === 'books')) {
      // Create URL-friendly category name (lowercase, replace spaces with hyphens)
      const categorySlug = categoryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      // Extract filename from path
      const filename = path.split('/').pop() || path
      
      // Organize by category: books/{category-slug}/{filename}
      // For covers: books/{category-slug}/covers/{filename}
      if (path.startsWith('covers/')) {
        const coverFilename = path.replace('covers/', '')
        key = `books/${categorySlug}/covers/${coverFilename}`
      } else {
        key = `books/${categorySlug}/${filename}`
      }
    } else {
      // For non-book uploads (videos, etc.), use the original path structure
      key = path
    }

    // Upload file to R2
    const s3Client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: actualBucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    // Generate public URL
    // If R2_PUBLIC_URL is set (custom domain with public access), use it
    // Otherwise, use our API serve endpoint which handles authentication
    let publicUrl: string
    const defaultPublicUrl = `https://${r2AccountId}.r2.cloudflarestorage.com/${actualBucketName}`
    
    if (publicUrlBase && publicUrlBase !== defaultPublicUrl) {
      // Custom domain is set (assumed to be public)
      publicUrl = publicUrlBase.endsWith('/') 
        ? `${publicUrlBase}${key}` 
        : `${publicUrlBase}/${key}`
    } else {
      // Use our API serve endpoint (works with private buckets)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (request.headers.get('origin') || request.url.split('/api')[0])
      publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`
    }

    return NextResponse.json({ 
      path: key,
      publicUrl,
      url: publicUrl // Alias for compatibility
    })
  } catch (error: any) {
    console.error('R2 upload error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload file' 
    }, { status: 500 })
  }
}

