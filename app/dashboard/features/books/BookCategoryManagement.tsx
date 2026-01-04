'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { DataTable } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { Card } from '../../../components/ui'
import { Category } from '../../shared/types'

interface CategoryManagementProps {
  categories: Category[]
  isLoading: boolean
  onRefresh: () => void
}

export default function CategoryManagement({ categories, isLoading, onRefresh }: CategoryManagementProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [openCategoryDropdownId, setOpenCategoryDropdownId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      if (editingCategory) {
        // Update existing category
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingCategory.id,
            name: categoryFormData.name,
            description: categoryFormData.description || null,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update category')
        }

        toast.success('Category updated successfully!')
      } else {
        // Create new category
        const response = await fetch('/api/categories', {
          method: 'POST',
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
          throw new Error(result.error || 'Failed to create category')
        }

        toast.success('Category created successfully!')
      }

      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', description: '' })
      onRefresh()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    }
  }

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    })
    setIsCategoryModalOpen(true)
    setOpenCategoryDropdownId(null)
  }

  const handleCategoryDeleteClick = (category: Category) => {
    setCategoryToDelete({ id: category.id, name: category.name })
    setDeleteModalOpen(true)
    setOpenCategoryDropdownId(null)
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

  const handleNewCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', description: '' })
    setIsCategoryModalOpen(true)
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
      render: (value: string) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${getCategoryColor(value)} shadow-md flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">
              {value.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-900">{value}</span>
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenCategoryDropdownId(openCategoryDropdownId === row.id ? null : row.id)
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Actions"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {openCategoryDropdownId === row.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenCategoryDropdownId(null)}
              />
              
              <div 
                className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                ref={(el) => {
                  if (el && openCategoryDropdownId === row.id) {
                    const container = el.closest('.relative') as HTMLElement
                    const button = container?.querySelector('button') as HTMLElement
                    if (button) {
                      const rect = button.getBoundingClientRect()
                      el.style.top = `${rect.bottom + 8}px`
                      el.style.right = `${window.innerWidth - rect.right}px`
                    }
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryEdit(row)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryDeleteClick(row)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>


      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">All Categories</h3>
        <button
          onClick={handleNewCategory}
          className="px-4 py-2 bg-linear-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-colors font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Category
        </button>
      </div>
      
      <Card padding="none">
        <div className="overflow-x-auto overflow-y-visible">
          <DataTable
            columns={categoryColumns}
            data={categories}
            isLoading={isLoading}
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
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                  setCategoryFormData({ name: '', description: '' })
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
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
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
                  placeholder="Optional description for this category"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setEditingCategory(null)
                    setCategoryFormData({ name: '', description: '' })
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-linear-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isLoading
                    ? editingCategory
                      ? 'Updating...'
                      : 'Creating...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleCategoryDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? All books in this category will be moved to uncategorized."
        itemName={categoryToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}

