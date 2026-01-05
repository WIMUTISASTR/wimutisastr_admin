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
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 rounded-lg transition-colors
          ${preview ? 'border-gray-300 bg-slate-50' : 'border-dashed border-gray-300 bg-slate-50 hover:bg-slate-100'}
          ${dragActive ? 'border-blue-500 bg-blue-50' : ''}
          ${error ? 'border-red-300' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

        {preview ? (
          <div className="p-3">
            <div className="relative group w-full h-48 rounded-lg overflow-hidden bg-white border border-gray-200">
              <img src={preview} alt="Thumbnail preview" className="w-full h-full object-cover" />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="px-3 py-2 text-sm font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  disabled={isLoading}
                >
                  Change
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove()
                    }}
                    className="px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Tip: drag & drop a new image here to replace it. Max {maxSize}MB.
            </p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="space-y-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>

              <div className="text-sm">
                <span className="font-semibold text-slate-900 underline">Click to upload</span>
                <span className="text-gray-600"> or drag and drop</span>
              </div>

              <p className="text-xs text-gray-500">Supported: JPG, PNG, WEBP, GIF. Max {maxSize}MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  )
}

