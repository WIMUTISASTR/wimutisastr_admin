'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '../../../components/layout'
import { Card, Badge } from '../../../components/ui'
import StatsCard from '../../../components/data-display/StatsCard'
import { usePaymentRevenue } from '../../shared/hooks/usePaymentRevenue'
import PaymentsNav from '../_components/PaymentsNav'

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('km-KH', { month: 'short', year: 'numeric' })
}

export default function PaymentRevenuePage() {
  const { stats, isLoading } = usePaymentRevenue()

  const maxMonthlyRevenue = useMemo(() => {
    if (!stats?.monthlyRevenue.length) return 1
    return Math.max(...stats.monthlyRevenue.map((m) => m.revenue), 1)
  }, [stats?.monthlyRevenue])

  return (
    <>
      <PageHeader
        title="ចំណូល"
        description="ចំណូលពីការទូទាត់ដែលបានផ្ទៀងផ្ទាត់ — សរុប តាមខែ និងតាមគម្រោង"
      />

      <PaymentsNav />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="ចំណូលសរុប"
          value={isLoading ? '—' : formatMoney(stats?.totalRevenue ?? 0)}
          color="gold"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          }
        />
        <StatsCard
          title="ចំណូលខែនេះ"
          value={isLoading ? '—' : formatMoney(stats?.thisMonthRevenue ?? 0)}
          color="green"
          isLoading={isLoading}
          trend={
            stats && !isLoading
              ? {
                  value: Math.abs(stats.monthTrend),
                  isPositive: stats.monthTrend >= 0,
                }
              : undefined
          }
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatsCard
          title="ការទូទាត់បានផ្ទៀងផ្ទាត់"
          value={isLoading ? '—' : (stats?.verifiedCount ?? 0)}
          color="navy"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatsCard
          title="មធ្យមភាគការទូទាត់"
          value={isLoading ? '—' : formatMoney(stats?.averageVerified ?? 0)}
          color="indigo"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 font-heading">ចំណូលតាមខែ</h3>
          <p className="text-sm text-slate-600 mt-1">១២ ខែចុងក្រោយ (ការទូទាត់បានផ្ទៀងផ្ទាត់)</p>

          {isLoading ? (
            <div className="mt-6 space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : stats?.monthlyRevenue.length ? (
            <ul className="mt-6 space-y-4">
              {stats.monthlyRevenue.map((row) => {
                const pct = Math.round((row.revenue / maxMonthlyRevenue) * 100)
                return (
                  <li key={row.month}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                      <span className="font-medium text-slate-800">{formatMonthLabel(row.month)}</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatMoney(row.revenue)}
                        <span className="text-slate-500 font-normal ml-1">({row.count})</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-navy-600 to-gold-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-500">មិនទាន់មានទិន្នន័យចំណូល</p>
          )}
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 font-heading">ចំណូលតាមគម្រោង</h3>
          <p className="text-sm text-slate-600 mt-1">បែងចែកតាមគម្រោងសមាជិក</p>

          {isLoading ? (
            <div className="mt-6 space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : stats?.revenueByPlan.length ? (
            <ul className="mt-6 divide-y divide-slate-100">
              {stats.revenueByPlan.map((plan) => (
                <li key={plan.planId} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{plan.planName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.count} ការទូទាត់</p>
                  </div>
                  <p className="font-bold text-emerald-700 tabular-nums shrink-0">
                    {formatMoney(plan.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-500">មិនទាន់មានទិន្នន័យ</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card padding="md" className="lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 font-heading">វិធីទូទាត់</h3>
          <div className="mt-4 space-y-4">
            {isLoading ? (
              <div className="animate-pulse h-20 bg-slate-100 rounded-lg" />
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Baray Online</p>
                    <p className="text-xs text-slate-500">{stats?.revenueByMethod.baray.count ?? 0} ដង</p>
                  </div>
                  <p className="font-bold text-blue-700 tabular-nums">
                    {formatMoney(stats?.revenueByMethod.baray.revenue ?? 0)}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Manual</p>
                    <p className="text-xs text-slate-500">{stats?.revenueByMethod.manual.count ?? 0} ដង</p>
                  </div>
                  <p className="font-bold text-slate-800 tabular-nums">
                    {formatMoney(stats?.revenueByMethod.manual.revenue ?? 0)}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">សង្ខេប</h3>
              <p className="text-sm text-slate-600 mt-1">ស្ថានភាពការទូទាត់ទាំងអស់</p>
            </div>
            <Link
              href="/dashboard/payments/history"
              className="text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors"
            >
              មើលប្រវត្តិ →
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'រង់ចាំ', value: stats?.pendingCount ?? 0, amount: stats?.pendingAmount },
              { label: 'បដិសេធ', value: stats?.rejectedCount ?? 0 },
              { label: 'សរុបប្រតិបត្តិការ', value: stats?.totalTransactions ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 p-3 bg-white">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{isLoading ? '—' : item.value}</dd>
                {'amount' in item && item.amount != null && item.amount > 0 && (
                  <dd className="text-xs text-amber-700 font-medium mt-0.5">
                    {formatMoney(item.amount)} រង់ផ្ទៀងផ្ទាត់
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-4 md:p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 font-heading">ការទូទាត់ថ្មីៗ (បានផ្ទៀងផ្ទាត់)</h3>
        </div>
        {isLoading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : stats?.recentVerified.length ? (
          <ul className="divide-y divide-slate-100">
            {stats.recentVerified.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 md:px-6 py-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{payment.plan_name ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(payment.verified_at).toLocaleString()}
                    {' · '}
                    {payment.file_type === 'baray' ? 'Baray' : 'Manual'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="success" size="sm">
                    បានទូទាត់
                  </Badge>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatMoney(payment.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-slate-500">មិនទាន់មានការទូទាត់ដែលបានផ្ទៀងផ្ទាត់</p>
        )}
      </Card>
    </>
  )
}
