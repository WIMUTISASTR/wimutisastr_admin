'use client'

import { useState, useEffect, useMemo } from 'react'
import { notify } from '@/lib/utils/notify'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { Card, Badge, Button, UIIcons } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { User } from '../../shared/types'
import { useUsers } from '../../shared/hooks/useUsers'
import { useDropdown } from '../../shared/hooks/useDropdown'
import { formatDate } from '../../shared/utils'

type MembershipFilter = 'all' | 'pending' | 'approved' | 'denied'

const MEMBERSHIP_LABELS: Record<'pending' | 'approved' | 'denied', string> = {
  approved: 'បានទទួល',
  pending: 'រង់ចាំ',
  denied: 'បដិសេធ',
}

function membershipBadgeVariant(status: string): 'success' | 'warning' | 'error' {
  if (status === 'approved') return 'success'
  if (status === 'denied') return 'error'
  return 'warning'
}

function UserActionsMenu({
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
  const { isOpen, toggle, close, dropdownRef } = useDropdown()
  const status = row.membership_status || 'pending'

  if (isUpdating) {
    return (
      <Button variant="secondary" size="sm" isLoading disabled className="transform-none">
        កំពុងធ្វើ…
      </Button>
    )
  }

  const menuItems: { status: 'pending' | 'approved' | 'denied'; activeClass: string; dotClass: string }[] = [
    { status: 'approved', activeClass: 'bg-emerald-50 text-emerald-700 font-semibold', dotClass: 'bg-emerald-500' },
    { status: 'pending', activeClass: 'bg-amber-50 text-amber-700 font-semibold', dotClass: 'bg-amber-500' },
    { status: 'denied', activeClass: 'bg-red-50 text-red-700 font-semibold', dotClass: 'bg-red-500' },
  ]

  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <Button
        variant="secondary"
        size="sm"
        onClick={toggle}
        className="transform-none"
        aria-label="សកម្មភាពអ្នកប្រើ"
        aria-expanded={isOpen}
      >
        <UIIcons.DotsVertical className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {menuItems.map((item) => (
            <button
              key={item.status}
              type="button"
              onClick={() => {
                onStatusChange(row.id, item.status)
                close()
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors cursor-pointer ${
                status === item.status ? item.activeClass : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${status === item.status ? item.dotClass : 'bg-slate-300'}`}
              />
              {MEMBERSHIP_LABELS[item.status]}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              onDeleteClick(row)
              close()
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <UIIcons.Delete className="w-4 h-4 shrink-0" />
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
  const [statusFilter, setStatusFilter] = useState<MembershipFilter>('all')

  useEffect(() => {
    fetchUsers(1, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.limit)
  }

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'all') return users
    return users.filter((user) => (user.membership_status || 'pending') === statusFilter)
  }, [users, statusFilter])

  const stats = useMemo(
    () => ({
      total: pagination.total,
      approved: users.filter((u) => u.membership_status === 'approved').length,
      pending: users.filter((u) => (u.membership_status || 'pending') === 'pending').length,
      denied: users.filter((u) => u.membership_status === 'denied').length,
    }),
    [users, pagination.total]
  )

  const updateMembershipStatus = async (
    userId: string,
    status: 'pending' | 'approved' | 'denied',
    notes?: string
  ) => {
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
        throw new Error(result.error || 'ធ្វើបច្ចុប្បន្នភាពស្ថានភាពសមាជិកមិនជោគជ័យ។')
      }

      const statusLabels: Record<'pending' | 'approved' | 'denied', string> = {
        approved: 'បានអនុម័ត',
        denied: 'បានបដិសេធ',
        pending: 'កំពុងរង់ចាំ',
      }
      notify.success(`ស្ថានភាពសមាជិកអ្នកប្រើប្រាស់ ${statusLabels[status]}!`)

      const updatedProfile = (result.data as Partial<User> | null) || null
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                membership_status: updatedProfile?.membership_status ?? status,
                membership_approved_at: updatedProfile?.membership_approved_at ?? null,
                membership_denied_at: updatedProfile?.membership_denied_at ?? null,
                membership_ends_at: updatedProfile?.membership_ends_at ?? null,
              }
            : user
        )
      )
    } catch (error: unknown) {
      console.error('Update error:', error)
      const message = error instanceof Error ? error.message : 'ធ្វើបច្ចុប្បន្នភាពស្ថានភាពសមាជិកមិនជោគជ័យ។'
      notify.error(message)
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
        <div>
          <div className="font-medium text-slate-900 text-sm">
            {typeof value === 'string' ? value : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">លេខសម្គាល់: {row.id.slice(0, 8)}…</div>
        </div>
      ),
    },
    {
      header: 'សមាជិកភាព',
      accessor: 'membership_status',
      width: '13%',
      render: (value: unknown) => {
        const status = value === 'approved' || value === 'denied' ? value : 'pending'
        return (
          <Badge variant={membershipBadgeVariant(status)} size="md">
            {MEMBERSHIP_LABELS[status]}
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
              {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      },
    },
    {
      header: 'ចូលចុងក្រោយ',
      accessor: 'last_sign_in_at',
      width: '20%',
      render: (value: unknown) =>
        typeof value === 'string' && value ? (
          <div>
            <div className="text-sm text-slate-900">{formatDate(value)}</div>
            <div className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">មិនធ្លាប់</span>
        ),
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '7%',
      render: (_value: unknown, row: User) => (
        <UserActionsMenu
          row={row}
          isUpdating={updatingUserId === row.id}
          onStatusChange={handleStatusChange}
          onDeleteClick={handleDeleteClick}
        />
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
    } catch {
      // Error is handled by the hook
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteUserCancel = () => {
    if (isDeleting) return
    setDeleteModalOpen(false)
    setUserToDelete(null)
  }

  return (
    <>
      <PageHeader
        title="គ្រប់គ្រងអ្នកប្រើ"
        description="មើល និងគ្រប់គ្រងអ្នកប្រើប្រាស់ ស្ថានភាពសមាជិកភាព និងការចូលប្រើ"
      />

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-800 mb-1">កំហុសក្នុងការផ្ទុកអ្នកប្រើ</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'សរុប', value: stats.total, accent: 'border-l-navy-600', valueClass: 'text-slate-900' },
          { label: 'បានទទួល', value: stats.approved, accent: 'border-l-emerald-500', valueClass: 'text-emerald-700' },
          { label: 'រង់ចាំ', value: stats.pending, accent: 'border-l-amber-500', valueClass: 'text-amber-700' },
          { label: 'បដិសេធ', value: stats.denied, accent: 'border-l-red-500', valueClass: 'text-red-700' },
        ].map((stat) => (
          <Card key={stat.label} padding="md" className={`border-l-4 ${stat.accent}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-bold font-heading tabular-nums mt-1 ${stat.valueClass}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'approved', 'pending', 'denied'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                statusFilter === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f === 'all'
                ? 'ទាំងអស់'
                : f === 'approved'
                  ? 'បានទទួល'
                  : f === 'pending'
                    ? 'រង់ចាំ'
                    : 'បដិសេធ'}
            </button>
          ))}
        </div>
      </Card>

      <Card padding="none">
        <DataTable<User>
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
          emptyMessage={
            statusFilter === 'all' ? 'រកមិនឃើញអ្នកប្រើ' : 'រកមិនឃើញអ្នកប្រើសម្រាប់តម្រងនេះ'
          }
          emptyDescription={
            statusFilter === 'all'
              ? 'មិនទាន់មានអ្នកប្រើដែលបានចុះឈ្មោះក្នុងប្រព័ន្ធ។'
              : 'ព្យាយាមជ្រើសតម្រងផ្សេង ឬរង់ចាំអ្នកប្រើថ្មី។'
          }
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
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
        title="លុបអ្នកប្រើ"
        message="តើអ្នកប្រាកដថាចង់លុបអ្នកប្រើនេះទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញ ហើយទិន្នន័យទាំងអស់នឹងត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍។"
        itemName={userToDelete?.email}
        isLoading={isDeleting}
      />
    </>
  )
}
