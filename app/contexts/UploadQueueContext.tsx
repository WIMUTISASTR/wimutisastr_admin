'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '@/app/dashboard/shared/api'
import {
  MULTIPART_THRESHOLD,
  presignAndUploadFile,
} from '@/app/dashboard/shared/presignedUpload'
import { multipartUploadFile } from '@/app/dashboard/shared/multipartUpload'
import {
  deleteUploadRecord,
  getAllUploadRecords,
  saveUploadFiles,
  saveUploadMeta,
  type PersistedUploadRecord,
} from '@/app/dashboard/shared/uploadPersistence'

export type UploadJobStatus = 'uploading' | 'saving' | 'completed' | 'error'

export type UploadJob = {
  id: string
  mediaType: 'video' | 'document'
  fileName: string
  label: string
  progress: number
  step: string
  status: UploadJobStatus
  error?: string
  createdAt: number
  bytesPerSec?: number
}

export type VideoUploadPayload = {
  title: string
  presented_by: string
  description: string
  category_id: string
  category_name: string | null
  file: File
  thumbnail: File | null
  access_level: 'free' | 'members'
}

export type VideoUpdatePayload = {
  videoId: string
  title: string
  presented_by: string
  description: string
  category_id: string
  category_name: string | null
  access_level: 'free' | 'members'
  videoFile: File | null
  thumbnailFile: File | null
  isThumbnailRemoved: boolean
  existingThumbnailUrl: string | null
  existingFileUrl: string
  existingFileName: string
  existingFileSize: number
}

export type DocumentUploadPayload = {
  title: string
  author: string
  year: string
  description: string
  category_id: string
  category_name: string | null
  file: File
  access_level: 'free' | 'members'
}

export type DocumentUpdatePayload = {
  bookId: string
  title: string
  author: string
  year: string
  description: string
  category_id: string
  category_name: string | null
  access_level: 'free' | 'members'
  documentFile: File
  existingFileUrl: string
  existingFileName: string
  existingFileSize: number
}

type UploadQueueContextValue = {
  jobs: UploadJob[]
  activeCount: number
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  dismissJob: (id: string) => void
  clearCompleted: () => void
  enqueueVideoUpload: (payload: VideoUploadPayload) => string
  enqueueVideoUpdate: (payload: VideoUpdatePayload) => string
  enqueueDocumentUpload: (payload: DocumentUploadPayload) => string
  enqueueDocumentUpdate: (payload: DocumentUpdatePayload) => string
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null)

function createJobId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function uploadScaleFor(record: PersistedUploadRecord): number {
  if (record.mediaType === 'document') return 0.9
  return record.thumbnailFile ? 0.7 : 0.9
}

function initialProgressFor(record: PersistedUploadRecord): number {
  const scale = uploadScaleFor(record)
  if (record.phase === 'save') return 90
  if (record.phase === 'thumb') return scale * 100
  const total = record.multipart?.partCount ?? 1
  const done = record.multipart?.completedParts.length ?? 0
  return total > 0 ? (done / total) * scale * 100 : 0
}

