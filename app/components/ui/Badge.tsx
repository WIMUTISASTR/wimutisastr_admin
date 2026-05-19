import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    error: 'bg-red-50 text-red-800 ring-1 ring-red-200',
    info: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    gold: 'bg-gold-50 text-gold-800 ring-1 ring-gold-200',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
      `}
    >
      {children}
    </span>
  )
}
