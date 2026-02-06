'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { apiFetch } from '../../../shared/api'
import { PageHeader } from '../../../../components/layout'
import { Card, Button, UIIcons } from '../../../../components/ui'
import { ThumbnailUpload } from '../../../../components/forms'

interface SubcategoryForm {
  name: string
  description: string
  coverFile: File | null
  coverPreview: string | null
}

export default function CreateCategoryPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  // Main category form data
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [categoryCoverFile, setCategoryCoverFile] = useState<File | null>(null)
  const [categoryCoverPreview, setCategoryCoverPreview] = useState<string | null>(null)

  // Subcategories
  const [subcategories, setSubcategories] = useState<SubcategoryForm[]>([])

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
      let mainCategoryCoverUrl: string | null = null

      // Upload main category image if provided
      if (categoryCoverFile) {
        mainCategoryCoverUrl = await uploadCategoryImage(categoryCoverFile)
      }

      // Create new main category
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
          cover_url: mainCategoryCoverUrl,
          parent_id: null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create category')
      }

      const mainCategoryId = result.data.id
      toast.success('Main category created successfully!')

      // Create subcategories if any
      for (const sub of subcategories) {
        if (!sub.name.trim()) continue

        let subcategoryCoverUrl: string | null = null

        // Upload subcategory image if provided
        if (sub.coverFile) {
          subcategoryCoverUrl = await uploadCategoryImage(sub.coverFile)
        }

        const subResponse = await apiFetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: sub.name,
            description: sub.description || null,
            cover_url: subcategoryCoverUrl,
            parent_id: mainCategoryId,
          }),
        })

        if (!subResponse.ok) {
          const subResult = await subResponse.json()
          throw new Error(subResult.error || `Failed to create subcategory: ${sub.name}`)
        }
      }

      if (subcategories.length > 0) {
        toast.success(`Created ${subcategories.filter(s => s.name.trim()).length} subcategories!`)
      }

      router.push('/dashboard/documents/categories')
    } catch (error: unknown) {
      console.error('Submit error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create category'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMainCoverUpload = (file: File) => {
    setCategoryCoverFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCategoryCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleMainCoverRemove = () => {
    setCategoryCoverFile(null)
    setCategoryCoverPreview(null)
  }

  const handleAddSubcategory = () => {
    setSubcategories([...subcategories, { name: '', description: '', coverFile: null, coverPreview: null }])
  }

  const handleRemoveSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index))
  }

  const handleSubcategoryChange = (index: number, field: 'name' | 'description', value: string) => {
    const newSubcategories = [...subcategories]
    newSubcategories[index][field] = value
    setSubcategories(newSubcategories)
  }

  const handleSubcategoryCoverUpload = (index: number, file: File) => {
    const newSubcategories = [...subcategories]
    newSubcategories[index].coverFile = file
    const reader = new FileReader()
    reader.onloadend = () => {
      newSubcategories[index].coverPreview = reader.result as string
      setSubcategories([...newSubcategories])
    }
    reader.readAsDataURL(file)
  }

  const handleSubcategoryCoverRemove = (index: number) => {
    const newSubcategories = [...subcategories]
    newSubcategories[index].coverFile = null
    newSubcategories[index].coverPreview = null
    setSubcategories([...newSubcategories])
  }

  return (
    <>
      <PageHeader
        title="Create Category"
        showBackButton
        backHref="/dashboard/documents/categories"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <form onSubmit={handleCategorySubmit}>
          <div className="space-y-6">
            {/* Main Category */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Main Category</h3>
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
                    onUpload={handleMainCoverUpload}
                    preview={categoryCoverPreview}
                    maxSize={5}
                    isLoading={isSaving}
                    onRemove={handleMainCoverRemove}
                  />
                </div>
              </div>
            </Card>

            {/* Subcategories */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Subcategories (Optional)</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddSubcategory}
                  disabled={isSaving}
                  className="transform-none"
                >
                  <UIIcons.Plus className="w-4 h-4 mr-2" />
                  Add Subcategory
                </Button>
              </div>

              {subcategories.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  No subcategories added yet. Click &quot;Add Subcategory&quot; to create one.
                </p>
              ) : (
                <div className="space-y-6">
                  {subcategories.map((sub, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">Subcategory {index + 1}</h4>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveSubcategory(index)}
                          disabled={isSaving}
                          className="transform-none"
                        >
                          <UIIcons.Delete className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleSubcategoryChange(index, 'name', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                            placeholder="Subcategory name"
                            disabled={isSaving}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Description
                          </label>
                          <textarea
                            value={sub.description}
                            onChange={(e) => handleSubcategoryChange(index, 'description', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                            placeholder="Subcategory description"
                            rows={2}
                            disabled={isSaving}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Cover Image
                          </label>
                          <ThumbnailUpload
                            onUpload={(file) => handleSubcategoryCoverUpload(index, file)}
                            preview={sub.coverPreview}
                            maxSize={5}
                            isLoading={isSaving}
                            onRemove={() => handleSubcategoryCoverRemove(index)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  Create Category
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
