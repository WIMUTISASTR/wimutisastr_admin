'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import FileUpload from '../../../components/FileUpload'
import ThumbnailUpload from '../../../components/ThumbnailUpload'
import { VideoCategory } from '../../shared/types'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../../shared/constants'
import { formatFileSize } from '../../shared/utils'

interface VideoUploadFormProps {
  categories: VideoCategory[]
  isLoading: boolean
  onUpload: (videoData: {
    title: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
  }) => Promise<void>
}

export default function VideoUploadForm({ categories, isLoading, onUpload }: VideoUploadFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    file: null as File | null,
    thumbnail: null as File | null,
  })
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const MAX_TITLE_LENGTH = 200
  const MAX_DESCRIPTION_LENGTH = 1000

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false)
      }
    }

    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCategoryOpen])

  const validateForm = (): boolean => {
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
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      // Show first error
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast.error(firstError)
      }
      return
    }

    try {
      await onUpload({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        file: formData.file!,
        thumbnail: formData.thumbnail,
      })

      // Reset form only on success
      setFormData({
        title: '',
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

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category_id: categoryId })
    setIsCategoryOpen(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-black mb-2">
          Video Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value })
            if (errors.title) setErrors({ ...errors, title: '' })
          }}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all bg-white text-black placeholder-gray-400 ${
            errors.title ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-600'
          }`}
          placeholder="Enter video title"
          disabled={isLoading}
          maxLength={MAX_TITLE_LENGTH}
          required
        />
        <div className="flex justify-between items-center mt-1">
          {errors.title && (
            <span className="text-sm text-red-600">{errors.title}</span>
          )}
          <span className={`text-xs ml-auto ${formData.title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
            {formData.title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
      </div>

      <div className="relative" ref={categoryDropdownRef}>
        <label className="block text-sm font-semibold text-black mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => !isLoading && setIsCategoryOpen(!isCategoryOpen)}
          disabled={isLoading}
          className={`
            w-full px-4 py-3 border-2 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-indigo-600 
            transition-all bg-white text-black
            flex items-center justify-between
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
            ${errors.category_id ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-600'}
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
                  No categories available. Create categories first.
                </div>
              )}
            </div>
          </>
        )}
        {errors.category_id && (
          <span className="text-sm text-red-600 mt-1 block">{errors.category_id}</span>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-black mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value })
            if (errors.description) setErrors({ ...errors, description: '' })
          }}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all bg-white text-black placeholder-gray-400 ${
            errors.description ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-600'
          }`}
          placeholder="Enter video description (optional)"
          rows={4}
          disabled={isLoading}
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.description && (
            <span className="text-sm text-red-600">{errors.description}</span>
          )}
          <span className={`text-xs ml-auto ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
            {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-black mb-2">
          Video File <span className="text-red-500">*</span>
        </label>
        <FileUpload
          accept="video/*"
          maxSize={FILE_SIZE_LIMITS.VIDEO_FILE / (1024 * 1024)}
          onUpload={async () => {}}
          onFileSelect={(file) => {
            setFormData({ ...formData, file })
            if (errors.file) setErrors({ ...errors, file: '' })
          }}
          hideUploadButton={true}
          label="Upload Video"
          description={`Supported formats: ${ALLOWED_FILE_TYPES.VIDEOS.join(', ').replace(/\./g, '').toUpperCase()} (Max ${formatFileSize(FILE_SIZE_LIMITS.VIDEO_FILE)})`}
          isLoading={isLoading}
        />
        {formData.file && (
          <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-800">{formData.file.name}</p>
                  <p className="text-xs text-slate-600">{formatFileSize(formData.file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, file: null })
                  if (errors.file) setErrors({ ...errors, file: '' })
                }}
                className="text-red-600 hover:text-red-700"
                disabled={isLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {errors.file && (
          <span className="text-sm text-red-600 mt-1 block">{errors.file}</span>
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

      <button
        type="submit"
        disabled={isLoading || !formData.title.trim() || !formData.category_id || !formData.file}
        className="w-full py-3 px-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : (
          'Upload Video'
        )}
      </button>
    </form>
  )
}

