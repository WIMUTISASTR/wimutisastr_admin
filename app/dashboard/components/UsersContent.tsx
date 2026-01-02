'use client'

import { useState, useEffect } from 'react'
import DataTable from '../../components/DataTable'
import Button from '../../components/Button'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export default function UsersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Fetch users from API route
      const response = await fetch('/api/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to fetch users')
      // For demo, show empty state
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns = [
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      render: (value: string) => formatDate(value),
    },
    {
      header: 'Last Sign In',
      accessor: 'last_sign_in_at',
      render: (value: string | null) => formatDate(value),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleDeleteUser(row.id)}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

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
    } catch (err: any) {
      alert(err.message || 'Failed to delete user')
    }
  }

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Users</h2>
          <p className="text-slate-600">Manage system users</p>
        </div>
        <Button onClick={fetchUsers} variant="secondary">
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      </div>
    </>
  )
}

