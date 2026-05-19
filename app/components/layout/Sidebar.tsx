'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useCallback } from 'react'
import { Logo } from '../auth'
import { Button } from '../ui'

interface MenuItem {
  id: string
  label: string
  icon: string
  href: string
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  menuItems: MenuItem[]
}

export default function Sidebar({
  isOpen,
  onClose,
  onLogout,
  menuItems,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const handleNavigation = useCallback(
    (href: string) => {
      onClose()
      startTransition(() => {
        router.push(href)
      })
    },
    [onClose, router]
  )

  return (
    <>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[var(--sidebar-width)] bg-navy-900 border-r border-navy-800
          shadow-xl lg:shadow-none
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="p-5 border-b border-navy-800/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Logo size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate tracking-wide">WIMUTISASTR</p>
                <p className="text-[11px] text-navy-300 truncate">ការគ្រប់គ្រងការិយាល័យ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-navy-300 hover:text-white hover:bg-navy-800 transition-colors cursor-pointer"
              aria-label="បិទម៉ឺនុយ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const active = isActive(item.href)
              const isNavigating = isPending && !active
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (!active) {
                        e.preventDefault()
                        handleNavigation(item.href)
                      } else {
                        onClose()
                      }
                    }}
                    prefetch
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-200 cursor-pointer
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900
                      ${active
                        ? 'bg-navy-800 text-white border-l-2 border-gold-500 pl-[10px]'
                        : 'text-navy-200 hover:bg-navy-800/60 hover:text-white border-l-2 border-transparent'
                      }
                      ${isNavigating ? 'opacity-70' : ''}
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <svg
                      className={`w-5 h-5 shrink-0 ${active ? 'text-gold-400' : 'text-navy-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-navy-800/80">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2.5 text-navy-300 hover:text-white hover:bg-navy-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>ចាកចេញ</span>
          </Button>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          onClick={onClose}
          aria-label="បិទផ្ទាំងស្រអាប់"
        />
      )}
    </>
  )
}
