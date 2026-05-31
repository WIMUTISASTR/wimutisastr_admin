import { NextRequest } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { validateFileMagicBytes } from '@/app/lib/file-validation'
import { buildObjectKey, getR2Client, getR2Config, resolveBucketInfo, UploadBucket } from '@/app/api/storage/_shared'
import { optimizeCoverImage, optimizeImage, optimizeThumbnail, shouldOptimizeImage } from '@/app/lib/storage-optimization'
import { compressVideo, shouldCompressVideo } from '@/app/lib/video-compression'

// POST - Upload file to Cloudflare R2 storage
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`upload:${clientId}`, RATE_LIMITS.UPLOAD)

    const cfg = getR2Config()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = (formData.get('path') as string | null) ?? null
    const categoryId = formData.get('category_id') as string | null
    const categoryName = formData.get('category_name') as string | null

    if (!file || !bucket) {
      throw new ValidationError('Missing required fields: file or bucket')
    }

    // Validate file size (thumbnails, covers, documents — not raw video uploads via presign)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
    if (bucket !== 'videos' && file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size exceeds maximum limit of 2GB')
    }

    // Validate bucket name
    const validBuckets: UploadBucket[] = [
      'documents',
      'books',
      'videos',
      'video-thumbnails',
      'covers',
      'video-category-covers',
    ]
    if (!validBuckets.includes(bucket as UploadBucket)) {
      throw new ValidationError(`Invalid bucket. Must be one of: ${validBuckets.join(', ')}`)
    }

    // Validate file content using magic bytes for security
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const isValidContent = await validateFileMagicBytes(file, fileExtension)
    if (!isValidContent) {
      throw new ValidationError(
        'File content does not match its extension. The file may be corrupted or misnamed.'
      )
    }

    // Server-generated object keys. Client-provided `path` is treated only as a hint
    // (e.g. "covers/..." vs "documents/..." vs "qr-codes/...") and never trusted as-is.
    const generated = buildObjectKey({
      bucket: bucket as UploadBucket,
      pathHint: path,
      fileName: file.name,
      categoryId,
      categoryName,
    })
    let key = generated.key
    const { inferredKind } = generated

    // Convert File to buffer (with optional image/video optimization)
    let buffer: Buffer
    let contentType = file.type || 'application/octet-stream'
    let compressionMeta: {
      type: 'image' | 'video'
      compressed: boolean
      originalSize: number
      optimizedSize: number
      compressionRatio: number
      reason?: string
    } | null = null

    if (shouldOptimizeImage(file.type)) {
      let optimized
      if (bucket === 'video-thumbnails' || inferredKind === 'video-thumbnail') {
        optimized = await optimizeThumbnail(file)
      } else if (
        bucket === 'covers' ||
        bucket === 'video-category-covers' ||
        inferredKind === 'book-cover' ||
        inferredKind === 'category-cover' ||
        inferredKind === 'video-category-cover'
      ) {
        optimized = await optimizeCoverImage(file)
      } else {
        optimized = await optimizeImage(file)
      }
      buffer = optimized.buffer
      contentType = optimized.mimeType
      compressionMeta = {
        type: 'image',
        compressed: optimized.optimizedSize < optimized.originalSize,
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        compressionRatio: optimized.compressionRatio,
      }
    } else if (shouldCompressVideo(file.type, bucket)) {
      const compressedVideo = await compressVideo(file)
      buffer = compressedVideo.buffer
      contentType = compressedVideo.mimeType
      if (compressedVideo.compressed && compressedVideo.mimeType === 'video/mp4' && !key.toLowerCase().endsWith('.mp4')) {
        key = key.includes('.') ? key.replace(/\.[^./]+$/, '.mp4') : `${key}.mp4`
      }
      compressionMeta = {
        type: 'video',
        compressed: compressedVideo.compressed,
        originalSize: compressedVideo.originalSize,
        optimizedSize: compressedVideo.optimizedSize,
        compressionRatio: compressedVideo.compressionRatio,
        reason: compressedVideo.reason,
      }
    } else {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }

    // Determine which R2 bucket to use based on the bucket parameter
    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, bucket as UploadBucket)

    // Upload file to R2
    const s3Client = getR2Client(cfg)
    const command = new PutObjectCommand({
      Bucket: actualBucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await s3Client.send(command)

    // Always serve through our authenticated endpoint so access control (membership /
    // admin) is enforced on every read. Both documents/books and videos use private
    // buckets behind /api/storage/serve — we never mint direct public-object URLs.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('origin') || request.url.split('/api')[0])
    const publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`

    return successResponse({ 
      path: key,
      publicUrl,
      url: publicUrl, // Alias for compatibility
      kind: inferredKind,
      compression: compressionMeta,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

