'use client'

import { useState, useRef } from 'react'
import { Button } from '../ui'

interface FileUploadProps {
  accept?: string
  maxSize?: number // in MB
  onUpload: (file: File) => Promise<void>
  label?: string
  description?: string
  isLoading?: boolean
  hideUploadButton?: boolean // Hide the upload button (for use in forms with their own submit)
  onFileSelect?: (file: File) => void // Called when file is selected (if hideUploadButton is true)
}

export default function FileUpload({
  accept,
  maxSize = 10,
  onUpload,
  label = 'Upload File',
  description,
  isLoading = false,
  hideUploadButton = false,
  onFileSelect,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (selectedFile: File) => {
    setError('')
    
    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
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
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
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
        <label className="block text-sm font-semibold text-black mb-2">
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
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-gold-500 bg-gold-50' : 'border-gray-300 bg-gray-50'}
            ${error ? 'border-red-300' : ''}
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
          
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-black hover:text-gray-700 font-medium underline"
                disabled={isLoading}
              >
                Click to upload
              </button>
              <span className="text-gray-600"> or drag and drop</span>
            </div>
            
            <p className="text-xs text-gray-500">
              Maximum file size: {maxSize}MB
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-black">{file.name}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
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

