'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import VideoList from './VideoList'
import VideoUploadForm from './VideoUploadForm'
import VideoCategoryManagement from './VideoCategoryManagement'
import VideoEditModal from './VideoEditModal'
import { UploadProgressModal } from '../../../components/feedback'
import { TabNavigation } from '../../../components/navigation'
import { PageHeader } from '../../../components/layout'
import { useVideos, useVideoCategories } from '../../shared/hooks/useVideos'
import { Video, VideoCategory } from '../../shared/types'

export default function VideosContent() {
  const { videos, isLoading, pagination, fetchVideos, setVideos } = useVideos()
  const { categories, fetchCategories } = useVideoCategories()
  const [activeView, setActiveView] = useState<'upload' | 'list' | 'categories'>('upload')
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchCategories()
    if (activeView === 'list') {
      fetchVideos(1, 20)
    }
  }, [activeView])

  const handlePageChange = (page: number) => {
    fetchVideos(page, pagination.limit)
  }

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
          // Video upload is 70% of total (assuming thumbnail might be uploaded)
          const totalProgress = videoData.thumbnail 
            ? (progress * 0.7) 
            : (progress * 0.9) // If no thumbnail, video is 90% of total
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
            // Thumbnail upload is 20% of total (70% + 20% = 90%)
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
      
      // Small delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsProgressModalOpen(false)
      toast.success('Video uploaded successfully!')
      
      // Refresh video list if on list view
      if (activeView === 'list') {
        fetchVideos()
      }
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

  const handleEdit = (video: Video) => {
    setEditingVideo(video)
    setIsEditModalOpen(true)
  }

  const handleUpdate = (updatedVideo: Video) => {
    setVideos(videos.map(v => v.id === updatedVideo.id ? updatedVideo : v))
    setEditingVideo(null)
    setIsEditModalOpen(false)
  }

  const handleDelete = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete video')
      }

      toast.success('Video deleted successfully!')
      setVideos(videos.filter(v => v.id !== videoId))
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete video')
      throw error
    }
  }

  const tabs = [
    {
      id: 'upload',
      label: 'Upload Video',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      id: 'categories',
      label: 'Categories',
      badge: categories.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'list',
      label: 'All Videos',
      badge: videos.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Video Management"
        description="Upload, organize, and manage your video content"
        breadcrumbs={[
          { label: 'Dashboard' },
          { label: 'Videos' },
        ]}
      />

      <TabNavigation
        tabs={tabs}
        activeTab={activeView}
        onTabChange={(tab) => setActiveView(tab as 'upload' | 'list' | 'categories')}
      />

      {/* Content Area */}
      {activeView === 'list' ? (
        <VideoList
          videos={videos}
          categories={categories}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      ) : (
        <div className="rounded-xl p-6">
          {activeView === 'upload' && (
            <div>
              <VideoUploadForm
                categories={categories}
                isLoading={isUploading}
                onUpload={handleVideoUpload}
              />
            </div>
          )}

          {activeView === 'categories' && (
            <VideoCategoryManagement
              categories={categories}
              isLoading={isLoading}
              onRefresh={fetchCategories}
            />
          )}
        </div>
      )}

      {/* Video Edit Modal */}
      <VideoEditModal
        video={editingVideo}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingVideo(null)
        }}
        onUpdate={handleUpdate}
        categories={categories}
      />

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isProgressModalOpen}
        progress={uploadProgress}
        currentStep={uploadStep}
        fileName={uploadingFileName}
      />
    </>
  )
}
