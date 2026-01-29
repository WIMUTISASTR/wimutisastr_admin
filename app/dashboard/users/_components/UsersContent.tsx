'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { Card, Badge, Button } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { User } from '../../shared/types'
import { useUsers } from '../../shared/hooks/useUsers'
import { formatDate } from '../../shared/utils'

export default function UsersContent() {
  const { users, isLoading, error, pagination, fetchUsers, deleteUser, setUsers } = useUsers()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUsers(1, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.limit)
  }

  const updateMembershipStatus = async (userId: string, status: 'pending' | 'approved' | 'denied', notes?: string) => {
    try {
      setUpdatingUserId(userId)
      const response = await apiFetch(`/api/users?id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membership_status: status,
          membership_notes: notes || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update membership status')
      }

      toast.success(`User membership ${status}!`)
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              membership_status: status,
              membership_approved_at: status === 'approved' ? new Date().toISOString() : null,
              membership_denied_at: status === 'denied' ? new Date().toISOString() : null,
            } 
          : user
      ))
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update membership status')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleStatusChange = (userId: string, status: 'pending' | 'approved' | 'denied') => {
    setOpenDropdownId(null)
    updateMembershipStatus(userId, status)
  }

  const handleDeleteClick = (user: User) => {
    setOpenDropdownId(null)
    setUserToDelete({ id: user.id, email: user.email })
    setDeleteModalOpen(true)
  }

  const toggleDropdown = (userId: string) => {
    setOpenDropdownId(openDropdownId === userId ? null : userId)
  }

  const columns = [
    {
      header: 'Email',
      accessor: 'email',
      width: '25%',
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
      header: 'Email Status',
      accessor: 'email_confirmed_at',
      width: '12%',
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
      header: 'Membership',
      accessor: 'membership_status',
      width: '13%',
      render: (value: string | undefined, row: User) => {
        const status = value || 'pending'
        if (status === 'approved') {
          return (
            <Badge variant="success" size="sm">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Approved
            </Badge>
          )
        }
        if (status === 'denied') {
          return (
            <Badge variant="error" size="sm">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              Denied
            </Badge>
          )
        }
        return (
          <Badge variant="default" size="sm">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </Badge>
        )
      },
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
      width: '12%',
      render: (value: string, row: User) => {
        const isUpdating = updatingUserId === row.id
        const membershipStatus = row.membership_status || 'pending'
        const isOpen = openDropdownId === row.id
        
        return (
          <div className="relative" ref={isOpen ? dropdownRef : null}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleDropdown(row.id)
              }}
              disabled={isUpdating}
              id={`action-button-${row.id}`}
              className={`
                inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg 
                border transition-colors
                ${isUpdating 
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                }
              `}
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Actions</span>
                  <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {isOpen && !isUpdating && (
              <div 
                className="fixed w-56 rounded-lg bg-white shadow-xl border border-slate-200"
                style={{
                  top: `${document.getElementById(`action-button-${row.id}`)?.getBoundingClientRect().bottom ?? 0}px`,
                  left: `${(document.getElementById(`action-button-${row.id}`)?.getBoundingClientRect().right ?? 0) - 224}px`,
                  marginTop: '8px',
                  zIndex: 9999
                }}
              >
                <div className="py-1">
                  {/* Membership Status Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    Membership Status
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(row.id, 'approved')
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${membershipStatus === 'approved'
                        ? 'bg-green-50 text-green-700'
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Approve Membership</span>
                    {membershipStatus === 'approved' && (
                      <svg className="w-4 h-4 ml-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(row.id, 'pending')
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${membershipStatus === 'pending'
                        ? 'bg-slate-50 text-slate-700'
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Set to Pending</span>
                    {membershipStatus === 'pending' && (
                      <svg className="w-4 h-4 ml-auto text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(row.id, 'denied')
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${membershipStatus === 'denied'
                        ? 'bg-red-50 text-red-700'
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Deny Membership</span>
                    {membershipStatus === 'denied' && (
                      <svg className="w-4 h-4 ml-auto text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100"></div>

                  {/* Delete Section */}
                  <button
            onClick={(e) => {
              e.stopPropagation()
                      handleDeleteClick(row)
            }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
                    <span className="font-medium">Delete User</span>
                  </button>
                </div>
              </div>
            )}
        </div>
        )
      },
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
        </Card>
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

