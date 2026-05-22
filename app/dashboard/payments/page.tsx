'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/layout'
import { Card, Badge } from '../../components/ui'
import { DataTable, Pagination } from '../../components/data-display'
import { usePaymentProofs } from '../shared/hooks/usePaymentProofs'
import { PaymentProof } from '../shared/types'

export default function TransactionsPage() {
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

  const stats = {
    total: pagination.total,
    verified: proofs.filter(p => p.status === 'verified').length,
    pending: proofs.filter(p => p.status === 'pending').length,
    rejected: proofs.filter(p => p.status === 'rejected').length,
  }

  const columns = [
    {
      header: 'អ្នកប្រើ',
      accessor: 'user',
      width: '22%',
      render: (value: unknown) => {
        const user = value as PaymentProof['user'] | null | undefined
        return (
          <div>
            <div className="font-medium text-slate-900 text-sm">{user?.email || '—'}</div>
            {user?.membership_status && (
              <div className="mt-1">
                <Badge
                  variant={
                    user.membership_status === 'approved' ? 'success' :
                    user.membership_status === 'denied' ? 'error' : 'warning'
                  }
                  size="sm"
                >
                  {user.membership_status === 'approved' ? 'សមាជិក' : user.membership_status === 'denied' ? 'បានបដិសេធ' : 'រង់ចាំ'}
                </Badge>
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'គម្រោង',
      accessor: 'subscription_plan',
      width: '16%',
      render: (value: unknown, row: PaymentProof) => {
        const plan = value as PaymentProof['subscription_plan'] | null | undefined
        if (plan) {
          return (
            <div>
              <div className="font-medium text-slate-900 text-sm">{plan.name}</div>
              <div className="text-xs text-slate-500">${plan.price} · {plan.duration_days} days</div>
            </div>
          )
        }
        return <span className="text-sm text-slate-500">{row.plan_id || '—'}</span>
      },
    },
    {
      header: 'ចំនួន',
      accessor: 'amount',
      width: '9%',
      render: (value: unknown) => (
        <span className="font-semibold text-slate-900 text-sm">
          {value != null ? `$${Number(value).toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      header: 'វិធីទូទាត់',
      accessor: 'file_type',
      width: '12%',
      render: (value: unknown) => {
        const isBaray = value === 'baray'
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isBaray ? 'text-blue-700' : 'text-slate-600'}`}>
            {isBaray ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Baray Online
              </>
            ) : 'Manual'}
          </span>
        )
      },
    },
    {
      header: 'ស្ថានភាព',
      accessor: 'status',
      width: '12%',
      render: (value: unknown) => {
        const status = value as 'pending' | 'verified' | 'rejected'
        return (
          <Badge
            variant={status === 'verified' ? 'success' : status === 'rejected' ? 'error' : 'warning'}
            size="md"
          >
            {status === 'verified' ? 'បានទូទាត់' : status === 'rejected' ? 'បដិសេធ' : 'រង់ចាំ'}
          </Badge>
        )
      },
    },
    {
      header: 'ថ្ងៃទូទាត់',
      accessor: 'uploaded_at',
      width: '13%',
      render: (value: unknown) => {
        if (typeof value !== 'string') return <span className="text-sm text-slate-400">—</span>
        return (
          <div>
            <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: 'សមាជិកភាព',
      accessor: 'membership_ends_at',
      width: '16%',
      render: (value: unknown, row: PaymentProof) => {
        if (!row.membership_starts_at || !value) return <span className="text-sm text-slate-400">—</span>
        const start = new Date(row.membership_starts_at).toLocaleDateString()
        const end = new Date(value as string).toLocaleDateString()
        const isActive = new Date(value as string) > new Date()
        return (
          <div className="text-xs text-slate-600">
            <div>{start}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {end}
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="ប្រវត្តិការទូទាត់"
        description="ទិន្នន័យការទូទាត់របស់អ្នកប្រើទាំងអស់"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'សរុប', value: stats.total, accent: 'border-l-navy-600', valueClass: 'text-slate-900' },
          { label: 'បានទូទាត់', value: stats.verified, accent: 'border-l-emerald-500', valueClass: 'text-emerald-700' },
          { label: 'រង់ចាំ', value: stats.pending, accent: 'border-l-amber-500', valueClass: 'text-amber-700' },
          { label: 'បដិសេធ', value: stats.rejected, accent: 'border-l-red-500', valueClass: 'text-red-700' },
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
          {(['all', 'verified', 'pending', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                statusFilter === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'ទាំងអស់' : f === 'verified' ? 'បានទូទាត់' : f === 'pending' ? 'រង់ចាំ' : 'បដិសេធ'}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <DataTable<PaymentProof>
          columns={columns}
          data={proofs}
          isLoading={isLoading}
          emptyMessage="រកមិនឃើញប្រវត្តិការទូទាត់"
          emptyDescription="ការទូទាត់នឹងបង្ហាញនៅទីនេះនៅពេលអ្នកប្រើបង់ប្រាក់"
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
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
