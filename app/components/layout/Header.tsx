'use client'

import UploadQueueDropdown from './UploadQueueDropdown'

interface HeaderProps {
  onMenuToggle: () => void
  userInfo?: string
}

export default function Header({ onMenuToggle, userInfo = 'Administrator' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="px-4 sm:px-6 lg:px-8 h-[var(--header-height)] flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-navy-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="បើកម៉ឺនុយ"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden lg:block flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">រដ្ឋបាល</p>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <UploadQueueDropdown />
          <div className="hidden sm:flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full bg-slate-50 border border-slate-200/80">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-white text-xs font-bold">
              {userInfo.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-slate-700 pr-2">{userInfo}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
