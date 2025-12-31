'use client'

import Logo from './Logo'
import Button from './Button'

interface MenuItem {
  id: string
  label: string
  icon: string
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  activeMenu: string
  onMenuChange: (menuId: string) => void
  onLogout: () => void
  menuItems: MenuItem[]
}

export default function Sidebar({
  isOpen,
  onClose,
  activeMenu,
  onMenuChange,
  onLogout,
  menuItems,
}: SidebarProps) {
  return (
    <>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-amber-200 shadow-lg lg:shadow-none
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <h1 className="text-lg font-bold text-amber-900">WIMUTISASSTR</h1>
                <p className="text-xs text-amber-600">Admin Panel</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-amber-600 hover:text-amber-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onMenuChange(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${activeMenu === item.id
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-amber-700 hover:bg-amber-50 hover:text-amber-900'
                    }
                  `}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-amber-200">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}

