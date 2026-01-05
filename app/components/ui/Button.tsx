import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  |  'submit'
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
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-base',
  }
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-blue-700 hover:bg-blue-800 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    submit: 'bg-green-600 hover:bg-green-800 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    light: 'bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
    dark: 'bg-gray-800 hover:bg-gray-900 text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]',
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
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}

