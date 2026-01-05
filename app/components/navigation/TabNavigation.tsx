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
    <div className="mb-6 inline-flex bg-gray-400 rounded-[100px]">
      <div>
        <nav className="flex -mb-px space-x-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative px-6 py-3.5 font-semibold text-sm
                  ${isActive
                    ? 'text-white bg-gold-500 rounded-[20px]'
                    : 'text-white'
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
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-gradient(to right, #FFD700, #FFC300)"></span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

