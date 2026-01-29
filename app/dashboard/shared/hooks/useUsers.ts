import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../api'
import { User } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchUsers = useCallback(async (page = 1, limit = 20) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiFetch(`/api/users?page=${page}&limit=${limit}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users')
      }

      // API returns { data: [...], pagination: {...} }
      setUsers(result.data || [])
      
      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to fetch users')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteUser = async (userId: string) => {
    try {
      const response = await apiFetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      setUsers(users.filter(user => user.id !== userId))
      toast.success('User deleted successfully!')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
      return false
    }
  }

  return {
    users,
    setUsers,
    isLoading,
    error,
    pagination,
    fetchUsers,
    deleteUser,
  }
}

