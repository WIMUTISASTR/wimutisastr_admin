'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import VideoUploadForm from '../_components/VideoUploadForm'
import { UploadProgressModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { apiFetch } from '../../shared/api'
import { useVideoCategories } from '../../shared/hooks/useVideos'

export default function VideosUploadPage() {
  const router = useRouter()
  const { categories, fetchCategories } = useVideoCategories()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  type PresignResponse = {
    uploadUrl: string
    publicUrl?: string
    url?: string
  }

  const uploadFileWithProgress = async (
    body: Blob,
    url: string,
    options: { method?: string; headers?: Record<string, string> },
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open(options.method || 'PUT', url)
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })
      }
      xhr.send(body)
    })
  }

  const requestPresignedUpload = async (payload: {
    bucket: 'videos' | 'video-thumbnails'
    fileName: string
    contentType: string
    path?: string
  }): Promise<PresignResponse> => {
    const response = await apiFetch('/api/storage/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Failed to prepare upload')
    }
    return result.data as PresignResponse
  }

  const handleVideoUpload = async (videoData: {
    title: string
    presented_by: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
    access_level: 'free' | 'members'
  }) => {
    try {
      setIsUploading(true)
      setIsProgressModalOpen(true)
      setUploadProgress(0)
      setUploadingFileName(videoData.file.name)

      // Upload video file with progress (direct-to-R2)
      // `path` is treated as a server-side hint only; the server generates a safe unique key.
      const filePath = `videos/${videoData.file.name}`
      const videoPresign = await requestPresignedUpload({
        bucket: 'videos',
        fileName: videoData.file.name,
        contentType: videoData.file.type || 'application/octet-stream',
        path: filePath,
      })
      setUploadStep('Uploading video file...')
      await uploadFileWithProgress(
        videoData.file,
        videoPresign.uploadUrl,
        {
          method: 'PUT',
          headers: {
            'Content-Type': videoData.file.type || 'application/octet-stream',
          },
        },
        (progress) => {
          const totalProgress = videoData.thumbnail
            ? (progress * 0.7)
            : (progress * 0.9)
          setUploadProgress(totalProgress)
        }
      )

      // Upload thumbnail if provided (server-side optimization)
      let thumbnailUrl: string | null = null
      if (videoData.thumbnail) {
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        const thumbnailPath = `video-thumbnails/${videoData.thumbnail.name}`
        const thumbnailFormData = new FormData()
        thumbnailFormData.append('file', videoData.thumbnail)
        thumbnailFormData.append('bucket', 'video-thumbnails')
        thumbnailFormData.append('path', thumbnailPath)

        setUploadStep('Uploading thumbnail...')
        setUploadProgress(70)

        const thumbnailUploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: thumbnailFormData,
        })

        const thumbnailUploadResult = await thumbnailUploadResponse.json()
        if (!thumbnailUploadResponse.ok) {
          throw new Error(thumbnailUploadResult.error || 'Failed to upload thumbnail')
        }
        thumbnailUrl = thumbnailUploadResult.data?.publicUrl || thumbnailUploadResult.data?.url || null
      }

      // Save video metadata
      setUploadStep('Saving video information...')
      setUploadProgress(90)
      
      const videoMetadata = {
        title: videoData.title.trim(),
        presented_by: videoData.presented_by.trim() || null,
        description: videoData.description.trim() || null,
        file_name: videoData.file.name,
        file_url: videoPresign.publicUrl || videoPresign.url || '',
        file_size: videoData.file.size,
        thumbnail_url: thumbnailUrl,
        category_id: videoData.category_id,
        access_level: videoData.access_level,
      }

      const response = await apiFetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoMetadata),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save video metadata')
      }

      setUploadProgress(100)
      setUploadStep('Complete!')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsProgressModalOpen(false)
      toast.success('Video uploaded successfully!')
      
      router.push('/dashboard/videos/list')
    } catch (error: unknown) {
      console.error('Upload error:', error)
      setIsProgressModalOpen(false)
      const message = error instanceof Error ? error.message : 'Failed to upload video'
      toast.error(message)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadStep('')
      setUploadingFileName('')
    }
  }

  return (
    <>
      <PageHeader
        title="Upload Video"
        showBackButton
        backHref="/dashboard/videos"
      />

      <div className="mt-6">
        <VideoUploadForm
          categories={categories}
          isLoading={isUploading}
          onUpload={handleVideoUpload}
        />
      </div>

      <UploadProgressModal
        isOpen={isProgressModalOpen}
        progress={uploadProgress}
        currentStep={uploadStep}
        fileName={uploadingFileName}
        title="Uploading Video"
      />
    </>
  )
}
