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
      header: 'អ្នកប្រើ',
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
      header: 'លេខយោង',
      accessor: 'payment_reference',
      width: '18%',
      render: (value: unknown) => (
        <div className="font-mono text-sm text-slate-700">{typeof value === 'string' ? value : '-'}</div>
      ),
    },
    {
      header: 'គម្រោង',
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
      header: 'ចំនួនទឹកប្រាក់',
      accessor: 'amount',
      width: '10%',
      render: (value: unknown) => (
        <div className="font-semibold text-slate-900">
          {typeof value === 'string' || typeof value === 'number' ? `$${value}` : '-'}
        </div>
      ),
    },
    {
      header: 'ស្ថានភាព',
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
            {status === 'verified' ? 'បានផ្ទៀងផ្ទាត់' : status === 'rejected' ? 'បានបដិសេធ' : 'កំពុងរង់ចាំ'}
          </Badge>
        )
      },
    },
    {
      header: 'ថ្ងៃបញ្ចូល',
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
      header: 'សកម្មភាព',
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
          មើលភស្តុតាង
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
      <PageHeader
        title="ភស្តុតាងការបង់ប្រាក់"
        description="ត្រួតពិនិត្យ និងផ្ទៀងផ្ទាត់ការដាក់ស្នើការបង់ប្រាក់របស់អ្នកប្រើ"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: 'សរុប', value: stats.total, accent: 'border-l-navy-600', valueClass: 'text-slate-900' },
          { label: 'កំពុងរង់ចាំ', value: stats.pending, accent: 'border-l-amber-500', valueClass: 'text-amber-700' },
          { label: 'បានផ្ទៀងផ្ទាត់', value: stats.verified, accent: 'border-l-emerald-500', valueClass: 'text-emerald-700' },
          { label: 'បានបដិសេធ', value: stats.rejected, accent: 'border-l-red-500', valueClass: 'text-red-700' },
        ].map((stat) => (
          <Card key={stat.label} padding="md" className={`border-l-4 ${stat.accent}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-bold font-heading tabular-nums mt-1 ${stat.valueClass}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 cursor-pointer
                ${
                  statusFilter === filter
                    ? 'bg-navy-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                }
              `}
            >
              {filter === 'all' ? 'ទាំងអស់' : filter === 'pending' ? 'កំពុងរង់ចាំ' : filter === 'verified' ? 'បានផ្ទៀងផ្ទាត់' : 'បានបដិសេធ'}
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
          emptyMessage="រកមិនឃើញភស្តុតាងការបង់ប្រាក់"
          emptyDescription="ភស្តុតាងការបង់ប្រាក់នឹងបង្ហាញនៅទីនេះ នៅពេលអ្នកប្រើដាក់ស្នើ"
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
