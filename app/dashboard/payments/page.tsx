'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button } from '../../components/ui'
import { DataTable, Pagination } from '../../components/data-display'
import { usePaymentProofs } from '../shared/hooks/usePaymentProofs'
import { PaymentProof } from '../shared/types'

export default function PaymentsPage() {
  const router = useRouter()
  const { proofs, isLoading, pagination, fetchProofs } = usePaymentProofs()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all')

  useEffect(() => {
    const filter = statusFilter === 'all' ? undefined : statusFilter
    fetchProofs(1, 20, filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handlePageChange = (page: number) => {
    const filter = statusFilter === 'all' ? undefined : statusFilter
    fetchProofs(page, pagination.limit, filter)
  }

  const handleViewProof = (proof: PaymentProof) => {
    router.push(`/dashboard/payments/${proof.id}`)
  }

  const columns = [
    {
      header: 'User',
      accessor: 'user',
      width: '25%',
      render: (value: unknown) => {
        const user = value as PaymentProof['user'] | null | undefined
        return (
          <div>
            <div className="font-medium text-slate-900">
              {user?.email || 'Unknown'}
            </div>
            {user?.membership_status && (
              <div className="mt-1">
                <Badge 
                  variant={
                    user.membership_status === 'approved' ? 'success' :
                    user.membership_status === 'denied' ? 'error' :
                    'warning'
                  }
                  size="sm"
                >
                  {user.membership_status}
                </Badge>
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Reference',
      accessor: 'payment_reference',
      width: '18%',
      render: (value: unknown) => (
        <div className="font-mono text-sm text-slate-700">{typeof value === 'string' ? value : '-'}</div>
      ),
    },
    {
      header: 'Plan',
      accessor: 'subscription_plan',
      width: '15%',
      render: (value: unknown, row: PaymentProof) => {
        const plan = value as PaymentProof['subscription_plan'] | null | undefined
        if (plan) {
          return (
            <div>
              <div className="font-medium text-slate-900">{plan.name}</div>
              <div className="text-xs text-slate-500">
                ${plan.price} · {plan.duration_days} days
              </div>
            </div>
          )
        }
        // Fallback to legacy plan_id if subscription_plan is not available
        return (
          <Badge variant="default" size="sm">
            {row.plan_id}
          </Badge>
        )
      },
    },
    {
      header: 'Amount',
      accessor: 'amount',
      width: '10%',
      render: (value: unknown) => (
        <div className="font-semibold text-slate-900">
          {typeof value === 'string' || typeof value === 'number' ? `$${value}` : '-'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      width: '10%',
      render: (value: unknown) => {
        const variants = {
          pending: 'warning' as const,
          verified: 'success' as const,
          rejected: 'error' as const,
        }
        const status = value === 'verified' || value === 'rejected' ? value : 'pending'
        return (
          <Badge variant={variants[status]} size="md">
            {status}
          </Badge>
        )
      },
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      width: '12%',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">-</span>
        }
        return (
          <div>
            <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '15%',
      render: (_value: unknown, row: PaymentProof) => (
        <Button
          variant="secondary"
          size="sm"
          className="transform-none"
          onClick={(e) => {
            e.stopPropagation()
            handleViewProof(row)
          }}
        >
          View Proof
        </Button>
      ),
    },
  ]

  // Calculate stats
  const stats = {
    total: pagination.total,
    pending: proofs.filter(p => p.status === 'pending').length,
    verified: proofs.filter(p => p.status === 'verified').length,
    rejected: proofs.filter(p => p.status === 'rejected').length,
  }

  return (
    <>
      <PageHeader title="Payment Proofs" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card padding="md" className="bg-linear-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md" className="bg-linear-to-br from-yellow-50 to-white border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md" className="bg-linear-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Verified</p>
              <p className="text-3xl font-bold text-green-700">{stats.verified}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md" className="bg-linear-to-br from-red-50 to-white border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Rejected</p>
              <p className="text-3xl font-bold text-red-700">{stats.rejected}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Payment Proofs Table */}
      <Card padding="none">
        <DataTable<PaymentProof>
          columns={columns}
          data={proofs}
          isLoading={isLoading}
          emptyMessage="No payment proofs found"
          emptyDescription="Payment proofs will appear here once users submit them"
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          onRowClick={(proof) => handleViewProof(proof as PaymentProof)}
          hoverable
        />
        {!isLoading && proofs.length > 0 && (
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

    </>
  )
}
