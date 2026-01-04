import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import type { Book } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UseBooksReturn {
  books: Book[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  fetchBooks: (page?: number, limit?: number) => Promise<void>
  updateBook: (book: Book) => void
  deleteBook: (bookId: string) => Promise<boolean>
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>
}

/**
 * Custom hook to manage books state and operations
 */
export function useBooks(): UseBooksReturn {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchBooks = useCallback(async (page = 1, limit = 20) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/books?page=${page}&limit=${limit}`)
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

      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch books'
      setError(message)
      console.error('Error fetching books:', err)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateBook = useCallback((updatedBook: Book) => {
    setBooks(prevBooks => prevBooks.map(b => b.id === updatedBook.id ? updatedBook : b))
  }, [])

  const deleteBook = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete book')
      }

      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId))
      toast.success('Book deleted successfully!')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete book'
      console.error('Error deleting book:', err)
      toast.error(message)
      return false
    }
  }, [])

  return {
    books,
    isLoading,
    error,
    pagination,
    fetchBooks,
    updateBook,
    deleteBook,
    setBooks,
  }
}
