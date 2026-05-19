import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'gold' | 'navy' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo'
  isLoading?: boolean
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  color = 'navy',
  isLoading = false,
}: StatsCardProps) {
  const colorClasses = {
    navy: {
      text: 'text-navy-600',
      border: 'border-navy-100',
      iconBg: 'bg-navy-50',
    },
    gold: {
      text: 'text-gold-700',
      border: 'border-gold-200',
      iconBg: 'bg-gold-50',
    },
    indigo: {
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-50',
    },
    green: {
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-50',
    },
    blue: {
      text: 'text-sky-600',
      border: 'border-sky-100',
      iconBg: 'bg-sky-50',
    },
    purple: {
      text: 'text-violet-600',
      border: 'border-violet-100',
      iconBg: 'bg-violet-50',
    },
    orange: {
      text: 'text-orange-600',
      border: 'border-orange-100',
      iconBg: 'bg-orange-50',
    },
  }

  const colors = colorClasses[color]

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-8 bg-slate-200 rounded w-16" />
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${colors.text} uppercase tracking-wider mb-2`}>
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 font-heading tabular-nums">{value}</p>
          {trend && (
            <div
              className={`mt-2 flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {trend.isPositive ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 shrink-0 ${colors.iconBg} rounded-xl flex items-center justify-center ${colors.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
