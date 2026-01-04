'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Book, Category } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface BookEditModalProps {
  book: Book | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedBook: Book) => void
  categories?: Category[]
}

export default function BookEditModal({ book, isOpen, onClose, onUpdate, categories = [] }: BookEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    year: '',
    description: '',
    category_id: null as string | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        author: book.author,
        year: book.year,
        description: book.description || '',
        category_id: book.category_id || null,
      })
      setCoverPreview(book.cover_url)
      setCoverFile(null)
      setBookFile(null)
    }
  }, [book])

  if (!isOpen || !book) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.author || !formData.year || !formData.category_id) {
      toast.error('Please fill in all required fields including category')
      return
    }

    try {
      setIsLoading(true)

      // Get category name for folder organization
      const categoryId = formData.category_id || book?.category_id
      const category = categories.find(cat => cat.id === categoryId) || book?.category
      const categoryName = category?.name || 'uncategorized'

      let coverUrl = book.cover_url
      let fileUrl = book.file_url
      let fileName = book.file_name
      let fileSize = book.file_size

      // Upload new book file if provided
      if (bookFile) {
        const fileExt = bookFile.name.split('.').pop()
        const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `documents/${newFileName}`

        const fileFormData = new FormData()
        fileFormData.append('file', bookFile)
        fileFormData.append('bucket', 'documents')
        fileFormData.append('path', filePath)
        if (categoryId) {
          fileFormData.append('category_id', categoryId)
          fileFormData.append('category_name', categoryName)
        }

        const fileUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        })

        const fileUploadResult = await fileUploadResponse.json()

        if (fileUploadResponse.ok) {
          fileUrl = fileUploadResult.publicUrl
          fileName = bookFile.name
          fileSize = bookFile.size
        } else {
          throw new Error(fileUploadResult.error || 'Failed to upload new book file')
        }
      }

      // Upload new cover if provided
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverFileName = `cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${coverExt}`
        const coverPath = `covers/${coverFileName}`

        const coverFormData = new FormData()
        coverFormData.append('file', coverFile)
        coverFormData.append('bucket', 'documents')
        coverFormData.append('path', coverPath)
        if (categoryId) {
          coverFormData.append('category_id', categoryId)
          coverFormData.append('category_name', categoryName)
        }

        const coverUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (coverUploadResponse.ok) {
          coverUrl = coverUploadResult.publicUrl
        } else {
          toast.warning('Failed to upload new cover image, keeping existing one')
        }
      }

      // Update book via API
      const response = await fetch('/api/books', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: book.id,
          title: formData.title,
          author: formData.author,
          year: parseInt(formData.year),
          description: formData.description || null,
          cover_url: coverUrl,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          category_id: formData.category_id || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update book')
      }

      if (result.data) {
        const updatedBook: Book = {
          ...book,
          title: result.data.title,
          author: result.data.author,
          year: result.data.year.toString(),
          description: result.data.description || '',
          cover_url: result.data.cover_url || null,
          file_url: result.data.file_url,
          file_name: result.data.file_name,
          file_size: result.data.file_size,
        }
        onUpdate(updatedBook)
        toast.success('Book updated successfully!')
        onClose()
      }
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update book')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Cover image must be less than 5MB')
        return
      }
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Book file must be less than 500MB')
        return
      }
      setBookFile(file)
    }
  }


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-stretch justify-center">
        <div className="w-full bg-white shadow-2xl">
          <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Edit Book</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="p-6">
          {/* Book Preview Section */}
          <div className="mb-6 bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              {book.cover_url && (
                <div className="shrink-0 mx-auto md:mx-0">
                  <div className="w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md">
                    <img
                      src={book.cover_url}
                      alt={`${book.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">{book.title}</h3>
                <p className="text-base md:text-lg text-slate-600 mb-3">by {book.author}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-gray-200">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-800">{book.year}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-gray-200">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-800">{formatFileSize(book.file_size)}</span>
                  </div>
                </div>
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-br from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-colors font-semibold shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Book
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Author <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              min="1000"
              max="9999"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              required
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
            <label className="block text-sm font-semibold text-black mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Book File (optional)
            </label>
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Current file:</p>
                <p className="font-semibold text-slate-800 text-sm">{book.file_name}</p>
                <p className="text-xs text-slate-500 mt-1">{formatFileSize(book.file_size)}</p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.epub,.mobi,.txt"
                onChange={handleBookFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                disabled={isLoading}
              />
              {bookFile && (
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800 font-semibold">New file selected:</p>
                  <p className="text-xs text-blue-600">{bookFile.name} ({formatFileSize(bookFile.size)})</p>
                </div>
              )}
              <p className="text-xs text-gray-500">Supported: PDF, DOC, DOCX, EPUB, MOBI, TXT. Max 500MB. Leave empty to keep current file.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Cover Image (optional)
            </label>
            <div className="flex gap-4">
              {coverPreview && (
                <div className="w-32 h-40 border border-gray-300 rounded overflow-hidden">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Leave empty to keep current cover.</p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 -mx-6 px-6 pb-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-linear-to-br from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/30"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : 'Update Book'}
              </button>
            </div>
          </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}

