import { ValidationError } from '@/app/lib/errors'
import { UploadBucket } from '@/app/api/storage/_shared'

export const MULTIPART_VALID_BUCKETS: UploadBucket[] = [
  'documents',
  'books',
  'videos',
  'video-thumbnails',
  'covers',
  'video-category-covers',
]

const MIN_PART_SIZE = 5 * 1024 * 1024 // R2/S3 minimum (all parts except the last)
const DEFAULT_PART_SIZE = 16 * 1024 * 1024
const MAX_PARTS = 10000

/**
 * Pick a fixed part size so that every non-final part is identical (an R2 requirement)
 * and the total part count stays within the 10,000 limit.
 */
export function computePartSize(fileSize: number): number {
  let partSize = DEFAULT_PART_SIZE
  if (Math.ceil(fileSize / partSize) > MAX_PARTS) {
    const needed = Math.ceil(fileSize / MAX_PARTS)
    // Round up to the next whole MB.
    partSize = Math.ceil(needed / (1024 * 1024)) * (1024 * 1024)
  }
  return Math.max(partSize, MIN_PART_SIZE)
}

export function validateBucket(bucket: unknown): UploadBucket {
  if (typeof bucket !== 'string' || !MULTIPART_VALID_BUCKETS.includes(bucket as UploadBucket)) {
    throw new ValidationError(
      `Invalid bucket. Must be one of: ${MULTIPART_VALID_BUCKETS.join(', ')}`
    )
  }
  return bucket as UploadBucket
}

/**
 * The object key is generated server-side during "create" and echoed back by the client
 * for subsequent calls. Admins are authenticated, but we still reject obvious abuse.
 */
export function validateKey(key: unknown): string {
  if (typeof key !== 'string' || !key.trim()) {
    throw new ValidationError('Missing or invalid key')
  }
  if (key.includes('..') || key.includes('\0') || key.startsWith('/')) {
    throw new ValidationError('Invalid key')
  }
  return key
}

export function validateUploadId(uploadId: unknown): string {
  if (typeof uploadId !== 'string' || !uploadId.trim()) {
    throw new ValidationError('Missing or invalid uploadId')
  }
  return uploadId
}
