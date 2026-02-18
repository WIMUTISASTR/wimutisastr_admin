import { NextRequest } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { buildObjectKey, getR2Client, getR2Config, resolveBucketInfo, UploadBucket } from '@/app/api/storage/_shared'

type PresignPayload = {
  bucket: UploadBucket
  fileName: string
  contentType?: string | null
  path?: string | null
  category_id?: string | null
  category_name?: string | null
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

    const cfg = getR2Config()
    const { key, inferredKind } = buildObjectKey({
      bucket: body.bucket,
      pathHint: body.path ?? null,
      fileName: body.fileName,
      categoryId: body.category_id ?? null,
      categoryName: body.category_name ?? null,
    })

    const { bucketName: actualBucketName, publicUrlBase } = resolveBucketInfo(cfg, body.bucket)
    const s3Client = getR2Client(cfg)
    const contentType = body.contentType || 'application/octet-stream'

    const command = new PutObjectCommand({
      Bucket: actualBucketName,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('origin') || request.url.split('/api')[0])
    const defaultPublicUrl = `https://${cfg.r2AccountId}.r2.cloudflarestorage.com/${actualBucketName}`
    let publicUrl: string
    if (
      body.bucket === 'videos' ||
      body.bucket === 'video-thumbnails' ||
      body.bucket === 'video-category-covers'
    ) {
      publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`
    } else if (publicUrlBase && publicUrlBase !== defaultPublicUrl) {
      publicUrl = publicUrlBase.endsWith('/')
        ? `${publicUrlBase}${key}`
        : `${publicUrlBase}/${key}`
    } else {
      publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`
    }

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
