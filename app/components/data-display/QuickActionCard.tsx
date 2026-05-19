import { ReactNode } from 'react'

interface QuickActionCardProps {
  title: string
  description: string
  icon: ReactNode
  color?: 'gold' | 'navy' | 'purple' | 'green' | 'blue' | 'orange' | 'indigo'
  onClick?: () => void
}

export default function QuickActionCard({
  title,
  description,
  icon,
  color = 'navy',
  onClick,
}: QuickActionCardProps) {
  const colorClasses = {
    navy: {
      iconBg: 'bg-navy-50 group-hover:bg-navy-100',
      iconText: 'text-navy-600',
      border: 'group-hover:border-navy-200',
    },
    gold: {
      iconBg: 'bg-gold-50 group-hover:bg-gold-100',
      iconText: 'text-gold-700',
      border: 'group-hover:border-gold-200',
    },
    indigo: {
      iconBg: 'bg-indigo-50 group-hover:bg-indigo-100',
      iconText: 'text-indigo-600',
      border: 'group-hover:border-indigo-200',
    },
    purple: {
      iconBg: 'bg-violet-50 group-hover:bg-violet-100',
      iconText: 'text-violet-600',
      border: 'group-hover:border-violet-200',
    },
    green: {
      iconBg: 'bg-emerald-50 group-hover:bg-emerald-100',
      iconText: 'text-emerald-600',
      border: 'group-hover:border-emerald-200',
    },
    blue: {
      iconBg: 'bg-sky-50 group-hover:bg-sky-100',
      iconText: 'text-sky-600',
      border: 'group-hover:border-sky-200',
    },
    orange: {
      iconBg: 'bg-orange-50 group-hover:bg-orange-100',
      iconText: 'text-orange-600',
      border: 'group-hover:border-orange-200',
    },
  }

  const colors = colorClasses[color]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group w-full text-left bg-white rounded-xl shadow-sm border border-slate-200/80 p-5
        hover:shadow-md hover:border-slate-300 ${colors.border}
        transition-colors duration-200 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2
      `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 shrink-0 ${colors.iconBg} rounded-xl flex items-center justify-center transition-colors duration-200`}
        >
          <div className={colors.iconText}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 mb-0.5 group-hover:text-navy-800 transition-colors font-heading">
            {title}
          </h3>
          <p className="text-sm text-slate-600 leading-snug">{description}</p>
        </div>
        <div className="text-slate-300 group-hover:text-gold-600 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}
