import { useState } from 'react'
import { toast } from 'react-toastify'
import { Book, Category } from '../types'

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBooks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/books')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch books')
      }

      if (result.data) {
        setBooks(
          result.data.map((book: any) => ({
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
          }))
        )
      }
    } catch (err: any) {
      console.error('Error fetching books:', err)
      setError(err.message || 'Failed to fetch books')
      toast.error(err.message || 'Failed to fetch books')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteBook = async (bookId: string) => {
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
      return true
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error(err.message || 'Failed to delete book')
      return false
    }
  }

  return {
    books,
    isLoading,
    error,
    fetchBooks,
    deleteBook,
    setBooks,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/categories')
      const result = await response.json()
      if (response.ok && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    categories,
    isLoading,
    fetchCategories,
  }
}

