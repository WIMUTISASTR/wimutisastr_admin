'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import BookUploadForm from './BookUploadForm'
import BookEditModal from './BookEditModal'
import BookList from './BookList'
import CategoryManagement from './BookCategoryManagement'
import { Book, Category } from '../../shared/types'

export default function BooksContent() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'upload' | 'list' | 'categories'>('upload')
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
    if (activeView === 'list') {
      fetchBooks()
    }
  }, [activeView])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (response.ok && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBooks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/books')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch books')
      }

      if (result.data) {
        setBooks(result.data.map((book: any) => ({
          id: book.id,
          title: book.title,
          author: book.author,
          year: book.year.toString(),
          description: book.description || '',
          file_name: book.file_name,
          file_url: book.file_url,
          file_size: book.file_size,
          cover_url: book.cover_url || null,
          uploaded_at: book.uploaded_at,
          category_id: book.category_id || null,
          category: book.category || null,
        })))
      }
    } catch (error: any) {
      console.error('Error fetching books:', error)
      toast.error(error.message || 'Failed to fetch books')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (bookData: { title: string; author: string; year: string; description: string; file: File | null; cover: File | null; category_id: string | null }) => {
    if (!bookData.file) {
      throw new Error('File is required')
    }

    try {
      setIsLoading(true)
      
      const category = categories.find(cat => cat.id === bookData.category_id)
      const categoryName = category?.name || 'uncategorized'

      const fileExt = bookData.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `documents/${fileName}`

      const fileFormData = new FormData()
      fileFormData.append('file', bookData.file)
      fileFormData.append('bucket', 'documents')
      fileFormData.append('path', filePath)
      if (bookData.category_id) {
        fileFormData.append('category_id', bookData.category_id)
        fileFormData.append('category_name', categoryName)
      }

      const fileUploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: fileFormData,
      })

      const fileUploadResult = await fileUploadResponse.json()

      if (!fileUploadResponse.ok) {
        throw new Error(fileUploadResult.error || 'Failed to upload file')
      }

      const publicUrl = fileUploadResult.publicUrl

      let coverUrl: string | null = null
      if (bookData.cover) {
        const coverExt = bookData.cover.name.split('.').pop()
        const coverFileName = `cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${coverExt}`
        const coverPath = `covers/${coverFileName}`

        const coverFormData = new FormData()
        coverFormData.append('file', bookData.cover)
        coverFormData.append('bucket', 'documents')
        coverFormData.append('path', coverPath)
        if (bookData.category_id) {
          coverFormData.append('category_id', bookData.category_id)
          coverFormData.append('category_name', categoryName)
        }

        const coverUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (!coverUploadResponse.ok) {
          console.warn('Failed to upload cover:', coverUploadResult.error)
        } else {
          coverUrl = coverUploadResult.publicUrl
        }
      }

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
          year: bookData.year,
          description: bookData.description || null,
          file_name: bookData.file.name,
          file_url: publicUrl,
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
      fetchBooks()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload book')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setIsEditModalOpen(true)
  }

  const handleUpdate = (updatedBook: Book) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b))
    setEditingBook(null)
    setIsEditModalOpen(false)
  }

  const handleDelete = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete book')
      }

      setBooks(books.filter(b => b.id !== bookId))
      toast.success('Book deleted successfully!')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete book')
    }
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveView('upload')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'upload'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Upload Book
            {activeView === 'upload' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'categories'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Book Categories
            {activeView === 'categories' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'list'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Book List
            {activeView === 'list' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeView === 'list' ? (
        <BookList
          books={books}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div className="rounded-xl">
          {activeView === 'upload' && (
            <div>
              <BookUploadForm
                onUpload={handleUpload}
                isLoading={isLoading}
                categories={categories}
              />
            </div>
          )}

          {activeView === 'categories' && (
            <CategoryManagement
              categories={categories}
              isLoading={isLoading}
              onRefresh={fetchCategories}
            />
          )}
        </div>
      )}

      {/* Edit Book Modal */}
      <BookEditModal
        book={editingBook}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingBook(null)
        }}
        onUpdate={handleUpdate}
        categories={categories}
      />

    </>
  )
}
