'use client'

import { apiFetch } from './api'

export type PresignStorageBucket =
  | 'videos'
  | 'video-thumbnails'
  | 'documents'
  | 'books'
  | 'covers'
  | 'video-category-covers'

export interface PresignedUploadResult {
  path: string
  publicUrl: string
  url: string
}

interface PresignApiResponse {
  data?: {
    uploadUrl: string
    path: string
    publicUrl: string
    url: string
  }
  error?: string
}

/**
 * PUT file bytes directly to R2 using a presigned URL (bypasses Vercel body limits).
 */
export function uploadFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Direct upload failed (HTTP ${xhr.status})`))
    })

    xhr.addEventListener('error', () => {
      reject(
        new Error(
          'Network error during direct upload. Ensure your R2 bucket allows CORS PUT from this admin domain.'
        )
      )
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(file)
  })
}

/**
 * Request a presigned URL from the admin API, then upload the file straight to R2.
 */
export async function presignAndUploadFile(
  file: File,
  options: {
    bucket: PresignStorageBucket
    pathHint?: string
    category_id?: string | null
    category_name?: string | null
    onProgress?: (progress: number) => void
  }
): Promise<PresignedUploadResult> {
  const contentType = file.type || 'application/octet-stream'

  const presignResponse = await apiFetch('/api/storage/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket: options.bucket,
      fileName: file.name,
      contentType,
      path: options.pathHint ?? null,
      category_id: options.category_id ?? null,
      category_name: options.category_name ?? null,
      fileSize: file.size,
    }),
  })

  const presignResult = (await presignResponse.json()) as PresignApiResponse
  if (!presignResponse.ok) {
    throw new Error(presignResult.error || 'Failed to prepare upload')
  }

  const uploadUrl = presignResult.data?.uploadUrl
  const path = presignResult.data?.path
  const publicUrl = presignResult.data?.publicUrl || presignResult.data?.url

  if (!uploadUrl || !path) {
    throw new Error('Invalid presign response')
  }

  await uploadFileToPresignedUrl(file, uploadUrl, contentType, options.onProgress)

  return {
    path,
    publicUrl: publicUrl || path,
    url: publicUrl || path,
  }
}
