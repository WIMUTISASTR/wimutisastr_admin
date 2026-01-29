'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { PageHeader } from '../../../../../components/layout'
import { Card, Button } from '../../../../../components/ui'
import { ThumbnailUpload } from '../../../../../components/forms'
import { apiFetch } from '../../../../shared/api'
import { Category } from '../../../../shared/types'

export default function EditCategoryPage() {
  const router = useRouter()
  const params = useParams()
  const categoryId = params.id as string

  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [categoryCoverFile, setCategoryCoverFile] = useState<File | null>(null)
  const [categoryCoverPreview, setCategoryCoverPreview] = useState<string | null>(null)

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setIsLoading(true)
        const response = await apiFetch(`/api/categories?id=${categoryId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch category')
        }

        const categoryData = result.data
        setCategory(categoryData)
        setCategoryFormData({
          name: categoryData.name,
          description: categoryData.description || '',
        })
        setCategoryCoverPreview(categoryData.cover_url)
      } catch (error: any) {
        console.error('Fetch error:', error)
        toast.error(error.message || 'Failed to load category')
        router.push('/dashboard/documents/categories')
      } finally {
        setIsLoading(false)
      }
    }

    if (categoryId) {
      fetchCategory()
    }
  }, [categoryId, router])

  const uploadCategoryImage = async (file: File): Promise<string> => {
    // `path` is treated as a server-side hint only; the server generates a safe unique key.
    const filePath = `category-covers/${file.name}`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'covers')
    formData.append('path', filePath)

    const response = await apiFetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload category image')
    }

    return result.data?.publicUrl || result.data?.url
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setIsSaving(true)

    try {
      let categoryCoverUrl = category?.cover_url || null

      // Upload category image if a new file is provided
      if (categoryCoverFile) {
        categoryCoverUrl = await uploadCategoryImage(categoryCoverFile)
      }

      // Update category
      const response = await apiFetch(`/api/categories?id=${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
          cover_url: categoryCoverUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update category')
      }

      toast.success('Category updated successfully!')
      router.push('/dashboard/documents/categories')
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to update category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCoverUpload = (file: File) => {
    setCategoryCoverFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCategoryCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCoverRemove = () => {
    setCategoryCoverFile(null)
    setCategoryCoverPreview(category?.cover_url || null)
  }

  if (isLoading || !category) {
    return (
      <>
        <PageHeader
          title="Edit Category"
          showBackButton
          backHref="/dashboard/documents/categories"
        />
        <div className="max-w-4xl mx-auto mt-6">
          <Card padding="md">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              <div className="h-10 bg-slate-200 rounded w-full"></div>
              <div className="h-10 bg-slate-200 rounded w-full"></div>
            </div>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Edit Category"
        showBackButton
        backHref="/dashboard/documents/categories"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <form onSubmit={handleCategorySubmit}>
          <div className="space-y-6">
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Category Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="e.g., Fiction, Science, History"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="Category description (optional)"
                    rows={3}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Category Cover Image
                  </label>
                  <ThumbnailUpload
                    onUpload={handleCoverUpload}
                    preview={categoryCoverPreview}
                    maxSize={5}
                    isLoading={isSaving}
                    onRemove={handleCoverRemove}
                  />
                </div>
              </div>
            </Card>

            {/* Show subcategories info */}
            {category.subcategories && category.subcategories.length > 0 && (
              <Card padding="md">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Subcategories</h3>
                <p className="text-sm text-slate-600 mb-3">
                  This category has {category.subcategories.length} subcategory(ies). 
                  To edit subcategories, find them in the categories list and edit them individually.
                </p>
                <div className="space-y-2">
                  {category.subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg">
                      <span className="font-medium text-slate-900">{sub.name}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/dashboard/documents/categories/edit/${sub.id}`)}
                        className="transform-none"
                      >
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Submit Buttons */}
            <Card padding="md">
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/dashboard/documents/categories')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="submit"
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  Update Category
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
