import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { fetcher, swrConfig } from '../swr-config'
import type { Category } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CategoriesResponse {
  data: Category[]
  pagination: PaginationInfo
}

interface UseCategoriesReturn {
  categories: Category[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo
  fetchCategories: (page?: number, limit?: number) => void
  refetch: () => void
}

/**
 * Custom hook to manage categories state and operations with SWR caching
 */
export function useCategories(): UseCategoriesReturn {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const { data, error, isLoading, isValidating, mutate } = useSWR<CategoriesResponse>(
    `/api/categories?page=${page}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes for categories (rarely change)
    }
  )

  const categories = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }

  const fetchCategories = useCallback((newPage = 1, newLimit = 50) => {
    setPage(newPage)
    setLimit(newLimit)
  }, [])

  return {
    categories,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    pagination,
    fetchCategories,
    refetch: () => mutate(),
  }
}

