import { NextRequest } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// Cloudflare R2 configuration
function getR2Config() {
  const r2AccountId = process.env.R2_ACCOUNT_ID
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const r2BucketName = process.env.R2_BUCKET_NAME || 'books' // Bucket for documents/books
  const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'video' // Bucket for videos

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 storage credentials not configured')
  }

  const r2PublicUrl =
    process.env.R2_PUBLIC_URL ||
    `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}`
  const r2VideoPublicUrl =
    process.env.R2_VIDEO_PUBLIC_URL ||
    `https://${r2AccountId}.r2.cloudflarestorage.com/${r2VideoBucketName}`

  return {
    r2AccountId,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2BucketName,
    r2VideoBucketName,
    r2PublicUrl,
    r2VideoPublicUrl,
  }
}

// Create R2 S3 client (R2 is S3-compatible)
function getR2Client(cfg: {
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
}) {
  if (!cfg.r2AccountId || !cfg.r2AccessKeyId || !cfg.r2SecretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.r2AccessKeyId,
      secretAccessKey: cfg.r2SecretAccessKey,
    },
  })
}

type UploadBucket =
  | 'documents'
  | 'books'
  | 'videos'
  | 'video-thumbnails'
  | 'covers'
  | 'video-category-covers'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function safeFileBaseName(fileName: string): { base: string; ext: string } {
  const lastDot = fileName.lastIndexOf('.')
  const rawBase = lastDot > 0 ? fileName.slice(0, lastDot) : fileName
  const rawExt = lastDot > 0 ? fileName.slice(lastDot + 1) : ''
  const base = slugify(rawBase) || 'file'
  const ext = slugify(rawExt)
  return { base, ext }
}

function getUploadId(): string {
  // Node runtime provides crypto.randomUUID(); this route is Node, not Edge.
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function getTopLevelFolderFromPath(path: string | null): string | null {
  if (!path) return null
  const normalized = path.replace(/\\/g, '/')
  // Block obvious traversal attempts and weird keys
  if (normalized.includes('..') || normalized.includes('\0')) return null
  const first = normalized.split('/').filter(Boolean)[0]
  return first || null
}

function buildObjectKey(params: {
  bucket: UploadBucket
  pathHint: string | null
  fileName: string
  categoryId: string | null
  categoryName: string | null
}): { key: string; inferredKind: string } {
  const id = getUploadId()
  const { base, ext } = safeFileBaseName(params.fileName)
  const suffix = ext ? `.${ext}` : ''

  const folderHint = getTopLevelFolderFromPath(params.pathHint)
  const categorySlug = params.categoryName ? slugify(params.categoryName) : ''
  const categoryPart = categorySlug || params.categoryId || 'uncategorized'

  switch (params.bucket) {
    case 'videos':
      return { key: `videos/${id}-${base}${suffix}`, inferredKind: 'video' }
    case 'video-thumbnails':
      return { key: `video-thumbnails/${id}-${base}${suffix}`, inferredKind: 'video-thumbnail' }
    case 'video-category-covers':
      return { key: `video-category-covers/${id}-${base}${suffix}`, inferredKind: 'video-category-cover' }
    case 'covers':
      // Book/document category covers
      return { key: `category-covers/${id}-${base}${suffix}`, inferredKind: 'category-cover' }
    case 'books':
    case 'documents': {
      // Documents bucket is used for book files, covers, and other assets (qr-codes).
      if (folderHint === 'covers') {
        return {
          key: `books/${categoryPart}/covers/${id}-${base}${suffix}`,
          inferredKind: 'book-cover',
        }
      }
      if (folderHint === 'qr-codes') {
        return { key: `qr-codes/${id}-${base}${suffix}`, inferredKind: 'qr-code' }
      }
      // Default: a document/book file
      return { key: `books/${categoryPart}/${id}-${base}${suffix}`, inferredKind: 'document' }
    }
  }
}

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

    // Validate file size (max 2GB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > MAX_FILE_SIZE) {
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

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine which R2 bucket to use based on the bucket parameter
    let actualBucketName: string
    let publicUrlBase: string
    
    if (bucket === 'videos' || bucket === 'video-thumbnails' || bucket === 'video-category-covers') {
      // Use video bucket for video-related uploads
      actualBucketName = cfg.r2VideoBucketName
      publicUrlBase = cfg.r2VideoPublicUrl
    } else {
      // Use book bucket for documents/books
      actualBucketName = cfg.r2BucketName
      publicUrlBase = cfg.r2PublicUrl
    }

    // Server-generated object keys. Client-provided `path` is treated only as a hint
    // (e.g. "covers/..." vs "documents/..." vs "qr-codes/...") and never trusted as-is.
    const { key, inferredKind } = buildObjectKey({
      bucket: bucket as UploadBucket,
      pathHint: path,
      fileName: file.name,
      categoryId,
      categoryName,
    })

    // Upload file to R2
    const s3Client = getR2Client(cfg)
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
    const defaultPublicUrl = `https://${cfg.r2AccountId}.r2.cloudflarestorage.com/${actualBucketName}`
    
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

    return successResponse({ 
      path: key,
      publicUrl,
      url: publicUrl, // Alias for compatibility
      kind: inferredKind,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

