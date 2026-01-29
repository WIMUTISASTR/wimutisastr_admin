import { useState, useRef, useCallback } from 'react'

interface UseFileUploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  onError?: (error: string) => void
}

interface UseFileUploadReturn {
  file: File | null
  preview: string | null
  dragActive: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFile: (file: File) => void
  handleDrag: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
}

/**
 * Custom hook to manage file upload with drag-and-drop support
 */
export function useFileUpload({
  maxSize,
  allowedTypes,
  onError,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((selectedFile: File): boolean => {
    // Check file size
    if (maxSize && selectedFile.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(0)
      onError?.(`File size must be less than ${sizeMB}MB`)
      return false
    }

    // Check file type
    if (allowedTypes) {
      const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
      if (!allowedTypes.includes(fileExt)) {
        const types = allowedTypes.join(', ').replace(/\./g, '').toUpperCase()
        onError?.(`Invalid file type. Allowed: ${types}`)
        return false
      }
    }

    return true
  }, [maxSize, allowedTypes, onError])

  const handleFile = useCallback((selectedFile: File) => {
    if (!validateFile(selectedFile)) return

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }, [validateFile])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }, [handleFile])

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return {
    file,
    preview,
    dragActive,
    fileInputRef,
    handleFile,
    handleDrag,
    handleDrop,
    handleChange,
    clearFile,
  }
}

