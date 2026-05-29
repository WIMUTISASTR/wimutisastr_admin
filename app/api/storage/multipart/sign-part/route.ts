import { NextRequest } from 'next/server'
import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { getR2Client, getR2Config, resolveBucketInfo } from '@/app/api/storage/_shared'
import { validateBucket, validateKey, validateUploadId } from '../_shared'

const PART_URL_EXPIRY_SECONDS = 60 * 60

type SignPartPayload = {
  bucket: string
  key: string
  uploadId: string
  partNumbers: number[]
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`multipart-sign:${clientId}`, RATE_LIMITS.API_WRITE)

    const body = (await request.json()) as SignPartPayload
    const bucket = validateBucket(body.bucket)
    const key = validateKey(body.key)
    const uploadId = validateUploadId(body.uploadId)

    if (!Array.isArray(body.partNumbers) || body.partNumbers.length === 0) {
      throw new ValidationError('Missing partNumbers')
    }
    if (body.partNumbers.length > 1000) {
      throw new ValidationError('Too many parts requested at once')
    }
    for (const partNumber of body.partNumbers) {
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        throw new ValidationError('Invalid part number')
      }
    }

    const cfg = getR2Config()
    const { bucketName: actualBucketName } = resolveBucketInfo(cfg, bucket)
    const s3Client = getR2Client(cfg)

    const partUrls: { partNumber: number; url: string }[] = []
    for (const partNumber of body.partNumbers) {
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

    return successResponse({ partUrls })
  } catch (error) {
    return handleApiError(error)
  }
}
