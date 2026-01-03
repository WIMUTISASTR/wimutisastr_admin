'use client'

import { useState, useRef } from 'react'

interface ThumbnailUploadProps {
  onUpload: (file: File) => void
  preview?: string | null
  maxSize?: number // in MB
  isLoading?: boolean
  onRemove?: () => void
}

export default function ThumbnailUpload({
  onUpload,
  preview,
  maxSize = 5,
  isLoading = false,
  onRemove,
}: ThumbnailUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = (file: File) => {
    setError('')
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid image type. Allowed: JPG, JPEG, PNG, WEBP, GIF')
      return
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Image size must be less than ${maxSize}MB`)
      return
    }

    onUpload(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onRemove) {
      onRemove()
    }
  }

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative group">
          <div className="w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden bg-slate-50">
            <img
              src={preview}
              alt="Thumbnail preview"
              className="w-full h-full object-cover"
            />
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30'}
            ${error ? 'border-red-300' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
          
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium underline"
                disabled={isLoading}
              >
                Click to upload
              </button>
              <span className="text-gray-600"> or drag and drop</span>
            </div>
            
            <p className="text-xs text-gray-500">
              Supported: JPG, PNG, WEBP, GIF. Max {maxSize}MB
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  )
}

