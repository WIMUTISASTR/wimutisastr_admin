'use client'

import { useState, useMemo, useRef } from 'react'
import { toast } from 'react-toastify'
import { DataTable } from '../../../components/data-display'
import { DeleteConfirmationModal, Modal } from '../../../components/feedback'
import { Card, Button, UIIcons } from '../../../components/ui'
import { Category } from '../../shared/types'
import ThumbnailUpload from '../../../components/forms/ThumbnailUpload'

interface CategoryManagementProps {
  categories: Category[]
  isLoading: boolean
  onRefresh: () => void
}

// Flatten hierarchical categories for table display
function flattenCategories(categories: Category[], parentName: string = '', level: number = 0): Category[] {
  const flattened: Category[] = []
  
  categories.forEach(category => {
    const displayName = level > 0 ? `${parentName} > ${category.name}` : category.name
    const categoryWithDisplay = { ...category, _displayName: displayName, _level: level }
    flattened.push(categoryWithDisplay)
    
    if (category.subcategories && category.subcategories.length > 0) {
      const subFlattened = flattenCategories(category.subcategories, displayName, level + 1)
      flattened.push(...subFlattened)
    }
  })
  
  return flattened
}

// Get all categories (including subcategories) for parent selection
function getAllCategories(categories: Category[]): Category[] {
  const all: Category[] = []
  
  categories.forEach(category => {
    all.push(category)
    if (category.subcategories && category.subcategories.length > 0) {
      all.push(...getAllCategories(category.subcategories))
    }
  })
  
  return all
}

interface SubcategoryForm {
  id?: string // For editing existing subcategories
  name: string
  description: string
  cover_url?: string | null
  coverFile?: File | null
}

