'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { FileUpload, ThumbnailUpload } from '../../../components/forms'
import { VideoCategory } from '../../shared/types'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../../shared/constants'
import { formatFileSize } from '../../shared/utils'
import { Button } from '../../../components/ui'

interface VideoUploadFormProps {
  categories: VideoCategory[]
  isLoading: boolean
  onUpload: (videoData: {
    title: string
    presented_by: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
  }) => Promise<void>
}

export default function VideoUploadForm({ categories, isLoading, onUpload }: VideoUploadFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    presented_by: '',
    description: '',
    category_id: '',
    file: null as File | null,
    thumbnail: null as File | null,
  })
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const MAX_TITLE_LENGTH = 200
  const MAX_PRESENTED_BY_LENGTH = 100
  const MAX_DESCRIPTION_LENGTH = 1000

  // (Category dropdown removed in favor of a simple <select> for consistency)

  const validateForm = (): { ok: true } | { ok: false; errors: { [key: string]: string } } => {
    const newErrors: { [key: string]: string } = {}

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Video title is required'
    } else if (formData.title.trim().length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`
    }

    // Validate category
    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category'
    }

    // Validate presented by (optional)
    if (formData.presented_by.trim().length > MAX_PRESENTED_BY_LENGTH) {
      newErrors.presented_by = `Presented by must be less than ${MAX_PRESENTED_BY_LENGTH} characters`
    }

    // Validate file
    if (!formData.file) {
      newErrors.file = 'Please select a video file'
    } else {
      // Validate file type
      const fileExt = '.' + formData.file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_FILE_TYPES.VIDEOS.includes(fileExt as any)) {
        newErrors.file = `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.VIDEOS.join(', ').replace(/\./g, '').toUpperCase()}`
      }
      // Validate file size
      if (formData.file.size > FILE_SIZE_LIMITS.VIDEO_FILE) {
        newErrors.file = `File size must be less than ${formatFileSize(FILE_SIZE_LIMITS.VIDEO_FILE)}`
      }
    }

    // Validate description length
    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) return { ok: true }
    return { ok: false, errors: newErrors }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateForm()
    if (!validation.ok) {
      const firstError = Object.values(validation.errors)[0]
      if (firstError) toast.error(firstError)
      return
    }

    try {
      await onUpload({
        title: formData.title.trim(),
        presented_by: formData.presented_by.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        file: formData.file!,
        thumbnail: formData.thumbnail,
      })

      // Reset form only on success
      setFormData({
        title: '',
        presented_by: '',
        description: '',
        category_id: '',
        file: null,
        thumbnail: null,
      })
      setThumbnailPreview(null)
      setErrors({})
    } catch (error) {
      // Error is handled by parent component
      // Don't reset form on error so user can fix issues
    }
  }

  const handleThumbnailUpload = (file: File) => {
    setFormData({ ...formData, thumbnail: file })
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleThumbnailRemove = () => {
    setFormData({ ...formData, thumbnail: null })
    setThumbnailPreview(null)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-6">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm" ref={categoryDropdownRef}>
            <h4 className="text-lg font-bold text-slate-900">Details</h4>
            <p className="text-sm text-slate-600 mt-1">Video information.</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Video Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    if (errors.title) setErrors({ ...errors, title: '' })
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    errors.title ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Enter video title"
                  disabled={isLoading}
                  maxLength={MAX_TITLE_LENGTH}
                  required
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.title && <span className="text-sm text-red-600">{errors.title}</span>}
                  <span className={`text-xs ml-auto ${formData.title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-orange-600' : 'text-slate-500'}`}>
                    {formData.title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Presented by
                </label>
                <input
                  type="text"
                  value={formData.presented_by}
                  onChange={(e) => {
                    setFormData({ ...formData, presented_by: e.target.value })
                    if (errors.presented_by) setErrors({ ...errors, presented_by: '' })
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    errors.presented_by ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="e.g., John Doe"
                  disabled={isLoading}
                  maxLength={MAX_PRESENTED_BY_LENGTH}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.presented_by && <span className="text-sm text-red-600">{errors.presented_by}</span>}
                  <span className={`text-xs ml-auto ${formData.presented_by.length > MAX_PRESENTED_BY_LENGTH * 0.9 ? 'text-orange-600' : 'text-slate-500'}`}>
                    {formData.presented_by.length}/{MAX_PRESENTED_BY_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    setFormData({ ...formData, category_id: e.target.value })
                    if (errors.category_id) setErrors({ ...errors, category_id: '' })
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    errors.category_id ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isLoading}
                  required
                >
                  <option value="">Select a category</option>
                  {categories && categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No categories available</option>
                  )}
                </select>
                {errors.category_id && <span className="text-sm text-red-600 mt-1 block">{errors.category_id}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (errors.description) setErrors({ ...errors, description: '' })
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none ${
                    errors.description ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Optional description"
                  rows={5}
                  disabled={isLoading}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description && <span className="text-sm text-red-600">{errors.description}</span>}
                  <span className={`text-xs ml-auto ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-orange-600' : 'text-slate-500'}`}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">Files</h4>
            <p className="text-sm text-slate-600 mt-1">Drag & drop or click to choose.</p>

            <div className="mt-5 space-y-5">
              <div>
                <FileUpload
                  accept="video/*"
                  maxSize={FILE_SIZE_LIMITS.VIDEO_FILE / (1024 * 1024)}
                  onUpload={async () => {}}
                  onFileSelect={(file) => {
                    setFormData({ ...formData, file })
                    if (errors.file) setErrors({ ...errors, file: '' })
                  }}
                  onFileClear={() => {
                    setFormData({ ...formData, file: null })
                    if (errors.file) setErrors({ ...errors, file: '' })
                  }}
                  hideUploadButton={true}
                  label="Upload your Video"
                  description={`Supported formats: ${ALLOWED_FILE_TYPES.VIDEOS.join(', ').replace(/\./g, '').toUpperCase()} (Max ${formatFileSize(FILE_SIZE_LIMITS.VIDEO_FILE)})`}
                  isLoading={isLoading}
                />
                {errors.file && <span className="text-sm text-red-600 mt-1 block">{errors.file}</span>}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Thumbnail Image (optional)</p>
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="submit"
              type="submit"
              disabled={isLoading || !formData.title.trim() || !formData.category_id || !formData.file}
              isLoading={isLoading}
            >
              Submit
            </Button>
          </div>
        </div>
    </form>
  )
}

