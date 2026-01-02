'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import DataTable from '../../components/DataTable'
import BookUploadForm from '../../components/BookUploadForm'
import BookEditModal from '../../components/BookEditModal'
import { supabase } from '../../lib/supabase'

interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface Book {
  id: string
  title: string
  author: string
  year: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  cover_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

export default function UploadDocumentContent() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'upload' | 'list' | 'categories'>('upload')
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [openCategoryDropdownId, setOpenCategoryDropdownId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    if (activeView === 'list') {
      fetchBooks()
    } else {
      // Close dropdown when switching views
      setOpenDropdownId(null)
      setOpenCategoryDropdownId(null)
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
      
      // Fetch from API route (uses service role key, bypasses RLS)
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
      // Fallback to localStorage
      const storedBooks = localStorage.getItem('books')
      if (storedBooks) {
        setBooks(JSON.parse(storedBooks))
      }
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
      
      // Get category name for folder organization
      const category = categories.find(cat => cat.id === bookData.category_id)
      const categoryName = category?.name || 'uncategorized'

      // Upload book file to R2 storage via API route
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

      // Upload cover image if provided
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

      // Create book record
      const newBook: Book = {
        id: fileName,
        title: bookData.title,
        author: bookData.author,
        year: bookData.year,
        description: bookData.description,
        file_name: bookData.file.name,
        file_url: publicUrl,
        file_size: bookData.file.size,
        cover_url: coverUrl,
        uploaded_at: new Date().toISOString(),
      }

      // Save to Supabase database via API route (uses service role key, bypasses RLS)
      console.log('Calling /api/books to save book...')
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
      console.log('API response:', { status: response.status, result })

      if (!response.ok) {
        console.error('API error:', result)
        throw new Error(result.error || 'Failed to save book to database')
      }

      if (result.data) {
        // Successfully saved to database
        const insertedBook = result.data
        const updatedBooks = [...books, {
          id: insertedBook.id,
          title: insertedBook.title,
          author: insertedBook.author,
          year: insertedBook.year.toString(),
          description: insertedBook.description || '',
          file_name: insertedBook.file_name,
          file_url: insertedBook.file_url,
          file_size: insertedBook.file_size,
          cover_url: insertedBook.cover_url || null,
          uploaded_at: insertedBook.uploaded_at,
        }]
        setBooks(updatedBooks)
      }

      toast.success('Book uploaded successfully!')
      // Switch to list view after successful upload
      setActiveView('list')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload book')
      throw new Error(error.message || 'Failed to upload book')
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
      accessor: 'file_url',
      render: (value: string, row: Book) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenDropdownId(openDropdownId === row.id ? null : row.id)
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

          {openDropdownId === row.id && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdownId(null)}
              />
              
              {/* Dropdown menu - using fixed positioning to avoid overflow clipping */}
              <div 
                className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                ref={(el) => {
                  if (el && openDropdownId === row.id) {
                    // Find the button in the parent relative container
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
                    const description = row.description || 'No description available.'
                    toast.info(description, {
                      autoClose: 5000,
                      style: { whiteSpace: 'pre-wrap' }
                    })
                    setOpenDropdownId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(row)
                    setOpenDropdownId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-slate-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(null)
                    handleDelete(row.id)
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

  const handleDelete = async (bookId: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return

    try {
      // Delete via API route (uses service role key, bypasses RLS and handles storage deletion)
      const response = await fetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete book')
      }

      // Remove from list
      const updatedBooks = books.filter(b => b.id !== bookId)
      setBooks(updatedBooks)
      toast.success('Book deleted successfully!')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete book')
    }
  }

  // Category management functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setIsLoading(true)

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
      fetchCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setIsLoading(false)
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

  const handleCategoryDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category')
      }

      toast.success('Category deleted successfully!')
      fetchCategories()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete category')
    }
  }

  const handleNewCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', description: '' })
    setIsCategoryModalOpen(true)
  }

  const categoryColumns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (value: string) => (
        <span className="font-semibold text-slate-800">{value}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (value: string | null) => (
        <span className="text-gray-600">{value || 'No description'}</span>
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString(),
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
              
              {/* Dropdown menu - using fixed positioning to avoid overflow clipping */}
              <div 
                className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                ref={(el) => {
                  if (el && openCategoryDropdownId === row.id) {
                    // Find the button in the parent relative container
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
                    setOpenCategoryDropdownId(null)
                    handleCategoryDelete(row.id)
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
        <div>          
          <div className="overflow-x-auto overflow-y-visible">
            <DataTable
              columns={columns}
              data={books}
              isLoading={isLoading}
              emptyMessage="No books uploaded yet"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          {activeView === 'upload' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-6">Upload New Book</h3>
              <BookUploadForm
                onUpload={handleUpload}
                isLoading={isLoading}
                categories={categories}
              />
            </div>
          )}

          {activeView === 'categories' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800"></h3>
                <button
                  onClick={handleNewCategory}
                  className="px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Category
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-visible">
                <DataTable
                  columns={categoryColumns}
                  data={categories}
                  isLoading={isLoading}
                  emptyMessage="No categories created yet"
                />
              </div>
            </div>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
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
                  className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  )
}
