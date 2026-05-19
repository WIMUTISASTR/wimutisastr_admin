'use client'

import { useState, useRef } from 'react'
import { Button } from '../ui'

interface FileUploadProps {
  accept?: string
  maxSize?: number // in MB
  disableSizeLimit?: boolean
  onUpload: (file: File) => Promise<void>
  label?: string
  description?: string
  isLoading?: boolean
  hideUploadButton?: boolean // Hide the upload button (for use in forms with their own submit)
  onFileSelect?: (file: File) => void // Called when file is selected (if hideUploadButton is true)
  onFileClear?: () => void // Called when selected file is cleared
}

export default function FileUpload({
  accept,
  maxSize = 10,
  disableSizeLimit = false,
  onUpload,
  label = 'Upload File',
  description,
  isLoading = false,
  hideUploadButton = false,
  onFileSelect,
  onFileClear,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (selectedFile: File) => {
    setError('')
    
    // Check file size
    if (!disableSizeLimit && selectedFile.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    setFile(selectedFile)
    
    // If hideUploadButton is true, call onFileSelect callback instead
    if (hideUploadButton && onFileSelect) {
      onFileSelect(selectedFile)
    }
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
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      await onUpload(file)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(message)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-white hover:border-navy-300 hover:bg-slate-50'}
            ${error ? 'border-red-300' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
          
          {!file ? (
            <div className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                </svg>
              </div>
              <div className="text-base font-semibold text-slate-900">Upload a File</div>
              <div className="text-sm text-slate-500">Drag and drop files here</div>
              {!disableSizeLimit && <div className="text-xs text-slate-400">Max {maxSize}MB</div>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900 truncate">{file.name}</div>
              <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="transform-none"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  disabled={isLoading}
                >
                  Change
                </Button>
                <Button
                type="button"
                  variant="ghost"
                  size="sm"
                  className="transform-none text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                  setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    if (onFileClear) onFileClear()
                }}
                disabled={isLoading}
              >
                  Remove
                </Button>
              </div>
            </div>
          )}
          </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      {file && !hideUploadButton && (
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          className="w-full"
        >
          Upload File
        </Button>
      )}
    </div>
  )
}

