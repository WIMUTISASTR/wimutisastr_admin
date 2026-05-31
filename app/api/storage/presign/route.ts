import { NextRequest } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { buildObjectKey, getR2Client, getR2Config, resolveBucketInfo, UploadBucket } from '@/app/api/storage/_shared'
import { ALLOWED_FILE_TYPES } from '@/app/dashboard/shared/constants'

const PRESIGN_EXPIRY_SECONDS = 60 * 60 // 1 hour for large direct uploads

type PresignPayload = {
  bucket: UploadBucket
  fileName: string
  contentType?: string | null
  path?: string | null
  category_id?: string | null
  category_name?: string | null
  fileSize?: number | null
}

function validateVideoExtension(fileName: string): void {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) {
    throw new ValidationError('Invalid file name')
  }
  const fileExt = `.${ext}` as (typeof ALLOWED_FILE_TYPES.VIDEOS)[number]
  if (!ALLOWED_FILE_TYPES.VIDEOS.includes(fileExt)) {
    throw new ValidationError(
      `Invalid video type. Allowed: ${ALLOWED_FILE_TYPES.VIDEOS.join(', ').replace(/\./g, '').toUpperCase()}`
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`presign:${clientId}`, RATE_LIMITS.UPLOAD)

    const body = (await request.json()) as PresignPayload

    if (!body?.bucket || !body?.fileName) {
      throw new ValidationError('Missing required fields: bucket or fileName')
    }

    const validBuckets: UploadBucket[] = [
      'documents',
      'books',
      'videos',
      'video-thumbnails',
      'covers',
      'video-category-covers',
    ]
    if (!validBuckets.includes(body.bucket)) {
      throw new ValidationError(`Invalid bucket. Must be one of: ${validBuckets.join(', ')}`)
    }

    if (body.bucket === 'videos') {
      validateVideoExtension(body.fileName)
      if (typeof body.fileSize === 'number' && body.fileSize <= 0) {
        throw new ValidationError('Invalid file size')
      }
    }

    const cfg = getR2Config()
    const { key, inferredKind } = buildObjectKey({
      bucket: body.bucket,
      pathHint: body.path ?? null,
      fileName: body.fileName,
      categoryId: body.category_id ?? null,
      categoryName: body.category_name ?? null,
    })

    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, body.bucket)
    const s3Client = getR2Client(cfg)
    const contentType = body.contentType || 'application/octet-stream'

    const command = new PutObjectCommand({
      Bucket: actualBucketName,
      Key: key,
      ContentType: contentType,
    })

    const expiresIn =
      body.bucket === 'videos' ? PRESIGN_EXPIRY_SECONDS : 15 * 60
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

    // Always serve through our authenticated endpoint (private buckets, paywall-gated).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('origin') || request.url.split('/api')[0])
    const publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`

    return successResponse({
      uploadUrl,
      path: key,
      publicUrl,
      url: publicUrl,
      kind: inferredKind,
      bucket: actualBucketName,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
