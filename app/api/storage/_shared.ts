import { S3Client } from '@aws-sdk/client-s3'

export type UploadBucket =
  | 'documents'
  | 'books'
  | 'videos'
  | 'video-thumbnails'
  | 'covers'
  | 'video-category-covers'

export function getR2Config() {
  const r2AccountId = process.env.R2_ACCOUNT_ID
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const r2BucketName = process.env.R2_BUCKET_NAME || 'books' // Bucket for documents/books
  const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'videos' // Bucket for videos

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

export function getR2Client(cfg: {
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

export function buildObjectKey(params: {
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

export function resolveBucketInfo(
  cfg: ReturnType<typeof getR2Config>,
  bucket: UploadBucket
) {
  if (bucket === 'videos' || bucket === 'video-thumbnails' || bucket === 'video-category-covers') {
    return {
      bucketName: cfg.r2VideoBucketName,
      publicUrlBase: cfg.r2VideoPublicUrl,
    }
  }
  return {
    bucketName: cfg.r2BucketName,
    publicUrlBase: cfg.r2PublicUrl,
  }
}
