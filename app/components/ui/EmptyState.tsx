import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

