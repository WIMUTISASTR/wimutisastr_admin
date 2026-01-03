import { ReactNode } from 'react'

interface QuickActionCardProps {
  title: string
  description: string
  icon: ReactNode
  color?: 'gold' | 'purple' | 'green' | 'blue' | 'orange' | 'indigo'
  onClick?: () => void
}

export default function QuickActionCard({
  title,
  description,
  icon,
  color = 'gold',
  onClick,
}: QuickActionCardProps) {
  const colorClasses = {
    gold: {
      iconBg: 'bg-gold-100 group-hover:bg-gold-200',
      iconText: 'text-gold-600',
      border: 'group-hover:border-gold-300',
    },
    indigo: {
      iconBg: 'bg-indigo-100 group-hover:bg-indigo-200',
      iconText: 'text-indigo-600',
      border: 'group-hover:border-indigo-200',
    },
    purple: {
      iconBg: 'bg-purple-100 group-hover:bg-purple-200',
      iconText: 'text-purple-600',
      border: 'group-hover:border-purple-200',
    },
    green: {
      iconBg: 'bg-green-100 group-hover:bg-green-200',
      iconText: 'text-green-600',
      border: 'group-hover:border-green-200',
    },
    blue: {
      iconBg: 'bg-blue-100 group-hover:bg-blue-200',
      iconText: 'text-blue-600',
      border: 'group-hover:border-blue-200',
    },
    orange: {
      iconBg: 'bg-orange-100 group-hover:bg-orange-200',
      iconText: 'text-orange-600',
      border: 'group-hover:border-orange-200',
    },
  }

  const colors = colorClasses[color]

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-white rounded-xl shadow-sm border border-slate-200 p-6
        hover:shadow-lg hover:border-slate-300 ${colors.border}
        transition-all duration-300 cursor-pointer
        transform hover:-translate-y-1
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`
          w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center
          transition-all duration-300 group-hover:scale-110
        `}>
          <div className={colors.iconText}>
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-gold-700 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="text-slate-400 group-hover:text-gold-600 transition-colors transform group-hover:translate-x-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

