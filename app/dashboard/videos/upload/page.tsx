'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import VideoUploadForm from '../_components/VideoUploadForm'
import { UploadProgressModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { apiFetch } from '../../shared/api'
import { presignAndUploadFile } from '../../shared/presignedUpload'
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

      const categoryName =
        categories.find((c) => c.id === videoData.category_id)?.name ?? null

      setUploadStep('កំពុងផ្ទុកវីដេអូ...')
      const videoUploadResult = await presignAndUploadFile(videoData.file, {
        bucket: 'videos',
        pathHint: `videos/${videoData.file.name}`,
        category_id: videoData.category_id,
        category_name: categoryName,
        onProgress: (progress) => {
          const totalProgress = videoData.thumbnail ? progress * 0.7 : progress * 0.9
          setUploadProgress(totalProgress)
        },
      })
      const filePath = videoUploadResult.path

      // Upload thumbnail if provided (server-side optimization)
      let thumbnailPath: string | null = null
      if (videoData.thumbnail) {
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        const thumbnailPathHint = `video-thumbnails/${videoData.thumbnail.name}`
        const thumbnailFormData = new FormData()
        thumbnailFormData.append('file', videoData.thumbnail)
        thumbnailFormData.append('bucket', 'video-thumbnails')
        thumbnailFormData.append('path', thumbnailPathHint)

        setUploadStep('កំពុងផ្ទុករូបថតតូច...')
        setUploadProgress(70)

        const thumbnailUploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: thumbnailFormData,
        })

        const thumbnailUploadResult = await thumbnailUploadResponse.json()
        if (!thumbnailUploadResponse.ok) {
          throw new Error(thumbnailUploadResult.error || 'មិនអាចផ្ទុករូបថតតូចបានទេ')
        }
        thumbnailPath = thumbnailUploadResult.data?.path || thumbnailUploadResult.data?.url || null
      }

      // Save video metadata
      setUploadStep('កំពុងរក្សាទុកព័ត៌មានវីដេអូ...')
      setUploadProgress(90)
      
      const videoMetadata = {
        title: videoData.title.trim(),
        presented_by: videoData.presented_by.trim() || null,
        description: videoData.description.trim() || null,
        file_name: videoData.file.name,
        file_url: filePath,
        file_size: videoData.file.size,
        thumbnail_url: thumbnailPath,
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
      setUploadStep('រួចរាល់!')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsProgressModalOpen(false)
      toast.success('វីដេអូត្រូវបានផ្ទុកដោយជោគជ័យ!')
      
      router.push('/dashboard/videos/list')
    } catch (error: unknown) {
      console.error('Upload error:', error)
      setIsProgressModalOpen(false)
      const message = error instanceof Error ? error.message : 'មិនអាចផ្ទុកវីដេអូបានទេ'
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
        title="ផ្ទុកវីដេអូ"
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
        title="កំពុងផ្ទុកវីដេអូ"
      />
    </>
  )
}
