'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '../../../components/ui'
import { Category } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../../shared/constants'

interface BookData {
  title: string
  author: string
  year: string
  description: string
  file: File | null
  cover: File | null
  category_id: string | null
}

interface BookUploadFormProps {
  onUpload: (bookData: BookData) => Promise<void>
  isLoading?: boolean
  categories?: Category[]
}

export default function BookUploadForm({ onUpload, isLoading = false, categories = [] }: BookUploadFormProps) {
  const [formData, setFormData] = useState<BookData>({
    title: '',
    author: '',
    year: '',
    description: '',
    file: null,
    cover: null,
    category_id: null,
  })
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [coverDragActive, setCoverDragActive] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({ ...prev, category_id: categoryId }))
    setIsCategoryOpen(false)
    setError('')
  }

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

  const handleFile = (selectedFile: File) => {
    setError('')
    
    // Check file size
    if (selectedFile.size > FILE_SIZE_LIMITS.BOOK_FILE) {
      setError(`File size must be less than ${formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}`)
      return
    }

    // Check file type - allow both regular and edit document types
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    const allowedTypes = [...new Set([...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS, ...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS_EDIT])]
    if (!allowedTypes.includes(fileExt as any)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ').replace(/\./g, '').toUpperCase()}`)
      return
    }

    setFormData(prev => ({ ...prev, file: selectedFile }))
  }

  const handleCover = (selectedFile: File) => {
    setError('')
    
    // Check file size
    if (selectedFile.size > FILE_SIZE_LIMITS.COVER_IMAGE) {
      setError(`Cover image size must be less than ${formatFileSize(FILE_SIZE_LIMITS.COVER_IMAGE)}`)
      return
    }

    // Check file type (images only)
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_FILE_TYPES.IMAGES.includes(fileExt as any)) {
      setError(`Invalid image type. Allowed: ${ALLOWED_FILE_TYPES.IMAGES.join(', ').replace(/\./g, '').toUpperCase()}`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)

    setFormData(prev => ({ ...prev, cover: selectedFile }))
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
      if (e.target.id === 'cover') {
        handleCover(e.target.files[0])
      } else if (e.target.id === 'book-file' || !e.target.id) {
        // Handle book file upload (id is 'book-file' or no id for backward compatibility)
        handleFile(e.target.files[0])
      }
    }
  }

  const handleCoverDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setCoverDragActive(true)
    } else if (e.type === 'dragleave') {
      setCoverDragActive(false)
    }
  }

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCoverDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCover(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.title.trim()) {
      setError('Book title is required')
      return
    }
    if (!formData.author.trim()) {
      setError('Author is required')
      return
    }
    if (!formData.year.trim()) {
      setError('Year is required')
      return
    }
    if (!formData.file) {
      setError('Please select a file')
      return
    }
    if (!formData.category_id) {
      setError('Please select a category')
      return
    }

    try {
      await onUpload(formData)
      // Reset form after successful upload
      setFormData({
        title: '',
        author: '',
        year: '',
        description: '',
        file: null,
        cover: null,
        category_id: null,
      })
      setCoverPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
    }
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-black mb-2">
          Book Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border-2 rounded-lg transition-all bg-white border-gray-300 text-black placeholder-gray-400"
          placeholder="Enter book title"
          disabled={isLoading}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="author" className="block text-sm font-semibold text-black mb-2">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            id="author"
            name="author"
            type="text"
            value={formData.author}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 rounded-lg transition-all bg-white border-gray-300 text-black placeholder-gray-400"
            placeholder="Enter author name"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-semibold text-black mb-2">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            id="year"
            name="year"
            type="number"
            value={formData.year}
            onChange={handleInputChange}
            min="1000"
            max={new Date().getFullYear()}
            className="w-full px-4 py-3 border-2 rounded-lg transition-all bg-white border-gray-300 text-black placeholder-gray-400"
            placeholder="e.g., 2024"
            disabled={isLoading}
            required
          />
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
            transition-all bg-white border-gray-300 text-black
            flex items-center justify-between
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gold-400'}
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
                      w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors
                      ${formData.category_id === category.id ? 'bg-gray-100 font-semibold' : ''}
                    `}
                  >
                    {category.name}
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
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-black mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-4 py-3 border-2 rounded-lg transition-all bg-white border-gray-300 text-black placeholder-gray-400 resize-none"
          placeholder="Enter book description (optional)"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-black mb-2">
          Book Cover Image
        </label>
        <div
          onDragEnter={handleCoverDrag}
          onDragLeave={handleCoverDrag}
          onDragOver={handleCoverDrag}
          onDrop={handleCoverDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${coverDragActive ? 'border-slate-400 bg-slate-50' : 'border-gray-300 bg-gray-50'}
          `}
        >
          <input
            ref={coverInputRef}
            id="cover"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
          
          {coverPreview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={coverPreview}
                  alt="Book cover preview"
                  className="max-h-48 rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, cover: null }))
                    setCoverPreview(null)
                    if (coverInputRef.current) {
                      coverInputRef.current.value = ''
                    }
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">Click to change cover image</p>
            </div>
          ) : (
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="text-black hover:text-gray-700 font-medium underline"
                  disabled={isLoading}
                >
                  Click to upload cover
                </button>
                <span className="text-gray-600"> or drag and drop</span>
              </div>
              <p className="text-xs text-gray-500">
                Supported: JPG, PNG, WEBP, GIF (Max 5MB)
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-black mb-2">
          Book File <span className="text-red-500">*</span>
        </label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-slate-400 bg-slate-50' : 'border-gray-300 bg-gray-50'}
            ${error ? 'border-red-300' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            id="book-file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.epub,.mobi"
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
              Supported: PDF, DOC, DOCX, TXT, XLS, XLSX, EPUB, MOBI (Max 50MB)
            </p>
          </div>
        </div>

        {formData.file && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-black">{formData.file.name}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(formData.file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, file: null }))
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !formData.title || !formData.author || !formData.year || !formData.file || !formData.category_id}
        isLoading={isLoading}
        className="w-full py-3 px-4 shadow-lg hover:shadow-xl transition-shadow"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Book
          </span>
        )}
      </Button>
    </form>
  )
}

