import { NextRequest } from 'next/server'
import { CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { buildObjectKey, getR2Client, getR2Config, resolveBucketInfo } from '@/app/api/storage/_shared'
import { ALLOWED_FILE_TYPES } from '@/app/dashboard/shared/constants'
import { computePartSize, validateBucket } from '../_shared'

const PART_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour per presigned part URL

type CreatePayload = {
  bucket: string
  fileName: string
  contentType?: string | null
  path?: string | null
  category_id?: string | null
  category_name?: string | null
  fileSize: number
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
    checkRateLimit(`multipart-create:${clientId}`, RATE_LIMITS.UPLOAD)

    const body = (await request.json()) as CreatePayload

    if (!body?.bucket || !body?.fileName) {
      throw new ValidationError('Missing required fields: bucket or fileName')
    }
    const bucket = validateBucket(body.bucket)

    if (typeof body.fileSize !== 'number' || body.fileSize <= 0) {
      throw new ValidationError('Invalid file size')
    }

    if (bucket === 'videos') {
      validateVideoExtension(body.fileName)
    }

    const cfg = getR2Config()
    const { key } = buildObjectKey({
      bucket,
      pathHint: body.path ?? null,
      fileName: body.fileName,
      categoryId: body.category_id ?? null,
      categoryName: body.category_name ?? null,
    })

    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, bucket)
    const s3Client = getR2Client(cfg)
    const contentType = body.contentType || 'application/octet-stream'

    const createResult = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: actualBucketName,
        Key: key,
        ContentType: contentType,
      })
    )

    const uploadId = createResult.UploadId
    if (!uploadId) {
      throw new Error('R2 did not return an upload id')
    }

    const partSize = computePartSize(body.fileSize)
    const partCount = Math.max(1, Math.ceil(body.fileSize / partSize))

    const partUrls: { partNumber: number; url: string }[] = []
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const url = await getSignedUrl(
        s3Client,
        new UploadPartCommand({
          Bucket: actualBucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: PART_URL_EXPIRY_SECONDS }
      )
      partUrls.push({ partNumber, url })
    }

    // Always serve through our authenticated endpoint (private buckets, paywall-gated).
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      request.url.split('/api')[0]
    const publicUrl = `${baseUrl}/api/storage/serve?key=${encodeURIComponent(key)}&bucket=${encodeURIComponent(actualBucketName)}`

    return successResponse({
      uploadId,
      key,
      bucket: actualBucketName,
      partSize,
      partCount,
      partUrls,
      publicUrl,
      url: publicUrl,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
