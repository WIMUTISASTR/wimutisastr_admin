'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import BookUploadForm from './BookUploadForm'
import BookEditModal from './BookEditModal'
import BookList from './BookList'
import CategoryManagement from './BookCategoryManagement'
import { TabNavigation } from '../../../components/navigation'
import { PageHeader } from '../../../components/layout'
import { useBooks } from '../../shared/hooks/useBooks'
import { useCategories } from '../../shared/hooks/useCategories'
import { Icons } from '../../shared/icons'
import type { Book } from '../../shared/types'

type ViewType = 'upload' | 'list' | 'categories'

const TABS = [
  {
    id: 'upload' as const,
    label: 'Upload',
    icon: Icons.Upload,
  },
  {
    id: 'categories' as const,
    label: 'Categories',
    icon: Icons.Category,
  },
  {
    id: 'list' as const,
    label: 'Books',
    icon: Icons.Book,
  },
]

export default function BooksContent() {
  const { books, isLoading, pagination, fetchBooks, updateBook, deleteBook: removeBook } = useBooks()
  const { categories, fetchCategories } = useCategories()
  const [activeView, setActiveView] = useState<ViewType>('upload')
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (activeView === 'list') {
      fetchBooks(1, 20)
    }
  }, [activeView, fetchBooks])

  const handlePageChange = (page: number) => {
    fetchBooks(page, pagination.limit)
  }

  const handleUpload = async (bookData: {
    title: string
    author: string
    year: string
    description: string
    file: File | null
    cover: File | null
    category_id: string | null
  }) => {
    if (!bookData.file) {
      throw new Error('File is required')
    }

    try {
      setIsUploading(true)

      const category = categories.find(cat => cat.id === bookData.category_id)
      const categoryName = category?.name || 'uncategorized'

      // Upload book file
      const fileUrl = await uploadFile(bookData.file, 'documents', bookData.category_id, categoryName)

      // Upload cover if provided
      let coverUrl: string | null = null
      if (bookData.cover) {
        coverUrl = await uploadFile(bookData.cover, 'covers', bookData.category_id, categoryName)
      }

      // Save book metadata
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
          year: bookData.year,
          description: bookData.description || null,
          file_name: bookData.file.name,
          file_url: fileUrl,
          file_size: bookData.file.size,
          cover_url: coverUrl,
          category_id: bookData.category_id || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save book to database')
      }

      toast.success('Book uploaded successfully!')
      setActiveView('list')
      await fetchBooks()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload book'
      console.error('Upload error:', error)
      toast.error(message)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setIsEditModalOpen(true)
  }

  const handleUpdate = (updatedBook: Book) => {
    updateBook(updatedBook)
    setEditingBook(null)
    setIsEditModalOpen(false)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setEditingBook(null)
  }

  const tabs = TABS.map(tab => ({
    ...tab,
    badge: tab.id === 'categories' ? categories.length : tab.id === 'list' ? books.length : undefined,
  }))

  return (
    <>
      <PageHeader
        title="Document Management"
        description="Upload, organize, and manage your document library"
        breadcrumbs={[
          { label: 'Dashboard' },
          { label: 'Documents' },
        ]}
      />

      <TabNavigation
        tabs={tabs}
        activeTab={activeView}
        onTabChange={(tab) => setActiveView(tab as ViewType)}
      />

      {activeView === 'list' && (
        <BookList
          books={books}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={removeBook}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}

      {activeView === 'upload' && (
        <BookUploadForm
          onUpload={handleUpload}
          isLoading={isUploading}
          categories={categories}
        />
      )}

      {activeView === 'categories' && (
        <CategoryManagement
          categories={categories}
          isLoading={isLoading}
          onRefresh={fetchCategories}
        />
      )}

      <BookEditModal
        book={editingBook}
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
        categories={categories}
      />
    </>
  )
}

/**
 * Helper function to upload files to storage
 */
async function uploadFile(
  file: File,
  folder: string,
  categoryId: string | null,
  categoryName: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', folder === 'covers' ? 'documents' : 'documents')
  formData.append('path', filePath)
  
  if (categoryId) {
    formData.append('category_id', categoryId)
    formData.append('category_name', categoryName)
  }

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Failed to upload ${folder}`)
  }

  return result.publicUrl
}
