'use client'

import { apiFetch } from './api'
import type { PresignStorageBucket, PresignedUploadResult } from './presignedUpload'
import type { MultipartState } from './uploadPersistence'

interface CreateResponse {
  data?: {
    uploadId: string
    key: string
    bucket: string
    partSize: number
    partCount: number
    partUrls: { partNumber: number; url: string }[]
    publicUrl: string
    url: string
  }
  error?: string
}

interface SignPartResponse {
  data?: { partUrls: { partNumber: number; url: string }[] }
  error?: string
}

const PART_CONCURRENCY = 3
const PART_MAX_ATTEMPTS = 3

export interface UploadProgressInfo {
  loaded: number
  total: number
  bytesPerSec: number
}

export type ProgressCallback = (progress: number, info?: UploadProgressInfo) => void

interface UploadedPart {
  partNumber: number
  etag: string
}

/** Exponentially-smoothed upload-speed estimator (bytes/sec). */
function createSpeedMeter() {
  let lastLoaded = 0
  let lastTime = 0
  let ema = 0
  return (loaded: number): number => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (lastTime === 0) {
      lastTime = now
      lastLoaded = loaded
      return 0
    }
    const dt = (now - lastTime) / 1000
    if (dt < 0.15) return ema // throttle noisy samples
    const dBytes = loaded - lastLoaded
    lastTime = now
    lastLoaded = loaded
    if (dBytes <= 0) return ema
    const instant = dBytes / dt
    ema = ema === 0 ? instant : ema * 0.7 + instant * 0.3
    return ema
  }
}

/**
 * PUT a single part to its presigned URL, reporting incremental byte progress and
 * returning the ETag (required to complete the multipart upload).
 */
function putPart(
  url: string,
  blob: Blob,
  onBytes: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onBytes(e.loaded)
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag')
        if (!etag) {
          reject(
            new Error(
              'Missing ETag from R2. Add "ETag" to the bucket CORS ExposeHeaders setting.'
            )
          )
          return
        }
        resolve(etag)
        return
      }
      reject(new Error(`Part upload failed (HTTP ${xhr.status})`))
    })

    xhr.addEventListener('error', () => {
      reject(
        new Error(
          'Network error during part upload. Ensure your R2 bucket allows CORS PUT from this admin domain.'
        )
      )
    })
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.open('PUT', url)
    xhr.send(blob)
  })
}

async function resignPart(
  bucket: string,
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const res = await apiFetch('/api/storage/multipart/sign-part', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, key, uploadId, partNumbers: [partNumber] }),
  })
  const json = (await res.json()) as SignPartResponse
  if (!res.ok || !json.data?.partUrls?.[0]?.url) {
    throw new Error(json.error || 'Failed to refresh part URL')
  }
  return json.data.partUrls[0].url
}

/**
 * Upload a (large) file to R2 using S3-style multipart upload:
 * direct browser → R2, parts in parallel, per-part retries with URL refresh.
 *
 * Resumable: pass `resumeState` (restored from persistence after a refresh) to skip parts
 * that already finished. `onCreated`/`onPartCompleted` let the caller persist progress so a
 * future page load can resume. On an *unrecoverable* error the multipart upload is aborted.
 */
