'use client'

import { useState } from 'react'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
import { Book } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface BookListProps {
  books: Book[]
  isLoading: boolean
  onEdit: (book: Book) => void
  onDelete: (bookId: string) => Promise<void>
}

export default function BookList({ books, isLoading, onEdit, onDelete }: BookListProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (book: Book) => {
    setBookToDelete({ id: book.id, title: book.title })
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return
    
    try {
      setIsDeleting(true)
      await onDelete(bookToDelete.id)
      setDeleteModalOpen(false)
      setBookToDelete(null)
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setBookToDelete(null)
  }

  const columns = [
    {
      header: 'Cover',
      accessor: 'cover_url',
      render: (value: string | null, row: Book) => (
        <div className="w-16 h-20 flex items-center justify-center bg-slate-50 rounded border border-slate-200 overflow-hidden">
          {value ? (
            <img
              src={value}
              alt={`${row.title} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      ),
    },
    {
      header: 'Title',
      accessor: 'title',
    },
    {
      header: 'Author',
      accessor: 'author',
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (value: { id: string; name: string } | null) => (
        value ? (
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
            {value.name}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">No category</span>
        )
      ),
    },
    {
      header: 'Year',
      accessor: 'year',
    },
    {
      header: 'Size',
      accessor: 'file_size',
      render: (value: number) => formatFileSize(value),
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: Book) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="overflow-x-auto overflow-y-visible">
        <DataTable
          columns={columns}
          data={books}
          isLoading={isLoading}
          emptyMessage="No books uploaded yet"
          onRowClick={(book) => onEdit(book as Book)}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        itemName={bookToDelete?.title}
        isLoading={isDeleting}
      />
    </>
  )
}

