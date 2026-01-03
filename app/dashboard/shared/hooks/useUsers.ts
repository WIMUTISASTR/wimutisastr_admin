import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { User } from '../types'

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/users')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users')
      }

      // API returns { data: [...], pagination: {...} }
      setUsers(result.data || [])
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
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      setUsers(users.filter(user => user.id !== userId))
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
      return false
    }
  }

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    deleteUser,
  }
}

