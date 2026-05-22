'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { Card, Button, UIIcons } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { Category } from '../../shared/types'
import { toast } from 'react-toastify'

interface CategoryListProps {
  categories: Category[]
  isLoading: boolean
  onRefresh: () => void
}

type FlatCategory = Category

export default function CategoryList({ categories, isLoading, onRefresh }: CategoryListProps) {
  const router = useRouter()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const flattenedCategories = categories

  const handleDeleteClick = (category: FlatCategory) => {
    setCategoryToDelete({ id: category.id, name: category.name })
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
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

      toast.success('Category deleted successfully!')
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      onRefresh()
    } catch (error: unknown) {
      console.error('Delete error:', error)
      const message = error instanceof Error ? error.message : 'Failed to delete category'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const categoryColumns = [
    {
      header: 'ប្រភេទ',
      accessor: 'name',
      width: '40%',
      render: (value: unknown, row: FlatCategory) => (
        <div>
          <span className="font-semibold text-slate-900">{(value as string) || row.name}</span>
          {row.description && (
            <div className="text-sm text-slate-600 mt-1 line-clamp-2">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: 'ឯកសារ',
      accessor: 'id',
      width: '15%',
      render: () => (
        <div className="text-slate-900">
          {/* You can add book count here if needed */}
          -
        </div>
      ),
    },
    {
      header: 'បានបង្កើត',
      accessor: 'created_at',
      width: '20%',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">-</span>
        }
        return (
          <div>
            <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      },
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '25%',
      render: (value: unknown, row: FlatCategory) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/dashboard/documents/categories/edit/${String(value)}`)}
            variant="secondary"
            size="sm"
            className="transform-none"
            aria-label="Edit category"
          >
            <UIIcons.Edit className="w-4 h-4 mr-2" />
            កែប្រែ
          </Button>
          <Button
            onClick={() => handleDeleteClick(row)}
            variant="danger"
            size="sm"
            className="transform-none"
            aria-label="Delete category"
          >
            <UIIcons.Delete className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Card padding="none">
        <DataTable<FlatCategory>
          columns={categoryColumns}
          data={flattenedCategories}
          isLoading={isLoading}
          emptyMessage="មិនទាន់មានប្រភេទ"
          emptyDescription="បង្កើតប្រភេទទីមួយ ដើម្បីរៀបចំឯកសារ"
          emptyIcon={
            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="លុបប្រភេទ"
        message="តើអ្នកប្រាកដជាចង់លុបប្រភេទនេះទេ? ឯកសារទាំងអស់ក្នុងប្រភេទនេះនឹងក្លាយជាមិនមានប្រភេទ។"
        itemName={categoryToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}