export default function CategoryManagement({ categories, isLoading, onRefresh }: CategoryManagementProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [categoryCoverFile, setCategoryCoverFile] = useState<File | null>(null)
  const [categoryCoverPreview, setCategoryCoverPreview] = useState<string | null>(null)
  const [subcategories, setSubcategories] = useState<SubcategoryForm[]>([])
  const [editingSubcategoryIndex, setEditingSubcategoryIndex] = useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Flatten categories for table display
  const flattenedCategories = useMemo(() => flattenCategories(categories), [categories])
  

  const uploadCategoryImage = async (file: File, categoryName: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `category_cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `category-covers/${fileName}`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'covers')
    formData.append('path', filePath)

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload category image')
    }

    return result.publicUrl
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setIsSaving(true)

    try {
      let mainCategoryId: string
      let mainCategoryCoverUrl: string | null = editingCategory?.cover_url || null

      // Upload main category image if provided
      if (categoryCoverFile) {
        mainCategoryCoverUrl = await uploadCategoryImage(categoryCoverFile, categoryFormData.name)
      }

      if (editingCategory) {
        // Update existing main category
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingCategory.id,
            name: categoryFormData.name,
            description: categoryFormData.description || null,
            cover_url: mainCategoryCoverUrl,
            parent_id: null, // Main categories have no parent
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update category')
        }

        mainCategoryId = editingCategory.id
        toast.success('Main category updated successfully!')
      } else {
        // Create new main category
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: categoryFormData.name,
            description: categoryFormData.description || null,
            cover_url: mainCategoryCoverUrl,
            parent_id: null, // Main categories have no parent
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create category')
        }

        mainCategoryId = result.data.id
        toast.success('Main category created successfully!')
      }

      // Now create/update subcategories
      if (subcategories.length > 0) {
        const subcategoryPromises = subcategories.map(async (sub) => {
          let subcategoryCoverUrl: string | null = sub.cover_url || null

          // Upload subcategory image if provided
          if (sub.coverFile) {
            subcategoryCoverUrl = await uploadCategoryImage(sub.coverFile, sub.name)
          }

          if (sub.id) {
            // Update existing subcategory
            const response = await fetch('/api/categories', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: sub.id,
                name: sub.name,
                description: sub.description || null,
                cover_url: subcategoryCoverUrl,
                parent_id: mainCategoryId,
              }),
            })
            if (!response.ok) {
              const result = await response.json()
              throw new Error(result.error || `Failed to update subcategory: ${sub.name}`)
            }
          } else {
            // Create new subcategory
            const response = await fetch('/api/categories', {
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
            if (!response.ok) {
              const result = await response.json()
              throw new Error(result.error || `Failed to create subcategory: ${sub.name}`)
            }
          }
        })

        await Promise.all(subcategoryPromises)
        toast.success(`Main category and ${subcategories.length} subcategory(ies) saved successfully!`)
      }

      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', description: '' })
      setCategoryCoverFile(null)
      setCategoryCoverPreview(null)
      setSubcategories([])
      onRefresh()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryEdit = (category: Category) => {
    // Only allow editing main categories (categories without parent_id)
    if (category.parent_id) {
      toast.info('Please edit subcategories from their main category')
      return
    }

    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    })
    setCategoryCoverPreview(category.cover_url)
    setCategoryCoverFile(null)
    // Load existing subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      setSubcategories(
        category.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description || '',
          cover_url: sub.cover_url || null,
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
      const response = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category')
      }

      toast.success('Category deleted successfully!')
      
      // If deleting a subcategory from the modal, remove it from local state
      if (editingSubcategoryIndex !== null) {
        setSubcategories(subcategories.filter((_, i) => i !== editingSubcategoryIndex))
        setEditingSubcategoryIndex(null)
      }
      
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      onRefresh()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete category')
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
    setCategoryCoverFile(null)
    setCategoryCoverPreview(null)
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

  const handleSubcategoryImageUpload = (index: number, file: File) => {
    const updated = [...subcategories]
    updated[index] = { ...updated[index], coverFile: file }
    setSubcategories(updated)
  }

  const handleSubcategoryImageRemove = (index: number) => {
    const updated = [...subcategories]
    updated[index] = { ...updated[index], coverFile: null, cover_url: null }
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
      toast.error('Subcategory name is required')
      return
    }
    setEditingSubcategoryIndex(null)
  }

  const handleSubcategoryEdit = (index: number) => {
    setEditingSubcategoryIndex(index)
  }

  // Function to get a color based on category name
  const getCategoryColor = (name: string) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-indigo-500',
      'bg-gradient-to-r from-purple-500 to-pink-500',
      'bg-gradient-to-r from-green-500 to-emerald-500',
      'bg-gradient-to-r from-orange-500 to-red-500',
      'bg-gradient-to-r from-cyan-500 to-blue-500',
      'bg-gradient-to-r from-rose-500 to-pink-500',
      'bg-gradient-to-r from-amber-500 to-orange-500',
      'bg-gradient-to-r from-teal-500 to-cyan-500',
      'bg-gradient-to-r from-violet-500 to-purple-500',
      'bg-gradient-to-r from-lime-500 to-green-500',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const categoryColumns = [
    {
      header: 'Category',
      accessor: 'name',
      render: (value: string, row: Category & { _displayName?: string; _level?: number }) => (
        <div className="flex items-center gap-3">
          {row.cover_url && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img
                src={row.cover_url}
                alt={value}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {row._level && row._level > 0 && (
              <span className="text-slate-400 text-sm">└─</span>
            )}
            <span className={`font-bold text-slate-900 ${row._level && row._level > 0 ? 'text-sm' : ''}`}>
              {row._displayName || value}
            </span>
            {row.parent && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Parent: {row.parent.name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (value: string | null) => (
        <span className="text-slate-600 text-sm">{value || 'No description'}</span>
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (value: string) => (
        <div>
          <div className="text-sm font-medium text-slate-900">{new Date(value).toLocaleDateString()}</div>
          <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: Category) => (
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
          <h3 className="text-lg font-bold text-slate-900 mb-1">Book Categories</h3>
          <p className="text-sm text-slate-600">Click a row to edit. Use delete to remove a category.</p>
        </div>
        <Button onClick={handleNewMainCategory} size="sm">
          <UIIcons.Plus className="w-4 h-4" />
          New Main Category
        </Button>
      </div>
      
      <Card padding="none">
        <div className="overflow-x-auto overflow-y-visible">
          <DataTable
            columns={categoryColumns}
            data={flattenedCategories}
            isLoading={isLoading}
            onRowClick={handleCategoryEdit}
            emptyMessage="No categories created yet"
            emptyDescription="Create your first category to organize your books"
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
          setCategoryCoverFile(null)
          setCategoryCoverPreview(null)
          setSubcategories([])
          setEditingSubcategoryIndex(null)
        }}
        title={editingCategory ? 'Edit Main Category' : 'New Main Category'}
        variant="center"
        isDismissable={!isLoading}
        className="p-6"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-6">
          {/* Main Category Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Main Category</h3>
            
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                  placeholder="e.g., Fiction, Non-Fiction, Law"
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
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                placeholder="Optional description for this category"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Category Image
              </label>
              <ThumbnailUpload
                onUpload={(file) => {
                  setCategoryCoverFile(file)
                  const reader = new FileReader()
                  reader.onload = (e) => {
                    setCategoryCoverPreview(e.target?.result as string)
                  }
                  reader.readAsDataURL(file)
                }}
                preview={categoryCoverPreview || editingCategory?.cover_url || null}
                maxSize={5}
                onRemove={() => {
                  setCategoryCoverFile(null)
                  setCategoryCoverPreview(null)
                }}
              />
            </div>
          </div>

          {/* Subcategories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">Subcategories</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddSubcategory}
              >
                <UIIcons.Plus className="w-4 h-4" />
                Add Subcategory
              </Button>
            </div>

            {subcategories.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No subcategories yet. Click "Add Subcategory" to create one.</p>
            ) : (
              <div className="space-y-3">
                {subcategories.map((sub, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    {editingSubcategoryIndex === index ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-black mb-1">
                            Subcategory Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleSubcategoryChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black bg-white"
                            placeholder="Subcategory name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-black mb-1">
                            Description
                          </label>
                          <textarea
                            value={sub.description}
                            onChange={(e) => handleSubcategoryChange(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black bg-white"
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-black mb-1">
                            Subcategory Image
                          </label>
                          <ThumbnailUpload
                            onUpload={(file) => handleSubcategoryImageUpload(index, file)}
                            preview={sub.coverFile ? URL.createObjectURL(sub.coverFile) : sub.cover_url || null}
                            maxSize={5}
                            onRemove={() => handleSubcategoryImageRemove(index)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSubcategorySave(index)}
                          >
                            Save
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
                            Cancel
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
                        {sub.cover_url && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={sub.cover_url}
                              alt={sub.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
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
                  Cancel
            </Button>
            <Button
                  type="submit"
              isLoading={isSaving}
              fullWidth
                >
              {isSaving
                    ? editingCategory
                  ? 'Saving...'
                      : 'Creating...'
                    : editingCategory
                ? 'Save Changes'
                    : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleCategoryDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? All books in this category will be moved to uncategorized. Subcategories must be deleted or moved first."
        itemName={categoryToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}

