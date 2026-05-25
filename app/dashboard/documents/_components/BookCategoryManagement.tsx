'use client'

import { useState, useMemo } from 'react'
import { notify } from '@/lib/utils/notify'
import { DataTable } from '../../../components/data-display'
import { DeleteConfirmationModal, Modal } from '../../../components/feedback'
import { Card, Button, UIIcons } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { Category } from '../../shared/types'

interface CategoryManagementProps {
  categories: Category[]
  isLoading: boolean
  onRefresh: () => void
}

// Flatten hierarchical categories for table display
type FlatCategory = Category & { _displayName?: string; _level?: number }

function flattenCategories(categories: Category[], parentName: string = '', level: number = 0): FlatCategory[] {
  const flattened: FlatCategory[] = []
  
  categories.forEach(category => {
    const displayName = level > 0 ? `${parentName} > ${category.name}` : category.name
    const categoryWithDisplay: FlatCategory = { ...category, _displayName: displayName, _level: level }
    flattened.push(categoryWithDisplay)
    
    if (category.subcategories && category.subcategories.length > 0) {
      const subFlattened = flattenCategories(category.subcategories, displayName, level + 1)
      flattened.push(...subFlattened)
    }
  })
  
  return flattened
}

interface SubcategoryForm {
  id?: string
  name: string
  description: string
}

