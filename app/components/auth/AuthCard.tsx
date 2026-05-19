import { ReactNode } from 'react'
import Logo from './Logo'

interface AuthCardProps {
  children: ReactNode
  footer?: ReactNode
}

export default function AuthCard({ children, footer }: AuthCardProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#f8fafc]">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 50% -10%, rgb(212 175 55 / 0.12), transparent),
            radial-gradient(ellipse 50% 40% at 100% 100%, rgb(45 76 94 / 0.08), transparent)
          `,
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" showText />
          </div>
          {children}
          {footer && <div className="mt-8 pt-6 border-t border-slate-100 text-center">{footer}</div>}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          ការចូលប្រើប្រាស់ប្រកបដោយសុវត្ថិភាព · ការិយាល័យច្បាប់ WIMUTISASSTR
        </p>
      </div>
    </div>
  )
}
