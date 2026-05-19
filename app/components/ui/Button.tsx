import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'submit'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark'

type ButtonSize = 'sm' | 'md' | 'lg'

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

interface ButtonProps extends Omit<NativeButtonProps, 'className' | 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  isLoading?: boolean
  className?: string
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className = '',
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2'

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-navy-700 hover:bg-navy-800 text-white shadow-sm',
    accent: 'bg-gold-600 hover:bg-gold-700 text-white shadow-sm',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm',
    submit: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
    info: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm',
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
    dark: 'bg-navy-900 hover:bg-navy-800 text-white shadow-sm',
  }

  const combinedClassName = `${baseClasses} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${variantClasses[variant]} ${className}`.trim()

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={combinedClassName}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
