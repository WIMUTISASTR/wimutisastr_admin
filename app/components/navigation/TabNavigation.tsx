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
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px space-x-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative px-6 py-3.5 font-semibold text-sm transition-all duration-200
                  ${isActive
                    ? 'text-gold-700'
                    : 'text-slate-600 hover:text-gold-600 hover:bg-gold-50'
                  }
                  rounded-t-lg
                `}
              >
                <span className="flex items-center gap-2">
                  {tab.icon && (
                    <span className={`transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {tab.icon}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`
                      ml-1 px-2 py-0.5 text-xs font-bold rounded-full
                      ${isActive
                        ? 'bg-gold-100 text-gold-700'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-gold-50 group-hover:text-gold-600'
                      }
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-500 to-gold-600"></span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

