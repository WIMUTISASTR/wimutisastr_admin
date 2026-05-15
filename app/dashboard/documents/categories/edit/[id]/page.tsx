'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { PageHeader } from '../../../../../components/layout'
import { Card, Button } from '../../../../../components/ui'
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
      } catch (error: unknown) {
        console.error('Fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to load category'
        toast.error(message)
        router.push('/dashboard/documents/categories')
      } finally {
        setIsLoading(false)
      }
    }

    if (categoryId) {
      fetchCategory()
    }
  }, [categoryId, router])

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setIsSaving(true)

    try {
      // Update category
      const response = await apiFetch(`/api/categories?id=${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update category')
      }

      toast.success('Category updated successfully!')
      router.push('/dashboard/documents/categories')
    } catch (error: unknown) {
      console.error('Submit error:', error)
      const message = error instanceof Error ? error.message : 'Failed to update category'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
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

              </div>
            </Card>

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
