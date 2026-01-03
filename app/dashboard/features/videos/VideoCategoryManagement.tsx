'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
import VideoCategoryModal from './VideoCategoryModal'
import Card from '../../../components/Card'

interface VideoCategory {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

interface VideoCategoryManagementProps {
  categories: VideoCategory[]
  isLoading: boolean
  onRefresh: () => void
}

export default function VideoCategoryManagement({ categories, isLoading, onRefresh }: VideoCategoryManagementProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(null)
  const [openCategoryDropdownId, setOpenCategoryDropdownId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleNewCategory = () => {
    setEditingCategory(null)
    setIsCategoryModalOpen(true)
    setOpenCategoryDropdownId(null)
  }

  const handleCategoryEdit = (category: VideoCategory) => {
    setEditingCategory(category)
    setIsCategoryModalOpen(true)
    setOpenCategoryDropdownId(null)
  }

  const handleCategoryDeleteClick = (category: VideoCategory) => {
    setCategoryToDelete({ id: category.id, name: category.name })
    setDeleteModalOpen(true)
    setOpenCategoryDropdownId(null)
  }

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/video-categories?id=${categoryToDelete.id}`, {
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

  // Function to get a color based on category name
  const getCategoryColor = (name: string) => {
    const colors = [
      'bg-gradient-to-r from-purple-500 to-pink-500',
      'bg-gradient-to-r from-blue-500 to-indigo-500',
      'bg-gradient-to-r from-green-500 to-emerald-500',
      'bg-gradient-to-r from-orange-500 to-red-500',
      'bg-gradient-to-r from-cyan-500 to-blue-500',
      'bg-gradient-to-r from-rose-500 to-pink-500',
      'bg-gradient-to-r from-amber-500 to-orange-500',
      'bg-gradient-to-r from-teal-500 to-cyan-500',
      'bg-gradient-to-r from-violet-500 to-purple-500',
      'bg-gradient-to-r from-indigo-500 to-blue-500',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const categoryColumns = [
    {
      header: 'Category',
      accessor: 'name',
      render: (value: string, row: VideoCategory) => (
        <div className="flex items-center gap-3">
          <div className={`w-16 h-16 rounded-lg shadow-md overflow-hidden shrink-0 ${!row.cover_url ? getCategoryColor(value) : ''}`}>
            {row.cover_url ? (
              <img
                src={row.cover_url}
                alt={`${value} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {value.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base">{value}</span>
            {row.description && (
              <div className="text-sm text-slate-600 mt-0.5 line-clamp-1">{row.description}</div>
            )}
          </div>
        </div>
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
      render: (value: string, row: VideoCategory) => (
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
      {/* Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card padding="md" hover>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-gold-100 to-gold-200 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Categories</p>
              <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">Video Categories</h3>
        <button
          onClick={handleNewCategory}
          className="px-4 py-2 bg-linear-to-br from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-colors font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
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
            emptyMessage="No video categories created yet"
            emptyDescription="Create your first category to organize your videos"
            emptyIcon={
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            }
          />
        </div>
      </Card>

      <VideoCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
        }}
        editingCategory={editingCategory}
        onSave={onRefresh}
        isLoading={isLoading}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleCategoryDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? All videos in this category will be moved to uncategorized."
        itemName={categoryToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}

