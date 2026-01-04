'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { DataTable } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import VideoCategoryModal from './VideoCategoryModal'
import { Card, Button, UIIcons } from '../../../components/ui'

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
          <Button
            onClick={(e) => {
              e.stopPropagation()
              setOpenCategoryDropdownId(openCategoryDropdownId === row.id ? null : row.id)
            }}
            aria-label="Actions"
            variant="ghost"
            size="sm"
            className="p-2 transform-none"
          >
            <UIIcons.DotsVertical className="w-5 h-5" />
          </Button>

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
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryEdit(row)
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start transform-none text-blue-700 hover:bg-blue-50"
                >
                  <UIIcons.Edit className="w-4 h-4" />
                  Edit
                </Button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryDeleteClick(row)
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start transform-none text-red-600 hover:bg-red-50"
                >
                  <UIIcons.Delete className="w-4 h-4" />
                  Delete
                </Button>
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
        <h3 className="text-lg font-bold text-slate-800"></h3>
        <Button onClick={handleNewCategory} size="sm">
          <UIIcons.Plus className="w-4 h-4" />
          New
        </Button>
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

