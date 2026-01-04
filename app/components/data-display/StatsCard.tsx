import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'gold' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo'
  isLoading?: boolean
}

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'gold',
  isLoading = false 
}: StatsCardProps) {
  const colorClasses = {
    gold: {
      text: 'text-gold-600',
      bg: 'bg-gold-50',
      border: 'border-gold-200',
      iconBg: 'bg-gold-100',
    },
    indigo: {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-100',
    },
    green: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
      iconBg: 'bg-green-100',
    },
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100',
    },
    purple: {
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100',
    },
    orange: {
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      iconBg: 'bg-orange-100',
    },
  }

  const colors = colorClasses[color]

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
          <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className={`text-sm font-semibold ${colors.text} uppercase tracking-wide`}>{title}</p>
        </div>
        <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center ${colors.text} transition-transform hover:scale-110`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}


