import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-14 px-4">
      {icon && (
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-navy-50 rounded-2xl flex items-center justify-center text-navy-500 ring-1 ring-navy-100">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2 font-heading">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
