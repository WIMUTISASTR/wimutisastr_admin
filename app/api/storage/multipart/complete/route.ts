import { NextRequest } from 'next/server'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { getR2Client, getR2Config, resolveBucketInfo } from '@/app/api/storage/_shared'
import { validateBucket, validateKey, validateUploadId } from '../_shared'

type CompletePayload = {
  bucket: string
  key: string
  uploadId: string
  parts: { partNumber: number; etag: string }[]
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`multipart-complete:${clientId}`, RATE_LIMITS.UPLOAD)

    const body = (await request.json()) as CompletePayload
    const bucket = validateBucket(body.bucket)
    const key = validateKey(body.key)
    const uploadId = validateUploadId(body.uploadId)

    if (!Array.isArray(body.parts) || body.parts.length === 0) {
      throw new ValidationError('Missing parts')
    }

    const parts = body.parts
      .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
      .sort((a, b) => a.PartNumber - b.PartNumber)

    for (const part of parts) {
      if (!Number.isInteger(part.PartNumber) || part.PartNumber < 1) {
        throw new ValidationError('Invalid part number')
      }
      if (!part.ETag) {
        throw new ValidationError(`Missing ETag for part ${part.PartNumber}`)
      }
    }

    const cfg = getR2Config()
    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, bucket)
    const s3Client = getR2Client(cfg)

    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: actualBucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    )

    return successResponse({ key, bucket: actualBucketName })
  } catch (error) {
    return handleApiError(error)
  }
}
