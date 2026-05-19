'use client'

import { useState, useMemo } from 'react'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { Card, Badge, Button } from '../../../components/ui'
import { Book } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BookListProps {
  books: Book[]
  isLoading: boolean
  onEdit: (book: Book) => void
  onDelete: (bookId: string) => Promise<boolean>
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}

export default function BookList({ books, isLoading, onEdit, onDelete, pagination, onPageChange }: BookListProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(books.map(book => book.category?.name).filter(Boolean))
    return Array.from(uniqueCategories)
  }, [books])

  // Filter books based on search and category
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = searchQuery === '' || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === '' || 
        book.category?.name === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [books, searchQuery, selectedCategory])

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
    } catch {
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
      header: 'Book',
      accessor: 'title',
      width: '35%',
      render: (value: unknown, row: Book) => (
        <div className="flex items-center gap-3">          
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 truncate">
              {typeof value === 'string' ? value : row.title}
            </div>
            <div className="text-sm text-slate-600 truncate">{row.author}</div>
            <div className="text-xs text-slate-500 mt-0.5">{row.year}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      width: '20%',
      render: (value: unknown) => (
        value && typeof value === 'object' && 'name' in value ? (
          <Badge variant="default" size="md">
            {(value as { name: string }).name}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">Uncategorized</span>
        )
      ),
    },
    {
      header: 'Access',
      accessor: 'access_level',
      width: '10%',
      render: (value: unknown) => {
        const access = value === 'free' ? 'free' : 'members'
        return (
          <Badge variant={access === 'free' ? 'info' : 'default'} size="sm">
            {access === 'free' ? 'Free' : 'Members'}
          </Badge>
        )
      },
    },
    {
      header: 'File Size',
      accessor: 'file_size',
      width: '15%',
      render: (value: unknown) => (
        <span className="text-sm text-slate-700">
          {typeof value === 'number' ? formatFileSize(value) : '-'}
        </span>
      ),
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      width: '20%',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">-</span>
        }
        return (
          <div>
            <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '10%',
      render: (value: unknown, row: Book) => (
        <div className="flex gap-1">         
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg transition-all"
            >
              <option value="">ប្រភេទទាំងអស់</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || selectedCategory) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span>បង្ហាញ {filteredBooks.length} ក្នុងចំណោម {books.length} ឯកសារ</span>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('')
                }}
                className="text-gold-600 hover:text-gold-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

      {/* Books Table */}
      <Card padding="none">
        <DataTable<Book>
          columns={columns}
          data={filteredBooks}
          isLoading={isLoading}
          emptyMessage={searchQuery || selectedCategory ? "No books match your filters" : "No books uploaded yet"}
          emptyDescription={searchQuery || selectedCategory ? "Try adjusting your search or filters" : "Start by uploading your first book"}
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          onRowClick={(book) => onEdit(book as Book)}
          hoverable
        />
        {!isLoading && books.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={onPageChange}
            isLoading={isLoading}
          />
        )}
      </Card>

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

