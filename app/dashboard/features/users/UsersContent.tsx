'use client'

import { useState, useEffect } from 'react'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Badge from '../../../components/Badge'
import { User } from '../../shared/types'
import { useUsers } from '../../shared/hooks/useUsers'
import { formatDate } from '../../shared/utils'

export default function UsersContent() {
  const { users, isLoading, error, fetchUsers, deleteUser } = useUsers()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = [
    {
      header: 'Email',
      accessor: 'email',
      width: '35%',
      render: (value: string, row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {value?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-slate-900">{value || 'N/A'}</div>
            <div className="text-xs text-slate-500">User ID: {row.id.slice(0, 8)}...</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'email_confirmed_at',
      width: '15%',
      render: (value: string | null) => (
        value ? (
          <Badge variant="success" size="sm">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Pending
          </Badge>
        )
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      width: '20%',
      render: (value: string) => (
        <div>
          <div className="text-sm text-slate-900">{formatDate(value)}</div>
          <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString()}</div>
        </div>
      ),
    },
    {
      header: 'Last Sign In',
      accessor: 'last_sign_in_at',
      width: '20%',
      render: (value: string | null) => (
        value ? (
          <div>
            <div className="text-sm text-slate-900">{formatDate(value)}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString()}</div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Never</span>
        )
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '10%',
      render: (value: string, row: User) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setUserToDelete({ id: row.id, email: row.email })
              setDeleteModalOpen(true)
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      ),
    },
  ]

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return

    try {
      setIsDeleting(true)
      const success = await deleteUser(userToDelete.id)
      if (success) {
        setDeleteModalOpen(false)
        setUserToDelete(null)
      }
    } catch (err: any) {
      // Error is handled by the hook
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteUserCancel = () => {
    setDeleteModalOpen(false)
    setUserToDelete(null)
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage and monitor all registered users"
        breadcrumbs={[
          { label: 'Dashboard' },
          { label: 'Users' },
        ]}
      />

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-800 mb-1">Error Loading Users</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card padding="md" hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Verified</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.email_confirmed_at).length}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md" hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => !u.email_confirmed_at).length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card padding="none">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found"
          emptyDescription="There are no registered users in the system yet."
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          hoverable
        />
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone and all user data will be permanently removed."
        itemName={userToDelete?.email}
        isLoading={isDeleting}
      />
    </>
  )
}

