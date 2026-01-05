'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import ThumbnailUpload from '../../../components/forms/ThumbnailUpload'
import Modal from '../../../components/feedback/Modal'
import { Button } from '../../../components/ui'

interface VideoCategory {
  id: string
  name: string
  cover_url: string | null
}

interface Video {
  id: string
  title: string
  presented_by?: string | null
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
    presented_by: '',
    description: '',
    category_id: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isThumbnailRemoved, setIsThumbnailRemoved] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [videoDragActive, setVideoDragActive] = useState(false)

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title,
        presented_by: video.presented_by || '',
        description: video.description || '',
        category_id: video.category_id || null,
      })
      setThumbnailPreview(video.thumbnail_url)
      setThumbnailFile(null)
      setIsThumbnailRemoved(false)
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

  if (!video) return null

  const handleThumbnailUpload = (file: File) => {
    setThumbnailFile(file)
    setIsThumbnailRemoved(false)
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleThumbnailRemove = () => {
    setThumbnailFile(null)
    setIsThumbnailRemoved(true)
    setThumbnailPreview(null)
  }

  const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  const VIDEO_MAX_BYTES = 500 * 1024 * 1024

  const validateAndSetVideoFile = (file: File) => {
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error('File size must be less than 500MB')
      return
    }
    setVideoFile(file)
  }

  const handleVideoDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setVideoDragActive(true)
    } else if (e.type === 'dragleave') {
      setVideoDragActive(false)
    }
  }

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVideoDragActive(false)
    if (isLoading) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetVideoFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.category_id) {
      toast.error('Please fill in all required fields including category')
      return
    }

    try {
      setIsLoading(true)

      let thumbnailUrl = isThumbnailRemoved ? null : video.thumbnail_url
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
          presented_by: formData.presented_by.trim() || null,
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
        presented_by: formData.presented_by.trim() || null,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Video"
      variant="fullscreen"
      isDismissable={!isLoading}
    >
      <div className="bg-slate-50">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
          {/* Top summary */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl md:text-2xl font-bold text-slate-900">{video.title}</h3>
                    {video.presented_by && <p className="truncate text-slate-600">Presented by {video.presented_by}</p>}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800 border border-slate-200">
                    {video.file_name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800 border border-slate-200">
                    {formatMb(video.file_size)}
                  </span>
                  {video.category?.name && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 border border-blue-100">
                      {video.category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Video preview */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            <div className="bg-black rounded-xl overflow-hidden">
              <video
                src={videoPreviewUrl || video.file_url}
                controls
                className="w-full h-auto max-h-[520px]"
                preload="metadata"
                key={videoPreviewUrl || video.file_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            {videoFile && (
              <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800 font-medium">
                  Previewing newly selected file: <span className="font-semibold">{videoFile.name}</span>
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900">Details</h4>
                <p className="text-sm text-slate-600 mt-1">Update the video information.</p>

                <div className="mt-5 grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Presented by
                    </label>
                    <input
                      type="text"
                      value={formData.presented_by}
                      onChange={(e) => setFormData({ ...formData, presented_by: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="e.g., John Doe"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select a category</option>
                      {categories && categories.length > 0 ? (
                        categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No categories available</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                      rows={5}
                      disabled={isLoading}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              </div>

              {/* Files */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900">Files</h4>
                <p className="text-sm text-slate-600 mt-1">Replace the video or thumbnail (optional).</p>

                <div className="mt-5 space-y-5">
                  {/* Video file */}
                  <div
                    className={`
                      rounded-xl border p-4 transition-colors
                      ${videoDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}
                      ${isLoading ? 'opacity-50' : 'cursor-pointer'}
                    `}
                    onDragEnter={handleVideoDrag}
                    onDragLeave={handleVideoDrag}
                    onDragOver={handleVideoDrag}
                    onDrop={handleVideoDrop}
                    onClick={() => !isLoading && videoFileInputRef.current?.click()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Video file</p>
                        <p className="mt-1 text-sm text-slate-700 truncate">{video.file_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatMb(video.file_size)}</p>
                        {videoFile && (
                          <p className="text-xs text-blue-700 mt-2">
                            New file: <span className="font-semibold">{videoFile.name}</span> ({formatMb(videoFile.size)})
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <input
                          ref={videoFileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              validateAndSetVideoFile(file)
                            }
                          }}
                          className="hidden"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="transform-none"
                          onClick={() => videoFileInputRef.current?.click()}
                          disabled={isLoading}
                        >
                          Change file
                        </Button>
                        {videoFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="transform-none"
                            onClick={() => {
                              setVideoFile(null)
                              if (videoFileInputRef.current) {
                                videoFileInputRef.current.value = ''
                              }
                            }}
                            disabled={isLoading}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Drag & drop a file here, or click to choose. Max 500MB.</p>
                  </div>

                  {/* Thumbnail */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900 mb-3">Thumbnail image</p>
                    <ThumbnailUpload
                      onUpload={handleThumbnailUpload}
                      preview={thumbnailPreview}
                      maxSize={5}
                      isLoading={isLoading}
                      onRemove={handleThumbnailRemove}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 -mx-4 md:-mx-6 mt-6 border-t border-slate-200 bg-white/90 backdrop-blur px-4 md:px-6 py-4">
              <div className="mx-auto w-full max-w-5xl flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button type="button" onClick={onClose} variant="secondary" disabled={isLoading} className="transform-none">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading} className="transform-none">
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}

