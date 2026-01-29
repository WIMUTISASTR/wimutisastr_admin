import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '../api'
import type { Category } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UseCategoriesReturn {
  categories: Category[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  fetchCategories: (page?: number, limit?: number) => Promise<void>
}

/**
 * Custom hook to manage categories state and operations
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  const fetchCategories = useCallback(async (page = 1, limit = 50) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiFetch(`/api/categories?page=${page}&limit=${limit}`)
      const result = await response.json()
      
      if (response.ok && result.data) {
        setCategories(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch categories')
      }

      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories'
      setError(message)
      console.error('Error fetching categories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    error,
    pagination,
    fetchCategories,
  }
}

