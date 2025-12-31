import { ReactNode } from 'react'
import Logo from './Logo'

interface AuthCardProps {
  children: ReactNode
  footer?: ReactNode
}

export default function AuthCard({ children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-white via-amber-50/30 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-amber-100">
          {/* Logo Section */}
          <div className="mb-8">
            <Logo size="lg" showText />
          </div>

          {/* Content */}
          {children}

          {/* Footer */}
          {footer && (
            <div className="mt-6 text-center">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

