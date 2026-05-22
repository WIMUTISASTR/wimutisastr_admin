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
          throw new Error(result.error || 'មិនអាចទៅយកទិន្នន័យប្រភេទបានទេ')
        }

        const categoryData = result.data
        setCategory(categoryData)
        setCategoryFormData({
          name: categoryData.name,
          description: categoryData.description || '',
        })
      } catch (error: unknown) {
        console.error('Fetch error:', error)
        const message = error instanceof Error ? error.message : 'មិនអាចផ្ទុកប្រភេទបានទេ'
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
      toast.error('ឈ្មោះប្រភេទត្រូវតែបំពេញ')
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
        throw new Error(result.error || 'មិនអាចធ្វើបច្ចុប្បន្នភាពប្រភេទបានទេ')
      }

      toast.success('ប្រភេទត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!')
      router.push('/dashboard/documents/categories')
    } catch (error: unknown) {
      console.error('Submit error:', error)
      const message = error instanceof Error ? error.message : 'មិនអាចធ្វើបច្ចុប្បន្នភាពប្រភេទបានទេ'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !category) {
    return (
      <>
        <PageHeader
          title="កែប្រែប្រភេទ"
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
        title="កែប្រែប្រភេទ"
        showBackButton
        backHref="/dashboard/documents/categories"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <form onSubmit={handleCategorySubmit}>
          <div className="space-y-6">
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">ព័ត៌មានប្រភេទ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    ឈ្មោះប្រភេទ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="ឧ. ច្បាប់, សេដ្ឋកិច្ច, ប្រវត្តិសាស្ត្រ"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    ការពិពណ៌នា
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="ការពិពណ៌នា (ស្រេចចិត្ត)"
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
                  បោះបង់
                </Button>
                <Button
                  type="submit"
                  variant="submit"
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  ធ្វើបច្ចុប្បន្នភាពប្រភេទ
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
