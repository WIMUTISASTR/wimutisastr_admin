import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'
import { User } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UsersResponse {
  data: User[]
  pagination: PaginationInfo
}

export function useUsers() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  
  // Use SWR for caching and automatic revalidation
  const { data, error, isLoading, isValidating, mutate } = useSWR<UsersResponse>(
    `/api/users?page=${page}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      // Keep data fresh for 2 minutes before revalidating in background
      dedupingInterval: 2 * 60 * 1000,
    }
  )

  const users = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Wrapper for backwards compatibility
  const fetchUsers = useCallback(async (newPage = 1, newLimit = 20) => {
    setPage(newPage)
    setLimit(newLimit)
    // SWR will automatically fetch with new params
  }, [])

  // Optimistic update for better UX
  const setUsers = useCallback((newUsers: User[] | ((prev: User[]) => User[])) => {
    mutate(
      (current) => {
        if (!current) return current
        const updatedUsers = typeof newUsers === 'function' ? newUsers(current.data) : newUsers
        return { ...current, data: updatedUsers }
      },
      { revalidate: false }
    )
  }, [mutate])

  const deleteUser = async (userId: string) => {
    try {
      // Optimistic update - remove user immediately from UI
      const previousData = data
      mutate(
        (current) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.filter(user => user.id !== userId)
          }
        },
        { revalidate: false }
      )

      const response = await apiFetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        // Rollback on error
        mutate(previousData, { revalidate: false })
        throw new Error(result.error || 'Failed to delete user')
      }

      notify.success('អ្នកប្រើប្រាស់ត្រូវបានលុបដោយជោគជ័យ!')
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'លុបអ្នកប្រើប្រាស់មិនជោគជ័យ។'
      notify.error(message)
      return false
    }
  }

  return {
    users,
    setUsers,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    pagination,
    fetchUsers,
    deleteUser,
    refetch: () => mutate(),
  }
}