function jobFromRecord(record: PersistedUploadRecord): UploadJob {
  const mediaType = record.mediaType ?? 'video'
  return {
    id: record.id,
    mediaType,
    fileName: record.videoFile?.name ?? record.uploadedFileName ?? record.existingFileName ?? '',
    label: record.label,
    progress: initialProgressFor(record),
    step: 'កំពុងបន្តការផ្ទុក...',
    status: record.phase === 'save' ? 'saving' : 'uploading',
    createdAt: record.createdAt,
  }
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const resumedRef = useRef(false)

  const patchJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [])

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
    void deleteUploadRecord(id)
  }, [])

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed'))
  }, [])

  const togglePanel = useCallback(() => {
    setPanelOpen((o) => !o)
  }, [])

  /**
   * Drives a job from its current phase to completion. Safe to call on a fresh job or on a
   * job restored from persistence (it skips finished phases / multipart parts).
   */
  const runVideoJob = useCallback(
    async (record: PersistedUploadRecord) => {
      const jobId = record.id
      const scale = uploadScaleFor(record)

      try {
        // --- Phase: video upload ---
        if (record.phase === 'video' && record.videoFile) {
          patchJob(jobId, { status: 'uploading', step: 'កំពុងផ្ទុកវីដេអូ...' })

          let result
          if (record.videoFile.size >= MULTIPART_THRESHOLD) {
            result = await multipartUploadFile(record.videoFile, {
              bucket: 'videos',
              pathHint: `videos/${record.videoFile.name}`,
              category_id: record.category_id,
              category_name: record.category_name,
              resumeState: record.multipart,
              onCreated: (state) => {
                record.multipart = state
                void saveUploadMeta(record)
              },
              onPartCompleted: () => {
                void saveUploadMeta(record)
              },
              onProgress: (p, info) =>
                patchJob(jobId, { progress: p * scale, bytesPerSec: info?.bytesPerSec }),
            })
          } else {
            result = await presignAndUploadFile(record.videoFile, {
              bucket: 'videos',
              pathHint: `videos/${record.videoFile.name}`,
              category_id: record.category_id,
              category_name: record.category_name,
              onProgress: (p, info) =>
                patchJob(jobId, { progress: p * scale, bytesPerSec: info?.bytesPerSec }),
            })
          }

          record.uploadedVideoPath = result.path
          record.uploadedFileName = record.videoFile.name
          record.uploadedFileSize = record.videoFile.size
          record.phase = 'thumb'
          void saveUploadMeta(record)
        }

        // --- Phase: thumbnail upload ---
        if (record.phase === 'thumb') {
          if (record.thumbnailFile) {
            patchJob(jobId, { step: 'កំពុងផ្ទុករូបតំណាង...', progress: scale * 100, bytesPerSec: undefined })

            const thumbnailFormData = new FormData()
            thumbnailFormData.append('file', record.thumbnailFile)
            thumbnailFormData.append('bucket', 'video-thumbnails')
            thumbnailFormData.append('path', `video-thumbnails/${record.thumbnailFile.name}`)

            const thumbnailUploadResponse = await apiFetch('/api/storage/upload', {
              method: 'POST',
              body: thumbnailFormData,
            })
            const thumbnailUploadResult = await thumbnailUploadResponse.json()
            if (!thumbnailUploadResponse.ok) {
              if (record.kind === 'update') {
                notify.warning('បរាជ័យក្នុងការផ្ទុករូបតំណាង បន្តដោយគ្មានវា')
              } else {
                throw new Error(thumbnailUploadResult.error || 'មិនអាចផ្ទុករូបតំណាងបានទេ')
              }
            } else {
              record.uploadedThumbnailPath =
                thumbnailUploadResult.data?.path || thumbnailUploadResult.data?.url || null
            }
          }
          record.phase = 'save'
          void saveUploadMeta(record)
        }

        // --- Phase: save metadata ---
        patchJob(jobId, {
          status: 'saving',
          step: 'កំពុងរក្សាទុកព័ត៌មាន...',
          progress: 90,
          bytesPerSec: undefined,
        })

        if (record.kind === 'create') {
          const response = await apiFetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: record.title.trim(),
              presented_by: record.presented_by.trim() || null,
              description: record.description.trim() || null,
              file_name: record.uploadedFileName,
              file_url: record.uploadedVideoPath,
              file_size: record.uploadedFileSize,
              thumbnail_url: record.uploadedThumbnailPath ?? null,
              category_id: record.category_id,
              access_level: record.access_level,
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Failed to save video metadata')
        } else {
          const thumbnailUrl =
            record.uploadedThumbnailPath !== undefined && record.uploadedThumbnailPath !== null
              ? record.uploadedThumbnailPath
              : record.isThumbnailRemoved
                ? null
                : record.existingThumbnailUrl ?? null

          const response = await apiFetch(`/api/videos?id=${record.videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: record.title.trim(),
              presented_by: record.presented_by.trim() || null,
              description: record.description.trim() || null,
              category_id: record.category_id,
              access_level: record.access_level,
              thumbnail_url: thumbnailUrl,
              ...(record.uploadedVideoPath && {
                file_url: record.uploadedVideoPath,
                file_name: record.uploadedFileName,
                file_size: record.uploadedFileSize,
              }),
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Failed to update video')
        }

        await deleteUploadRecord(jobId)
        patchJob(jobId, { status: 'completed', step: 'រួចរាល់', progress: 100 })
        notify.success(
          record.kind === 'create'
            ? `វីដេអូ "${record.title.trim()}" ផ្ទុកជោគជ័យ`
            : `វីដេអូ "${record.title.trim()}" ធ្វើបច្ចុប្បន្នភាពជោគជ័យ`
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'មិនអាចផ្ទុកវីដេអូបានទេ'
        await deleteUploadRecord(jobId)
        patchJob(jobId, { status: 'error', step: 'បរាជ័យ', error: message })
        notify.error(`${record.videoFile?.name ?? record.title}: ${message}`)
      }
    },
    [patchJob]
  )

  const runDocumentJob = useCallback(
    async (record: PersistedUploadRecord) => {
      const jobId = record.id
      const scale = uploadScaleFor(record)

      try {
        if (record.phase === 'file' && record.videoFile) {
          patchJob(jobId, { status: 'uploading', step: 'កំពុងផ្ទុកឯកសារ...' })

          let result
          if (record.videoFile.size >= MULTIPART_THRESHOLD) {
            result = await multipartUploadFile(record.videoFile, {
              bucket: 'documents',
              pathHint: `documents/${record.videoFile.name}`,
              category_id: record.category_id,
              category_name: record.category_name,
              resumeState: record.multipart,
              onCreated: (state) => {
                record.multipart = state
                void saveUploadMeta(record)
              },
              onPartCompleted: () => {
                void saveUploadMeta(record)
              },
              onProgress: (p, info) =>
                patchJob(jobId, { progress: p * scale, bytesPerSec: info?.bytesPerSec }),
            })
          } else {
            result = await presignAndUploadFile(record.videoFile, {
              bucket: 'documents',
              pathHint: `documents/${record.videoFile.name}`,
              category_id: record.category_id,
              category_name: record.category_name,
              onProgress: (p, info) =>
                patchJob(jobId, { progress: p * scale, bytesPerSec: info?.bytesPerSec }),
            })
          }

          record.uploadedVideoPath = result.publicUrl || result.url || result.path
          record.uploadedFileName = record.videoFile.name
          record.uploadedFileSize = record.videoFile.size
          record.phase = 'save'
          void saveUploadMeta(record)
        }

        patchJob(jobId, {
          status: 'saving',
          step: 'កំពុងរក្សាទុកព័ត៌មានឯកសារ...',
          progress: 90,
          bytesPerSec: undefined,
        })

        if (record.kind === 'create') {
          const response = await apiFetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: record.title.trim(),
              author: record.author?.trim() || '',
              year: record.year?.trim() || '',
              description: record.description.trim() || null,
              file_name: record.uploadedFileName,
              file_url: record.uploadedVideoPath,
              file_size: record.uploadedFileSize,
              cover_url: null,
              category_id: record.category_id,
              access_level: record.access_level,
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Failed to save document metadata')
        } else {
          const response = await apiFetch(`/api/books?id=${record.bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: record.title.trim(),
              author: record.author?.trim() || '',
              year: record.year?.trim() || '',
              description: record.description.trim() || null,
              cover_url: null,
              file_url: record.uploadedVideoPath,
              file_name: record.uploadedFileName,
              file_size: record.uploadedFileSize,
              category_id: record.category_id,
              access_level: record.access_level,
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Failed to update document')
        }

        await deleteUploadRecord(jobId)
        patchJob(jobId, { status: 'completed', step: 'រួចរាល់', progress: 100 })
        notify.success(
          record.kind === 'create'
            ? `ឯកសារ "${record.title.trim()}" ផ្ទុកជោគជ័យ`
            : `ឯកសារ "${record.title.trim()}" ធ្វើបច្ចុប្បន្នភាពជោគជ័យ`
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'មិនអាចផ្ទុកឯកសារបានទេ'
        await deleteUploadRecord(jobId)
        patchJob(jobId, { status: 'error', step: 'បរាជ័យ', error: message })
        notify.error(`${record.videoFile?.name ?? record.title}: ${message}`)
      }
    },
    [patchJob]
  )

  const runJob = useCallback(
    async (record: PersistedUploadRecord) => {
      const mediaType = record.mediaType ?? 'video'
      if (mediaType === 'document') {
        await runDocumentJob(record)
      } else {
        await runVideoJob(record)
      }
    },
    [runDocumentJob, runVideoJob]
  )

  const enqueueVideoUpload = useCallback(
    (payload: VideoUploadPayload) => {
      const jobId = createJobId()
      const label = payload.title.trim() || payload.file.name

      const record: PersistedUploadRecord = {
        id: jobId,
        mediaType: 'video',
        kind: 'create',
        createdAt: Date.now(),
        label,
        videoFile: payload.file,
        thumbnailFile: payload.thumbnail,
        videoFileName: payload.file.name,
        videoFileType: payload.file.type,
        videoFileSize: payload.file.size,
        title: payload.title,
        presented_by: payload.presented_by,
        description: payload.description,
        category_id: payload.category_id,
        category_name: payload.category_name,
        access_level: payload.access_level,
        phase: 'video',
        multipart: null,
      }

      setJobs((prev) => [
        {
          id: jobId,
          mediaType: 'video',
          fileName: payload.file.name,
          label,
          progress: 0,
          step: 'កំពុងរៀបចំ...',
          status: 'uploading',
          createdAt: record.createdAt,
        },
        ...prev,
      ])

      // Persist file bytes once (in the background) and start uploading immediately —
      // do NOT block the upload on writing the (large) blob to IndexedDB.
      void saveUploadFiles(jobId, payload.file, payload.thumbnail)
      void saveUploadMeta(record)
      void runJob(record)
      return jobId
    },
    [runJob]
  )

  const enqueueVideoUpdate = useCallback(
    (payload: VideoUpdatePayload) => {
      const jobId = createJobId()
      const label = payload.title.trim() || payload.videoFile?.name || 'កែប្រែវីដេអូ'
      const fileName = payload.videoFile?.name ?? payload.existingFileName

      const record: PersistedUploadRecord = {
        id: jobId,
        mediaType: 'video',
        kind: 'update',
        createdAt: Date.now(),
        label,
        videoFile: payload.videoFile,
        thumbnailFile: payload.thumbnailFile,
        videoFileName: payload.videoFile?.name ?? null,
        videoFileType: payload.videoFile?.type ?? null,
        videoFileSize: payload.videoFile?.size ?? null,
        title: payload.title,
        presented_by: payload.presented_by,
        description: payload.description,
        category_id: payload.category_id,
        category_name: payload.category_name,
        access_level: payload.access_level,
        videoId: payload.videoId,
        isThumbnailRemoved: payload.isThumbnailRemoved,
        existingThumbnailUrl: payload.existingThumbnailUrl,
        existingFileUrl: payload.existingFileUrl,
        existingFileName: payload.existingFileName,
        existingFileSize: payload.existingFileSize,
        phase: 'video',
        multipart: null,
      }

      setJobs((prev) => [
        {
          id: jobId,
          mediaType: 'video',
          fileName,
          label,
          progress: 0,
          step: 'កំពុងរៀបចំ...',
          status: 'uploading',
          createdAt: record.createdAt,
        },
        ...prev,
      ])

      void saveUploadFiles(jobId, payload.videoFile, payload.thumbnailFile)
      void saveUploadMeta(record)
      void runJob(record)
      return jobId
    },
    [runJob]
  )

  const enqueueDocumentUpload = useCallback(
    (payload: DocumentUploadPayload) => {
      const jobId = createJobId()
      const label = payload.title.trim() || payload.file.name

      const record: PersistedUploadRecord = {
        id: jobId,
        mediaType: 'document',
        kind: 'create',
        createdAt: Date.now(),
        label,
        videoFile: payload.file,
        thumbnailFile: null,
        videoFileName: payload.file.name,
        videoFileType: payload.file.type,
        videoFileSize: payload.file.size,
        title: payload.title,
        presented_by: '',
        author: payload.author,
        year: payload.year,
        description: payload.description,
        category_id: payload.category_id,
        category_name: payload.category_name,
        access_level: payload.access_level,
        phase: 'file',
        multipart: null,
      }

      setJobs((prev) => [
        {
          id: jobId,
          mediaType: 'document',
          fileName: payload.file.name,
          label,
          progress: 0,
          step: 'កំពុងរៀបចំ...',
          status: 'uploading',
          createdAt: record.createdAt,
        },
        ...prev,
      ])

      void saveUploadFiles(jobId, payload.file, null)
      void saveUploadMeta(record)
      void runJob(record)
      return jobId
    },
    [runJob]
  )

  const enqueueDocumentUpdate = useCallback(
    (payload: DocumentUpdatePayload) => {
      const jobId = createJobId()
      const label = payload.title.trim() || payload.documentFile.name

      const record: PersistedUploadRecord = {
        id: jobId,
        mediaType: 'document',
        kind: 'update',
        createdAt: Date.now(),
        label,
        videoFile: payload.documentFile,
        thumbnailFile: null,
        videoFileName: payload.documentFile.name,
        videoFileType: payload.documentFile.type,
        videoFileSize: payload.documentFile.size,
        title: payload.title,
        presented_by: '',
        author: payload.author,
        year: payload.year,
        description: payload.description,
        category_id: payload.category_id,
        category_name: payload.category_name,
        access_level: payload.access_level,
        bookId: payload.bookId,
        existingFileUrl: payload.existingFileUrl,
        existingFileName: payload.existingFileName,
        existingFileSize: payload.existingFileSize,
        phase: 'file',
        multipart: null,
      }

      setJobs((prev) => [
        {
          id: jobId,
          mediaType: 'document',
          fileName: payload.documentFile.name,
          label,
          progress: 0,
          step: 'កំពុងរៀបចំ...',
          status: 'uploading',
          createdAt: record.createdAt,
        },
        ...prev,
      ])

      void saveUploadFiles(jobId, payload.documentFile, null)
      void saveUploadMeta(record)
      void runJob(record)
      return jobId
    },
    [runJob]
  )

  // Resume any uploads that were in-flight when the page was last closed/refreshed.
  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true

    let cancelled = false
    void (async () => {
      const records = await getAllUploadRecords()
      if (cancelled || records.length === 0) return

      const ordered = records.sort((a, b) => a.createdAt - b.createdAt)
      setJobs((prev) => {
        const existing = new Set(prev.map((j) => j.id))
        const restored = ordered.filter((r) => !existing.has(r.id)).map(jobFromRecord)
        return [...restored, ...prev]
      })

      for (const record of ordered) {
        void runJob(record)
      }

      if (ordered.length > 0) {
        setPanelOpen(true)
        notify.info(`កំពុងបន្តការផ្ទុក ${ordered.length} ដែលមិនទាន់រួចរាល់`)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [runJob])

  const activeCount = useMemo(
    () => jobs.filter((j) => j.status === 'uploading' || j.status === 'saving').length,
    [jobs]
  )

  const value = useMemo(
    () => ({
      jobs,
      activeCount,
      panelOpen,
      setPanelOpen,
      togglePanel,
      dismissJob,
      clearCompleted,
      enqueueVideoUpload,
      enqueueVideoUpdate,
      enqueueDocumentUpload,
      enqueueDocumentUpdate,
    }),
    [
      jobs,
      activeCount,
      panelOpen,
      dismissJob,
      clearCompleted,
      enqueueVideoUpload,
      enqueueVideoUpdate,
      enqueueDocumentUpload,
      enqueueDocumentUpdate,
      togglePanel,
    ]
  )

  return <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider')
  }
  return ctx
}
