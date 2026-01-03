'use client'

import { useState, useMemo } from 'react'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
import Card from '../../../components/Card'
import Badge from '../../../components/Badge'
import { Book } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface BookListProps {
  books: Book[]
  isLoading: boolean
  onEdit: (book: Book) => void
  onDelete: (bookId: string) => Promise<boolean>
}

export default function BookList({ books, isLoading, onEdit, onDelete }: BookListProps) {
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
      header: 'Book',
      accessor: 'title',
      width: '35%',
      render: (value: string, row: Book) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-16 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 rounded-lg shadow-sm overflow-hidden shrink-0">
            {row.cover_url ? (
              <img
                src={row.cover_url}
                alt={`${value} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 truncate">{value}</div>
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
      render: (value: { id: string; name: string } | null) => (
        value ? (
          <Badge variant="default" size="md">
            {value.name}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">Uncategorized</span>
        )
      ),
    },
    {
      header: 'File Size',
      accessor: 'file_size',
      width: '15%',
      render: (value: number) => (
        <span className="text-sm text-slate-700">{formatFileSize(value)}</span>
      ),
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      width: '20%',
      render: (value: string) => (
        <div>
          <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
          <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '10%',
      render: (value: string, row: Book) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row)
            }}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Edit"
            title="Edit book"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete"
            title="Delete book"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card padding="md" hover>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-gold-100 to-gold-200 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Books</p>
              <p className="text-2xl font-bold text-slate-900">{books.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" hover>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Categories</p>
              <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" hover>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Size</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatFileSize(books.reduce((sum, book) => sum + book.file_size, 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
            >
              <option value="">All Categories</option>
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
            <span>Showing {filteredBooks.length} of {books.length} books</span>
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
      </Card>

      {/* Books Table */}
      <Card padding="none">
        <DataTable
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