export async function multipartUploadFile(
  file: File,
  options: {
    bucket: PresignStorageBucket
    pathHint?: string
    category_id?: string | null
    category_name?: string | null
    onProgress?: ProgressCallback
    resumeState?: MultipartState | null
    onCreated?: (state: MultipartState) => void | Promise<void>
    onPartCompleted?: (state: MultipartState) => void | Promise<void>
  }
): Promise<PresignedUploadResult> {
  const contentType = file.type || 'application/octet-stream'

  let state: MultipartState
  const urlByPart = new Map<number, string>()

  if (options.resumeState) {
    state = {
      ...options.resumeState,
      completedParts: [...options.resumeState.completedParts],
    }
  } else {
    const createRes = await apiFetch('/api/storage/multipart/create', {
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

    const created = (await createRes.json()) as CreateResponse
    if (!createRes.ok || !created.data) {
      throw new Error(created.error || 'Failed to start multipart upload')
    }

    state = {
      uploadId: created.data.uploadId,
      key: created.data.key,
      bucket: created.data.bucket,
      partSize: created.data.partSize,
      partCount: created.data.partCount,
      publicUrl: created.data.publicUrl,
      completedParts: [],
    }
    for (const p of created.data.partUrls) urlByPart.set(p.partNumber, p.url)
    await options.onCreated?.(state)
  }

  const { uploadId, key, bucket: actualBucket, partSize, partCount, publicUrl } = state
  const completedByPart = new Map<number, string>()
  for (const p of state.completedParts) completedByPart.set(p.partNumber, p.etag)

  const loadedBytes = new Array<number>(partCount).fill(0)
  // Pre-fill bytes for parts that already finished (resume) so progress is accurate.
  for (const p of state.completedParts) {
    const idx = p.partNumber - 1
    const start = idx * partSize
    loadedBytes[idx] = Math.min(start + partSize, file.size) - start
  }

  const speedMeter = createSpeedMeter()
  const reportProgress = () => {
    if (!options.onProgress) return
    const total = file.size || 1
    const sum = loadedBytes.reduce((acc, n) => acc + n, 0)
    const bytesPerSec = speedMeter(sum)
    options.onProgress(Math.min(100, (sum / total) * 100), {
      loaded: sum,
      total: file.size,
      bytesPerSec,
    })
  }
  reportProgress()

  const recordPart = async (part: UploadedPart) => {
    if (completedByPart.has(part.partNumber)) return
    completedByPart.set(part.partNumber, part.etag)
    state.completedParts.push(part)
    await options.onPartCompleted?.(state)
  }

  const uploadOnePart = async (partNumber: number): Promise<void> => {
    if (completedByPart.has(partNumber)) return

    const start = (partNumber - 1) * partSize
    const end = Math.min(start + partSize, file.size)
    const blob = file.slice(start, end)
    const index = partNumber - 1

    let lastError: unknown
    for (let attempt = 1; attempt <= PART_MAX_ATTEMPTS; attempt++) {
      try {
        let url = urlByPart.get(partNumber)
        if (!url || attempt > 1) {
          url = await resignPart(actualBucket, key, uploadId, partNumber)
          urlByPart.set(partNumber, url)
        }
        const etag = await putPart(url, blob, (loaded) => {
          loadedBytes[index] = loaded
          reportProgress()
        })
        loadedBytes[index] = end - start
        reportProgress()
        await recordPart({ partNumber, etag })
        return
      } catch (err) {
        lastError = err
        loadedBytes[index] = 0
        reportProgress()
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to upload part ${partNumber}`)
  }

  try {
    const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1).filter(
      (n) => !completedByPart.has(n)
    )
    let cursor = 0

    const worker = async () => {
      while (cursor < partNumbers.length) {
        const partNumber = partNumbers[cursor++]
        await uploadOnePart(partNumber)
      }
    }

    if (partNumbers.length > 0) {
      const workers = Array.from(
        { length: Math.min(PART_CONCURRENCY, partNumbers.length) },
        () => worker()
      )
      await Promise.all(workers)
    }

    const completeRes = await apiFetch('/api/storage/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: actualBucket,
        key,
        uploadId,
        parts: state.completedParts.map((p) => ({
          partNumber: p.partNumber,
          etag: p.etag,
        })),
      }),
    })

    const completeJson = await completeRes.json()
    if (!completeRes.ok) {
      throw new Error(completeJson.error || 'Failed to complete multipart upload')
    }

    options.onProgress?.(100)

    return {
      path: key,
      publicUrl: publicUrl || key,
      url: publicUrl || key,
    }
  } catch (error) {
    // Best-effort cleanup so we don't leave dangling parts billing in R2.
    try {
      await apiFetch('/api/storage/multipart/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: actualBucket, key, uploadId }),
      })
    } catch {
      // ignore abort failures
    }
    throw error
  }
}
