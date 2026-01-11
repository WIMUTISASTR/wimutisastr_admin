'use client'

import { useMemo, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import ThumbnailUpload from '../../../components/forms/ThumbnailUpload'
import Modal from '../../../components/feedback/Modal'
import { useZodForm } from '@/app/lib/useZodForm'
import { createCategorySchema, updateCategorySchema } from '@/app/lib/validations'

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
  const schema = useMemo(() => (editingCategory ? updateCategorySchema : createCategorySchema), [editingCategory])
  const form = useZodForm(schema, { name: '', description: '' } as any)
  const { reset } = form
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (editingCategory) {
      reset({ name: editingCategory.name, description: editingCategory.description || '' } as any)
      setCoverPreview(editingCategory.cover_url)
      setCoverFile(null)
    } else {
      reset({ name: '', description: '' } as any)
      setCoverPreview(null)
      setCoverFile(null)
    }
  }, [editingCategory, isOpen, reset])

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

      const payload = {
        name: (form.values as any).name,
        description: ((form.values as any).description || '').trim() ? (form.values as any).description : null,
        cover_url: coverUrl,
      }

      const validation = form.validate(payload)
      if (!validation.success) {
        toast.error('Please fix the highlighted fields.')
        return
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
        body: JSON.stringify(payload),
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? 'Edit Video Category' : 'Create Video Category'}
      variant="center"
      isDismissable={!isLoading}
      className="p-6"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={(form.values as any).name}
              onChange={(e) => form.setValue('name' as any, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              placeholder="e.g., Tutorial, Documentary, Entertainment"
              required
            />
            {form.errors.name && (
              <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Description
            </label>
            <textarea
              value={(form.values as any).description}
              onChange={(e) => form.setValue('description' as any, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
              placeholder="Category description (optional)"
              rows={3}
            />
            {form.errors.description && (
              <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.description}</p>
            )}
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
            {form.errors.cover_url && (
              <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.cover_url}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg transition-all  disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/30"
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
                editingCategory ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
    </Modal>
  )
}

