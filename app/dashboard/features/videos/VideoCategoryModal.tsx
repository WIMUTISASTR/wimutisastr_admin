'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import ThumbnailUpload from '../../../components/forms/ThumbnailUpload'

interface VideoCategory {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

interface VideoCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  editingCategory: VideoCategory | null
  onSave: () => void
  isLoading: boolean
}

export default function VideoCategoryModal({
  isOpen,
  onClose,
  editingCategory,
  onSave,
  isLoading,
}: VideoCategoryModalProps) {
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (editingCategory) {
      setCategoryFormData({
        name: editingCategory.name,
        description: editingCategory.description || '',
      })
      setCoverPreview(editingCategory.cover_url)
      setCoverFile(null)
    } else {
      setCategoryFormData({ name: '', description: '' })
      setCoverPreview(null)
      setCoverFile(null)
    }
  }, [editingCategory, isOpen])

  if (!isOpen) return null

  const handleCoverUpload = (file: File) => {
    setCoverFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCoverRemove = () => {
    setCoverFile(null)
    setCoverPreview(editingCategory?.cover_url || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let coverUrl = editingCategory?.cover_url || null

      // Upload cover if a new file is provided
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverFileName = `category_cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${coverExt}`
        const coverPath = `video-category-covers/${coverFileName}`

        const coverFormData = new FormData()
        coverFormData.append('file', coverFile)
        coverFormData.append('bucket', 'video-category-covers')
        coverFormData.append('path', coverPath)

        const coverUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (coverUploadResponse.ok) {
          coverUrl = coverUploadResult.publicUrl || coverUploadResult.url
        } else {
          toast.warning('Failed to upload cover image, continuing without it')
        }
      }

      const url = editingCategory
        ? `/api/video-categories?id=${editingCategory.id}`
        : '/api/video-categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...categoryFormData,
          cover_url: coverUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save category')
      }

      toast.success(editingCategory ? 'Category updated successfully!' : 'Category created successfully!')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Category save error:', error)
      toast.error(error.message || 'Failed to save category')
    }
  }

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingCategory ? 'Edit Category' : 'New Category'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              placeholder="e.g., Tutorial, Documentary, Entertainment"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Description
            </label>
            <textarea
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              placeholder="Category description (optional)"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Category Cover Image
            </label>
            <ThumbnailUpload
              onUpload={handleCoverUpload}
              preview={coverPreview}
              maxSize={5}
              isLoading={isLoading}
              onRemove={handleCoverRemove}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
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
                  {editingCategory ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingCategory ? 'Update Category' : 'Create Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

