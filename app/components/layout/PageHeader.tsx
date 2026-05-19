'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { Button } from '../ui'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  showBackButton?: boolean
  backHref?: string
}

export default function PageHeader({
  title,
  description,
  action,
  showBackButton = false,
  backHref,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header className="mb-8">
      {showBackButton && (
        <Button
          type="button"
          onClick={handleBack}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          ត្រឡប់
        </Button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-heading tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm md:text-base text-slate-600 max-w-2xl">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
