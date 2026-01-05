'use client'

import { useState, useEffect } from 'react'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { Card, Badge, Button } from '../../../components/ui'
import { User } from '../../shared/types'
import { useUsers } from '../../shared/hooks/useUsers'
import { formatDate } from '../../shared/utils'

export default function UsersContent() {
  const { users, isLoading, error, pagination, fetchUsers, deleteUser } = useUsers()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchUsers(1, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.limit)
  }

  const columns = [
    {
      header: 'Email',
      accessor: 'email',
      width: '35%',
      render: (value: string, row: User) => (
        <div className="flex items-center gap-3">
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
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              setUserToDelete({ id: row.id, email: row.email })
              setDeleteModalOpen(true)
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
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
        {!isLoading && users.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
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

