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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  // (Category dropdown removed in favor of a simple <select> for consistency)

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
    <form onSubmit={handleSubmit} className="bg-slate-50">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Upload Book</h3>
          <p className="text-sm text-slate-600 mt-1">Fill in details and upload files.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">Details</h4>
            <p className="text-sm text-slate-600 mt-1">Book metadata.</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  Book Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter book title"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="author" className="block text-sm font-semibold text-slate-900 mb-2">
                    Author <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="author"
                    name="author"
                    type="text"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter author name"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-semibold text-slate-900 mb-2">
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g., 2024"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, category_id: e.target.value || null }))
                    setError('')
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={isLoading}
                  required
                >
                  <option value="">Select a category</option>
                  {categories && categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No categories available</option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="Optional description"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">Files</h4>
            <p className="text-sm text-slate-600 mt-1">Drag & drop or click to choose.</p>

            <div className="mt-5 space-y-5">
              {/* Cover image (no preview, just filename) */}
              <div
                onDragEnter={handleCoverDrag}
                onDragLeave={handleCoverDrag}
                onDragOver={handleCoverDrag}
                onDrop={handleCoverDrop}
                onClick={() => !isLoading && coverInputRef.current?.click()}
                className={`
                  rounded-xl border-2 border-dashed p-6 text-center transition-colors
                  ${coverDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-slate-50'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

                {!formData.cover ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900">Upload your Cover Image</div>
                    <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-base font-semibold text-slate-900">Upload a File</div>
                    <div className="text-sm text-slate-500">Drag and drop files here</div>
                    <div className="text-xs text-slate-400">Images only. Max 5MB.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 truncate">{formData.cover.name}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(formData.cover.size)}</div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="transform-none"
                        onClick={(e) => {
                          e.stopPropagation()
                          coverInputRef.current?.click()
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
                          setFormData(prev => ({ ...prev, cover: null }))
                          if (coverInputRef.current) coverInputRef.current.value = ''
                        }}
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Book file */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`
                  rounded-xl border-2 border-dashed p-6 text-center transition-colors
                  ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-slate-50'}
                  ${error ? 'border-red-300' : ''}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

                {!formData.file ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900">Upload your Book File</div>
                    <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                      </svg>
                    </div>
                    <div className="text-base font-semibold text-slate-900">Upload a File</div>
                    <div className="text-sm text-slate-500">Drag and drop files here</div>
                    <div className="text-xs text-slate-400">
                      Supported: PDF, DOC, DOCX, TXT, XLS, XLSX, EPUB, MOBI. Max {formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 truncate">{formData.file.name}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(formData.file.size)}</div>
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
                          setFormData(prev => ({ ...prev, file: null }))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="submit"
              type="submit"
              disabled={isLoading || !formData.title || !formData.author || !formData.year || !formData.file || !formData.category_id}
              isLoading={isLoading}
              >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

