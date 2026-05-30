'use client'

/**
 * IndexedDB-backed persistence for in-flight video uploads.
 *
 * Why: a page refresh destroys the JS context and kills any in-flight upload. Multipart
 * uploads are resumable on R2 (already-sent parts persist), so we store the job — including
 * the file bytes and which parts finished — here. On the next load the queue resumes them.
 *
 * Design: the (potentially multi-GB) file bytes live in a separate "files" store written
 * EXACTLY ONCE. Lightweight progress ("meta") is written frequently as parts complete.
 * Never re-serialize the big blob on every progress tick — that would starve the upload.
 */

export type MultipartState = {
  uploadId: string
  key: string
  bucket: string
  partSize: number
  partCount: number
  publicUrl: string
  completedParts: { partNumber: number; etag: string }[]
}

export type UploadMediaType = 'video' | 'document'

export type UploadJobPhase = 'video' | 'thumb' | 'file' | 'save'

// Lightweight, frequently-updated portion (no file blobs).
export type UploadMetaRecord = {
  id: string
  mediaType: UploadMediaType
  kind: 'create' | 'update'
  createdAt: number
  label: string

  videoFileName: string | null
  videoFileType: string | null
  videoFileSize: number | null

  title: string
  presented_by: string
  description: string
  category_id: string
  category_name: string | null
  access_level: 'free' | 'members'

  // Video-only
  videoId?: string
  isThumbnailRemoved?: boolean
  existingThumbnailUrl?: string | null

  // Document-only
  author?: string
  year?: string
  bookId?: string

  existingFileUrl?: string
  existingFileName?: string
  existingFileSize?: number

  phase: UploadJobPhase
  multipart: MultipartState | null
  uploadedVideoPath?: string | null
  uploadedFileName?: string
  uploadedFileSize?: number
  uploadedThumbnailPath?: string | null
}

// Full in-memory record used by the runner (meta + file blobs).
export type PersistedUploadRecord = UploadMetaRecord & {
  videoFile: File | null
  thumbnailFile: File | null
}

const DB_NAME = 'wimuti-uploads'
const META_STORE = 'meta'
const FILES_STORE = 'files'
const DB_VERSION = 2

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Drop the old single-store schema if present.
      if (db.objectStoreNames.contains('jobs')) {
        db.deleteObjectStore('jobs')
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function toMeta(record: PersistedUploadRecord): UploadMetaRecord {
  return {
    id: record.id,
    mediaType: record.mediaType,
    kind: record.kind,
    createdAt: record.createdAt,
    label: record.label,
    videoFileName: record.videoFile?.name ?? record.videoFileName ?? null,
    videoFileType: record.videoFile?.type ?? record.videoFileType ?? null,
    videoFileSize: record.videoFile?.size ?? record.videoFileSize ?? null,
    title: record.title,
    presented_by: record.presented_by,
    description: record.description,
    category_id: record.category_id,
    category_name: record.category_name,
    access_level: record.access_level,
    videoId: record.videoId,
    isThumbnailRemoved: record.isThumbnailRemoved,
    existingThumbnailUrl: record.existingThumbnailUrl,
    author: record.author,
    year: record.year,
    bookId: record.bookId,
    existingFileUrl: record.existingFileUrl,
    existingFileName: record.existingFileName,
    existingFileSize: record.existingFileSize,
    phase: record.phase,
    multipart: record.multipart
      ? { ...record.multipart, completedParts: [...record.multipart.completedParts] }
      : null,
    uploadedVideoPath: record.uploadedVideoPath,
    uploadedFileName: record.uploadedFileName,
    uploadedFileSize: record.uploadedFileSize,
    uploadedThumbnailPath: record.uploadedThumbnailPath,
  }
}

// Serialize writes so concurrent part-completions don't race on the same record.
let writeChain: Promise<void> = Promise.resolve()

/** Write the file bytes exactly once (large; do not call repeatedly). */
export function saveUploadFiles(
  id: string,
  videoFile: File | null,
  thumbnailFile: File | null
): Promise<void> {
  if (!hasIndexedDb()) return Promise.resolve()
  writeChain = writeChain.then(
    () =>
      new Promise<void>((resolve, reject) => {
        openDb()
          .then((db) => {
            const tx = db.transaction(FILES_STORE, 'readwrite')
            tx.objectStore(FILES_STORE).put({ id, videoFile, thumbnailFile })
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              reject(tx.error)
            }
          })
          .catch(reject)
      })
  )
  return writeChain.catch(() => {})
}

/** Write lightweight progress/metadata (cheap; safe to call often). */
export function saveUploadMeta(record: PersistedUploadRecord): Promise<void> {
  if (!hasIndexedDb()) return Promise.resolve()
  const meta = toMeta(record)
  writeChain = writeChain.then(
    () =>
      new Promise<void>((resolve, reject) => {
        openDb()
          .then((db) => {
            const tx = db.transaction(META_STORE, 'readwrite')
            tx.objectStore(META_STORE).put(meta)
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              reject(tx.error)
            }
          })
          .catch(reject)
      })
  )
  return writeChain.catch(() => {})
}

export async function getAllUploadRecords(): Promise<PersistedUploadRecord[]> {
  if (!hasIndexedDb()) return []
  try {
    const db = await openDb()
    const result = await new Promise<{
      metas: UploadMetaRecord[]
      files: Map<string, { videoFile: File | null; thumbnailFile: File | null }>
    }>((resolve, reject) => {
      const tx = db.transaction([META_STORE, FILES_STORE], 'readonly')
      const metaReq = tx.objectStore(META_STORE).getAll()
      const filesReq = tx.objectStore(FILES_STORE).getAll()
      tx.oncomplete = () => {
        db.close()
        const files = new Map<string, { videoFile: File | null; thumbnailFile: File | null }>()
        for (const f of (filesReq.result as { id: string; videoFile: File | null; thumbnailFile: File | null }[]) || []) {
          files.set(f.id, { videoFile: f.videoFile, thumbnailFile: f.thumbnailFile })
        }
        resolve({ metas: (metaReq.result as UploadMetaRecord[]) || [], files })
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })

    const records: PersistedUploadRecord[] = []
    for (const meta of result.metas) {
      const mediaType = meta.mediaType ?? 'video'
      const blobs = result.files.get(meta.id)
      // If the file bytes never got persisted (e.g. refreshed in the first moment),
      // the job can't be resumed — drop it.
      if (!blobs || !blobs.videoFile) {
        void deleteUploadRecord(meta.id)
        continue
      }
      records.push({
        ...meta,
        mediaType,
        videoFile: blobs.videoFile,
        thumbnailFile: blobs.thumbnailFile,
      })
    }
    return records
  } catch {
    return []
  }
}

export function deleteUploadRecord(id: string): Promise<void> {
  if (!hasIndexedDb()) return Promise.resolve()
  writeChain = writeChain.then(
    () =>
      new Promise<void>((resolve, reject) => {
        openDb()
          .then((db) => {
            const tx = db.transaction([META_STORE, FILES_STORE], 'readwrite')
            tx.objectStore(META_STORE).delete(id)
            tx.objectStore(FILES_STORE).delete(id)
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              reject(tx.error)
            }
          })
          .catch(reject)
      })
  )
  return writeChain.catch(() => {})
}
