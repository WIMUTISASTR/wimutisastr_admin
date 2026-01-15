'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  showBackButton?: boolean
  backHref?: string
}

export default function PageHeader({ title, action, showBackButton = false, backHref }: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div className="mb-4">
      {showBackButton && (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-4 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      )}
      
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">{title}</h1>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}


