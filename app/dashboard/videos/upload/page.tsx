'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import VideoUploadForm from '../_components/VideoUploadForm'
import { UploadProgressModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { useVideoCategories } from '../../shared/hooks/useVideos'

export default function VideosUploadPage() {
  const router = useRouter()
  const { categories } = useVideoCategories()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Helper function to upload file with progress tracking
  const uploadFileWithProgress = (
    file: File,
    formData: FormData,
    url: string,
    onProgress: (progress: number) => void
  ): Promise<any> => {
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
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch (error) {
            reject(new Error('Failed to parse response'))
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.error || 'Upload failed'))
          } catch {
            reject(new Error('Upload failed'))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open('POST', url)
      xhr.send(formData)
    })
  }

  const handleVideoUpload = async (videoData: {
    title: string
    presented_by: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
  }) => {
    try {
      setIsUploading(true)
      setIsProgressModalOpen(true)
      setUploadProgress(0)
      setUploadingFileName(videoData.file.name)

      // Upload video file with progress
      const fileExt = videoData.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `videos/${fileName}`

      const videoFormDataToSend = new FormData()
      videoFormDataToSend.append('file', videoData.file)
      videoFormDataToSend.append('bucket', 'videos')
      videoFormDataToSend.append('path', filePath)

      setUploadStep('Uploading video file...')
      const videoUploadResult = await uploadFileWithProgress(
        videoData.file,
        videoFormDataToSend,
        '/api/storage/upload',
        (progress) => {
          const totalProgress = videoData.thumbnail 
            ? (progress * 0.7) 
            : (progress * 0.9)
          setUploadProgress(totalProgress)
        }
      )

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = null
      if (videoData.thumbnail) {
        const thumbnailExt = videoData.thumbnail.name.split('.').pop()
        const thumbnailFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${thumbnailExt}`
        const thumbnailPath = `video-thumbnails/${thumbnailFileName}`

        const thumbnailFormData = new FormData()
        thumbnailFormData.append('file', videoData.thumbnail)
        thumbnailFormData.append('bucket', 'video-thumbnails')
        thumbnailFormData.append('path', thumbnailPath)

        setUploadStep('Uploading thumbnail...')
        setUploadProgress(70)
        const thumbnailUploadResult = await uploadFileWithProgress(
          videoData.thumbnail,
          thumbnailFormData,
          '/api/storage/upload',
          (progress) => {
            const totalProgress = 70 + (progress * 0.2)
            setUploadProgress(totalProgress)
          }
        )

        if (thumbnailUploadResult) {
          thumbnailUrl = thumbnailUploadResult.publicUrl || thumbnailUploadResult.url
        }
      }

      // Save video metadata
      setUploadStep('Saving video information...')
      setUploadProgress(90)
      
      const videoMetadata = {
        title: videoData.title.trim(),
        presented_by: videoData.presented_by.trim() || null,
        description: videoData.description.trim() || null,
        file_name: videoData.file.name,
        file_url: videoUploadResult.publicUrl || videoUploadResult.url,
        file_size: videoData.file.size,
        thumbnail_url: thumbnailUrl,
        category_id: videoData.category_id,
      }

      const response = await fetch('/api/videos', {
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
    } catch (error: any) {
      console.error('Upload error:', error)
      setIsProgressModalOpen(false)
      toast.error(error.message || 'Failed to upload video')
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
        description="Add a new video to your library"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Videos', href: '/dashboard/videos' },
          { label: 'Upload' },
        ]}
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
      />
    </>
  )
}
