'use client'

import { useMemo, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import ThumbnailUpload from '../../../components/forms/ThumbnailUpload'
import Modal from '../../../components/feedback/Modal'
import { useZodForm } from '@/app/lib/useZodForm'
import { createCategorySchema, updateCategorySchema } from '@/app/lib/validations'
import { apiFetch } from '../../shared/api'
import Button from '@/app/components/ui/Button'

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
  const form = useZodForm(schema, { name: '', description: '' })
  const { reset } = form
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (editingCategory) {
      reset({ name: editingCategory.name, description: editingCategory.description || '' })
      setCoverPreview(editingCategory.cover_url)
      setCoverFile(null)
    } else {
      reset({ name: '', description: '' })
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
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        const coverPath = `video-category-covers/${coverFile.name}`

        const coverFormData = new FormData()
        coverFormData.append('file', coverFile)
        coverFormData.append('bucket', 'video-category-covers')
        coverFormData.append('path', coverPath)

        const coverUploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (coverUploadResponse.ok) {
          coverUrl = coverUploadResult.data?.publicUrl || coverUploadResult.data?.url
        } else {
          toast.warning('Failed to upload cover image, continuing without it')
        }
      }

      const payload = {
        name: form.values.name,
        description: (form.values.description || '').trim() ? form.values.description : null,
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

      const response = await apiFetch(url, {
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
    } catch (error: unknown) {
      console.error('Category save error:', error)
      const message = error instanceof Error ? error.message : 'Failed to save category'
      toast.error(message)
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
              value={form.values.name}
              onChange={(e) => form.setValue('name', e.target.value)}
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
              value={form.values.description ?? ''}
              onChange={(e) => form.setValue('description', e.target.value)}
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
          <div className="flex gap-3 justify-center">
            <Button
              type="submit"
              disabled={isLoading}
              variant="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
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
                editingCategory ? 'Submit' : 'Create'
              )}
            </Button>
          </div>
        </form>
    </Modal>
  )
}

