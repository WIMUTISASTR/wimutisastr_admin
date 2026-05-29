import { NextRequest } from 'next/server'
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { getR2Client, getR2Config, resolveBucketInfo } from '@/app/api/storage/_shared'
import { validateBucket, validateKey, validateUploadId } from '../_shared'

type AbortPayload = {
  bucket: string
  key: string
  uploadId: string
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`multipart-abort:${clientId}`, RATE_LIMITS.UPLOAD)

    const body = (await request.json()) as AbortPayload
    const bucket = validateBucket(body.bucket)
    const key = validateKey(body.key)
    const uploadId = validateUploadId(body.uploadId)

    const cfg = getR2Config()
    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, bucket)
    const s3Client = getR2Client(cfg)

    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: actualBucketName,
        Key: key,
        UploadId: uploadId,
      })
    )

    return successResponse({ aborted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
