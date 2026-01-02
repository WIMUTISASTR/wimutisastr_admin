'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

interface Category {
  id: string
  name: string
}

interface Book {
  id: string
  title: string
  author: string
  year: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  cover_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

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

      let coverUrl = book.cover_url

      // Upload new cover if provided
      if (coverFile) {
        // Get category name for folder organization
        const categoryId = formData.category_id || book?.category_id
        const category = categories.find(cat => cat.id === categoryId) || book?.category
        const categoryName = category?.name || 'uncategorized'

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

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Edit Book</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
            />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Leave empty to keep current cover.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