export default function CategoryManagement({ categories, isLoading, onRefresh }: CategoryManagementProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [subcategories, setSubcategories] = useState<SubcategoryForm[]>([])
  const [editingSubcategoryIndex, setEditingSubcategoryIndex] = useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Flatten categories for table display
  const flattenedCategories = useMemo(() => flattenCategories(categories), [categories])
  

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      notify.error('ឈ្មោះប្រភេទត្រូវតែបំពេញ')
      return
    }

    setIsSaving(true)

    try {
      let mainCategoryId: string

      if (editingCategory) {
        // Update existing main category
        const response = await apiFetch(`/api/categories?id=${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryFormData.name,
            description: categoryFormData.description || null,
            parent_id: null,
          }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'មិនអាចធ្វើបច្ចុប្បន្នភាពប្រភេទបានទេ')

        mainCategoryId = editingCategory.id
        notify.success('ប្រភេទត្រូវបានធ្វើបច្ចុប្បន្នភាព!')
      } else {
        // Create new main category
        const response = await apiFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryFormData.name,
            description: categoryFormData.description || null,
            parent_id: null,
          }),
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'មិនអាចបង្កើតប្រភេទបានទេ')

        mainCategoryId = result.data.id
        notify.success('ប្រភេទត្រូវបានបង្កើតដោយជោគជ័យ!')
      }

      // Now create/update subcategories
      if (subcategories.length > 0) {
        const subcategoryPromises = subcategories.map(async (sub) => {
          if (sub.id) {
            // Update existing subcategory
            const response = await apiFetch(`/api/categories?id=${sub.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: sub.name,
                description: sub.description || null,
                parent_id: mainCategoryId,
              }),
            })
            if (!response.ok) {
              const result = await response.json()
              throw new Error(result.error || `មិនអាចធ្វើបច្ចុប្បន្នភាពប្រភេទរង: ${sub.name}`)
            }
          } else {
            // Create new subcategory
            const response = await apiFetch('/api/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: sub.name,
                description: sub.description || null,
                parent_id: mainCategoryId,
              }),
            })
            if (!response.ok) {
              const result = await response.json()
              throw new Error(result.error || `មិនអាចបង្កើតប្រភេទរង: ${sub.name}`)
            }
          }
        })

        await Promise.all(subcategoryPromises)
        notify.success(`ប្រភេទ និងប្រភេទរង ${subcategories.length} ត្រូវបានរក្សាទុក!`)
      }

      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', description: '' })
      setSubcategories([])
      onRefresh()
    } catch (error: unknown) {
      console.error('Error saving category:', error)
      const message = error instanceof Error ? error.message : 'មិនអាចរក្សាទុកប្រភេទបានទេ'
      notify.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryEdit = (category: Category) => {
    // Only allow editing main categories (categories without parent_id)
    if (category.parent_id) {
      notify.info('សូមកែប្រែប្រភេទរងពីប្រភេទរបស់វា')
      return
    }

    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    })
    // Load existing subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      setSubcategories(
        category.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description || '',
        }))
      )
    } else {
      setSubcategories([])
    }
    setIsCategoryModalOpen(true)
  }

  const handleCategoryDeleteClick = (category: Category) => {
    setCategoryToDelete({ id: category.id, name: category.name })
    setDeleteModalOpen(true)
  }

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      setIsDeleting(true)
      const response = await apiFetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category')
      }

      notify.success('ប្រភេទត្រូវបានលុបដោយជោគជ័យ!')
      
      // If deleting a subcategory from the modal, remove it from local state
      if (editingSubcategoryIndex !== null) {
        setSubcategories(subcategories.filter((_, i) => i !== editingSubcategoryIndex))
        setEditingSubcategoryIndex(null)
      }
      
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      onRefresh()
    } catch (error: unknown) {
      console.error('Delete error:', error)
      const message = error instanceof Error ? error.message : 'មិនអាចលុបប្រភេទបានទេ'
      notify.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setCategoryToDelete(null)
  }

  const handleNewMainCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', description: '' })
    setSubcategories([])
    setIsCategoryModalOpen(true)
  }

  const handleAddSubcategory = () => {
    setSubcategories([...subcategories, { name: '', description: '' }])
    setEditingSubcategoryIndex(subcategories.length)
  }

  const handleSubcategoryChange = (index: number, field: 'name' | 'description', value: string) => {
    const updated = [...subcategories]
    updated[index] = { ...updated[index], [field]: value }
    setSubcategories(updated)
  }

  const handleSubcategoryDelete = (index: number) => {
    const sub = subcategories[index]
    if (sub.id) {
      // Existing subcategory - need to delete from server
      setCategoryToDelete({ id: sub.id, name: sub.name })
      setDeleteModalOpen(true)
      // Store index to remove from local state after deletion
      setEditingSubcategoryIndex(index)
    } else {
      // New subcategory - just remove from local state
      setSubcategories(subcategories.filter((_, i) => i !== index))
      if (editingSubcategoryIndex === index) {
        setEditingSubcategoryIndex(null)
      } else if (editingSubcategoryIndex !== null && editingSubcategoryIndex > index) {
        setEditingSubcategoryIndex(editingSubcategoryIndex - 1)
      }
    }
  }

  const handleSubcategorySave = (index: number) => {
    const sub = subcategories[index]
    if (!sub.name.trim()) {
      notify.error('ឈ្មោះប្រភេទរងត្រូវតែបំពេញ')
      return
    }
    setEditingSubcategoryIndex(null)
  }

  const handleSubcategoryEdit = (index: number) => {
    setEditingSubcategoryIndex(index)
  }

  const categoryColumns = [
    {
      header: 'ប្រភេទ',
      accessor: 'name',
      render: (value: unknown, row: FlatCategory) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {row._level && row._level > 0 && (
              <span className="text-slate-400 text-sm">└─</span>
            )}
            <span className={`font-bold text-slate-900 ${row._level && row._level > 0 ? 'text-sm' : ''}`}>
              {row._displayName || (typeof value === 'string' ? value : row.name)}
            </span>
            {row.parent && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                ចំបង: {row.parent.name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'ការពិពណ៌នា',
      accessor: 'description',
      render: (value: unknown) => (
        <span className="text-slate-600 text-sm">
          {typeof value === 'string' && value.trim() ? value : 'គ្មានការពិពណ៌នា'}
        </span>
      ),
    },
    {
      header: 'បានបង្កើត',
      accessor: 'created_at',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">-</span>
        }
        return (
          <div>
            <div className="text-sm font-medium text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      render: (_value: unknown, row: FlatCategory) => (
        <div className="relative">
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCategoryDeleteClick(row)
            }}
          >
            <UIIcons.Delete className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>


      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">ប្រភេទឯកសារ</h3>
          <p className="text-sm text-slate-600">ចុចជួរដើម្បីកែប្រែ។ ប្រើលុបដើម្បីដកប្រភេទចេញ។</p>
        </div>
        <Button onClick={handleNewMainCategory} size="sm">
          <UIIcons.Plus className="w-4 h-4" />
          ប្រភេទ
        </Button>
      </div>
      
      <Card padding="none">
        <div className="overflow-x-auto overflow-y-visible">
          <DataTable<FlatCategory>
            columns={categoryColumns}
            data={flattenedCategories}
            isLoading={isLoading}
            onRowClick={handleCategoryEdit}
            emptyMessage="មិនទាន់មានប្រភេទ"
            emptyDescription="បង្កើតប្រភេទទីមួយ ដើម្បីរៀបចំឯកសារ"
            emptyIcon={
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
        </div>
      </Card>

      {/* Create/Edit Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
          setCategoryFormData({ name: '', description: '' })
          setSubcategories([])
          setEditingSubcategoryIndex(null)
        }}
        title={editingCategory ? 'កែប្រែប្រភេទ' : 'ប្រភេទថ្មី'}
        variant="center"
        isDismissable={!isLoading}
        className="p-6"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-6">
          {/* Main Category Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">ប្រភេទ</h3>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  ឈ្មោះប្រភេទ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                  placeholder="ឧ. ច្បាប់, សេដ្ឋកិច្ច, ប្រវត្តិសាស្ត្រ"
                  required
                />
              </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                ការពិពណ៌នា
              </label>
              <textarea
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                placeholder="ការពិពណ៌នា (ស្រេចចិត្ត)"
              />
            </div>
          </div>

          {/* Subcategories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">ប្រភេទរង</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddSubcategory}
              >
                <UIIcons.Plus className="w-4 h-4" />
                បន្ថែមប្រភេទរង
              </Button>
            </div>

            {subcategories.length === 0 ? (
              <p className="text-sm text-slate-500 italic">មិនទាន់មានប្រភេទរង។ ចុច &quot;បន្ថែមប្រភេទរង&quot; ដើម្បីបង្កើត។</p>
            ) : (
              <div className="space-y-3">
                {subcategories.map((sub, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    {editingSubcategoryIndex === index ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-black mb-1">
                            ឈ្មោះប្រភេទរង <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleSubcategoryChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black bg-white"
                            placeholder="ឈ្មោះប្រភេទរង"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-black mb-1">
                            ការពិពណ៌នា
                          </label>
                          <textarea
                            value={sub.description}
                            onChange={(e) => handleSubcategoryChange(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black bg-white"
                            placeholder="ការពិពណ៌នា (ស្រេចចិត្ត)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSubcategorySave(index)}
                          >
                            រក្សាទុក
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (!sub.id) {
                                // New subcategory - just remove
                                setSubcategories(subcategories.filter((_, i) => i !== index))
                              }
                              setEditingSubcategoryIndex(null)
                            }}
                          >
                            បោះបង់
                          </Button>
                          {sub.id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => handleSubcategoryDelete(index)}
                            >
                              <UIIcons.Delete className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{sub.name}</div>
                          {sub.description && (
                            <div className="text-xs text-slate-600 mt-1">{sub.description}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSubcategoryEdit(index)}
                          >
                            <UIIcons.Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleSubcategoryDelete(index)}
                          >
                            <UIIcons.Delete className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
              </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
                  type="button"
              variant="secondary"
              fullWidth
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setEditingCategory(null)
                    setCategoryFormData({ name: '', description: '' })
                    setSubcategories([])
                    setEditingSubcategoryIndex(null)
                  }}
                >
                  បោះបង់
            </Button>
            <Button
                  type="submit"
              isLoading={isSaving}
              fullWidth
                >
              {isSaving
                    ? editingCategory
                  ? 'កំពុងរក្សាទុក...'
                      : 'កំពុងបង្កើត...'
                    : editingCategory
                ? 'រក្សាទុក'
                    : 'បង្កើតប្រភេទ'}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleCategoryDeleteConfirm}
        title="លុបប្រភេទ"
        message="តើអ្នកប្រាកដជាចង់លុបប្រភេទនេះទេ? ឯកសារទាំងអស់ក្នុងប្រភេទនេះនឹងក្លាយជាមិនមានប្រភេទ។ ប្រភេទរងត្រូវតែលុប ឬផ្លាស់ទីជាមុន។"
        itemName={categoryToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}

