'use client'

import { useState, useEffect } from 'react'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
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
            onClick={() => {
              setUserToDelete({ id: row.id, email: row.email })
              setDeleteModalOpen(true)
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h4>Manage users</h4>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="rounded-xl">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        itemName={userToDelete?.email}
        isLoading={isDeleting}
      />
    </>
  )
}

