import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'
import type { Book } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BooksResponse {
  data: Book[]
  pagination: PaginationInfo
}

interface UseBooksReturn {
  books: Book[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  fetchBooks: (page?: number, limit?: number) => void
  updateBook: (book: Book) => void
  deleteBook: (bookId: string) => Promise<boolean>
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void
  refetch: () => void
}

/**
 * Custom hook to manage books state and operations with SWR caching
 */
export function useBooks(): UseBooksReturn {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data, error, isLoading, isValidating, mutate } = useSWR<BooksResponse>(
    `/api/books?page=${page}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  const books = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  const fetchBooks = useCallback((newPage = 1, newLimit = 20) => {
    setPage(newPage)
    setLimit(newLimit)
  }, [])

  const setBooks = useCallback((newBooks: Book[] | ((prev: Book[]) => Book[])) => {
    mutate(
      (current) => {
        if (!current) return current
        const updatedBooks = typeof newBooks === 'function' ? newBooks(current.data) : newBooks
        return { ...current, data: updatedBooks }
      },
      { revalidate: false }
    )
  }, [mutate])

  const updateBook = useCallback((updatedBook: Book) => {
    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.map(b => b.id === updatedBook.id ? updatedBook : b)
        }
      },
      { revalidate: false }
    )
  }, [mutate])

  const deleteBook = useCallback(async (bookId: string): Promise<boolean> => {
    const previousData = data
    
    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.filter(b => b.id !== bookId)
        }
      },
      { revalidate: false }
    )

    try {
      const response = await apiFetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        mutate(previousData, { revalidate: false })
        throw new Error(result.error || 'Failed to delete book')
      }

      notify.success('ឯកសារត្រូវបានលុបដោយជោគជ័យ!')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'លុបឯកសារមិនជោគជ័យ។'
      console.error('Error deleting book:', err)
      notify.error(message)
      return false
    }
  }, [data, mutate])

  return {
    books,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    pagination,
    fetchBooks,
    updateBook,
    deleteBook,
    setBooks,
    refetch: () => mutate(),
  }
}
