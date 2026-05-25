'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard/payments', label: 'ទាំងអស់', exact: true },
  { href: '/dashboard/payments/history', label: 'ប្រវត្តិការទូទាត់', exact: false },
  { href: '/dashboard/payments/revenue', label: 'ចំណូល', exact: false },
] as const

export default function PaymentsNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav
      className="inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-6"
      aria-label="ការទូទាត់"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href, tab.exact)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              px-4 py-2.5 font-medium text-sm rounded-lg transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2
              ${active
                ? 'bg-white text-navy-800 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }
            `}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
