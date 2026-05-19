import { ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: number
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export default function TabNavigation({ tabs, activeTab, onTabChange, className = '' }: TabNavigationProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <nav
        className="inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                relative px-4 py-2.5 font-medium text-sm rounded-lg transition-colors duration-200 cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2
                ${isActive
                  ? 'bg-white text-navy-800 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.icon && <span className={isActive ? 'text-gold-600' : 'text-slate-400'}>{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 min-w-[1.25rem] px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      isActive ? 'bg-gold-100 text-gold-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
