'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import ThumbnailUpload from '../../../components/ThumbnailUpload'

interface VideoCategory {
  id: string
  name: string
  cover_url: string | null
}

interface Video {
  id: string
  title: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  thumbnail_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

interface VideoEditModalProps {
  video: Video | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedVideo: Video) => void
  categories: VideoCategory[]
}

export default function VideoEditModal({ video, isOpen, onClose, onUpdate, categories }: VideoEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const videoFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title,
        description: video.description || '',
        category_id: video.category_id || null,
      })
      setThumbnailPreview(video.thumbnail_url)
      setThumbnailFile(null)
      setVideoFile(null)
    }
  }, [video])

  // Create and cleanup video preview URL
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setVideoPreviewUrl(null)
    }
  }, [videoFile])

  if (!isOpen || !video) return null

  const handleThumbnailUpload = (file: File) => {
    setThumbnailFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleThumbnailRemove = () => {
    setThumbnailFile(null)
    setThumbnailPreview(video.thumbnail_url || null)
  }

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category_id: categoryId })
    setIsCategoryOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.category_id) {
      toast.error('Please fill in all required fields including category')
      return
    }

    try {
      setIsLoading(true)

      let thumbnailUrl = video.thumbnail_url
      let fileUrl = video.file_url
      let fileName = video.file_name
      let fileSize = video.file_size

      // Upload new video file if provided
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop()
        const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `videos/${newFileName}`

        const fileFormData = new FormData()
        fileFormData.append('file', videoFile)
        fileFormData.append('bucket', 'videos')
        fileFormData.append('path', filePath)

        const fileUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        })

        const fileUploadResult = await fileUploadResponse.json()

        if (fileUploadResponse.ok) {
          fileUrl = fileUploadResult.publicUrl || fileUploadResult.url
          fileName = videoFile.name
          fileSize = videoFile.size
        } else {
          throw new Error(fileUploadResult.error || 'Failed to upload new video file')
        }
      }

      // Upload new thumbnail if provided
      if (thumbnailFile) {
        const thumbnailExt = thumbnailFile.name.split('.').pop()
        const thumbnailFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${thumbnailExt}`
        const thumbnailPath = `video-thumbnails/${thumbnailFileName}`

        const thumbnailFormData = new FormData()
        thumbnailFormData.append('file', thumbnailFile)
        thumbnailFormData.append('bucket', 'video-thumbnails')
        thumbnailFormData.append('path', thumbnailPath)

        const thumbnailUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: thumbnailFormData,
        })

        const thumbnailUploadResult = await thumbnailUploadResponse.json()
        if (thumbnailUploadResponse.ok) {
          thumbnailUrl = thumbnailUploadResult.publicUrl || thumbnailUploadResult.url
        } else {
          toast.warning('Failed to upload thumbnail, continuing without it')
        }
      }

      // Update video metadata
      const response = await fetch(`/api/videos?id=${video.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category_id: formData.category_id,
          thumbnail_url: thumbnailUrl,
          ...(videoFile && {
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize,
          }),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update video')
      }

      toast.success('Video updated successfully!')
      
      // Update local state
      const updatedVideo: Video = {
        ...video,
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        category_id: formData.category_id,
        thumbnail_url: thumbnailUrl,
        ...(videoFile && {
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        }),
        category: categories.find(cat => cat.id === formData.category_id) || null,
      }
      
      onUpdate(updatedVideo)
      onClose()
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update video')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl p-2"
            >
              ×
            </button>
          </div>

          {/* Video Player Section */}
          <div className="mb-8 bg-black rounded-lg overflow-hidden shadow-xl">
            <video
              src={videoPreviewUrl || video.file_url}
              controls
              className="w-full h-auto max-h-[600px]"
              preload="metadata"
              key={videoPreviewUrl || video.file_url}
            >
              Your browser does not support the video tag.
            </video>
            {videoFile && (
              <div className="bg-blue-50 border-t border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Preview:</strong> New video file selected. The video above shows a preview of the new file.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Video Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-black mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => !isLoading && setIsCategoryOpen(!isCategoryOpen)}
              disabled={isLoading}
              className={`
                w-full px-4 py-2 border-2 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 
                transition-all bg-white border-gray-300 text-black
                flex items-center justify-between
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
                ${!formData.category_id ? 'text-gray-500' : 'text-black'}
              `}
            >
              <span>
                {formData.category_id 
                  ? categories.find(c => c.id === formData.category_id)?.name || 'Select a category'
                  : 'Select a category'
                }
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCategoryOpen && !isLoading && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsCategoryOpen(false)}
                />
                <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id)}
                        className={`
                          w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center gap-3
                          ${formData.category_id === category.id ? 'bg-indigo-50 font-semibold' : ''}
                        `}
                      >
                        <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-indigo-200 bg-slate-50">
                          {category.cover_url ? (
                            <img
                              src={category.cover_url}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="flex-1 text-left">{category.name}</span>
                        {formData.category_id === category.id && (
                          <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      No categories available
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Video File <span className="text-gray-500 text-xs font-normal">(Optional - Leave empty to keep current video)</span>
            </label>
            {!videoFile && video && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Current file:</strong> {video.file_name} ({(video.file_size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 500 * 1024 * 1024) {
                      toast.error('File size must be less than 500MB')
                      return
                    }
                    setVideoFile(file)
                  }
                }}
                className="hidden"
                disabled={isLoading}
              />
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                disabled={isLoading}
                className="text-indigo-600 hover:text-indigo-700 font-medium underline disabled:opacity-50"
              >
                Click to select a new video file
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: MP4, AVI, MOV, WMV, FLV (Max 500MB)
              </p>
            </div>
            {videoFile && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      New file selected: {videoFile.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null)
                      if (videoFileInputRef.current) {
                        videoFileInputRef.current.value = ''
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Thumbnail Image
            </label>
            <ThumbnailUpload
              onUpload={handleThumbnailUpload}
              preview={thumbnailPreview}
              maxSize={5}
              isLoading={isLoading}
              onRemove={handleThumbnailRemove}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Video'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

