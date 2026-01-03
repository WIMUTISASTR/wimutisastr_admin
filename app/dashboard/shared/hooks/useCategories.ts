import { useState, useCallback, useEffect } from 'react'
import type { Category } from '../types'

interface UseCategoriesReturn {
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchCategories: () => Promise<void>
}

/**
 * Custom hook to manage categories state and operations
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/categories')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setCategories(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch categories')
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
    fetchCategories,
  }
}

