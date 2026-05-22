'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { Card, Badge } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { User } from '../../shared/types'
import { useUsers } from '../../shared/hooks/useUsers'
import { formatDate } from '../../shared/utils'

function ActionDropdown({
  row,
  isUpdating,
  onStatusChange,
  onDeleteClick,
}: {
  row: User
  isUpdating: boolean
  onStatusChange: (id: string, status: 'pending' | 'approved' | 'denied') => void
  onDeleteClick: (user: User) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, ref])

  const status = row.membership_status || 'pending'

  if (isUpdating) {
    return (
      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>កំពុងធ្វើ...</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={(el) => { ref.current = el }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      >
        សកម្មភាព
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          <button
            onClick={() => { onStatusChange(row.id, 'approved'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              status === 'approved' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            បានទទួល
          </button>
          <button
            onClick={() => { onStatusChange(row.id, 'pending'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              status === 'pending' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'pending' ? 'bg-amber-500' : 'bg-slate-300'}`} />
            រង់ចាំ
          </button>
          <button
            onClick={() => { onStatusChange(row.id, 'denied'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              status === 'denied' ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'denied' ? 'bg-red-500' : 'bg-slate-300'}`} />
            បដិសេធ
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => { onDeleteClick(row); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full shrink-0 bg-red-400" />
            លុប
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersContent() {
  const { users, isLoading, error, pagination, fetchUsers, deleteUser, setUsers } = useUsers()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers(1, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const updatedProfile = (result.data as Partial<User> | null) || null
      setUsers(users.map(user =>
        user.id === userId
          ? {
              ...user,
              membership_status: updatedProfile?.membership_status ?? status,
              membership_approved_at: updatedProfile?.membership_approved_at ?? null,
              membership_denied_at: updatedProfile?.membership_denied_at ?? null,
              membership_ends_at: updatedProfile?.membership_ends_at ?? null,
            }
          : user
      ))
    } catch (error: unknown) {
      console.error('Update error:', error)
      const message = error instanceof Error ? error.message : 'Failed to update membership status'
      toast.error(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleStatusChange = (userId: string, status: 'pending' | 'approved' | 'denied') => {
    updateMembershipStatus(userId, status)
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete({ id: user.id, email: user.email })
    setDeleteModalOpen(true)
  }

  const columns = [
    {
      header: 'អ៊ីមែល',
      accessor: 'email',
      width: '25%',
      render: (value: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium text-slate-900">{typeof value === 'string' ? value : 'N/A'}</div>
            <div className="text-xs text-slate-500">លេខសម្គាល់: {row.id.slice(0, 8)}...</div>
          </div>
        </div>
      ),
    },   
    {
      header: 'សមាជិកភាព',
      accessor: 'membership_status',
      width: '13%',
      render: (value: unknown) => {
        const status = value === 'approved' || value === 'denied' ? value : 'pending'
        if (status === 'approved') {
          return (
            <Badge variant="success" size="sm">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              បានទទួល
            </Badge>
          )
        }
        if (status === 'denied') {
          return (
            <Badge variant="error" size="sm">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              បានបដិសេធ
            </Badge>
          )
        }
        return (
          <Badge variant="default" size="sm">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            កំពុងរង់ចាំ
          </Badge>
        )
      },
    },
    {
      header: 'អស់សុពលភាព',
      accessor: 'membership_ends_at',
      width: '15%',
      render: (value: unknown) => {
        if (typeof value !== 'string' || !value) return <span className="text-sm text-slate-400">—</span>
        const ms = Date.parse(value)
        const isExpired = Number.isFinite(ms) && ms <= Date.now()
        return (
          <div>
            <div className={`text-sm ${isExpired ? 'text-red-700 font-semibold' : 'text-slate-900'}`}>
              {formatDate(value)}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString()}
              {isExpired ? ' (អស់សុពលភាព)' : ''}
            </div>
          </div>
        )
      },
    },
    {
      header: 'ថ្ងៃចុះឈ្មោះ',
      accessor: 'created_at',
      width: '20%',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">—</span>
        }
        return (
          <div>
            <div className="text-sm text-slate-900">{formatDate(value)}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      header: 'ចូលចុងក្រោយ',
      accessor: 'last_sign_in_at',
      width: '20%',
      render: (value: unknown) => (
        typeof value === 'string' && value ? (
          <div>
            <div className="text-sm text-slate-900">{formatDate(value)}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString()}</div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">មិនធ្លាប់</span>
        )
      ),
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '16%',
      render: (_value: unknown, row: User) => {
        return (
          <ActionDropdown
            row={row}
            isUpdating={updatingUserId === row.id}
            onStatusChange={handleStatusChange}
            onDeleteClick={handleDeleteClick}
          />
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
    } catch {
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
        title="គ្រប់គ្រងអ្នកប្រើ"
      />

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-800 mb-1">កំហុសក្នុងការផ្ទុកអ្នកប្រើ</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <Card padding="none">
        <DataTable<User>
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="រកមិនឃើញអ្នកប្រើ"
          emptyDescription="មិនទាន់មានអ្នកប្រើដែលបានចុះឈ្មោះក្នុងប្រព័ន្ធ។"
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
        title="លុបអ្នកប្រើ"
        message="តើអ្នកប្រាកដថាចង់លុបអ្នកប្រើនេះទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញ ហើយទិន្នន័យទាំងអស់នឹងត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍។"
        itemName={userToDelete?.email}
        isLoading={isDeleting}
      />
    </>
  )
}

