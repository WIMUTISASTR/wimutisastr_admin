'use client'

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'

export interface PINInputRef {
  getValue: () => string
  reset: () => void
}

interface PINInputProps {
  length?: number
  onComplete?: (pin: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
}

const PINInput = forwardRef<PINInputRef, PINInputProps>(
  ({ length = 6, onComplete, error, disabled = false, autoFocus = true }, ref) => {
    const [pin, setPin] = useState<string[]>(Array(length).fill(''))

    useEffect(() => {
      if (autoFocus) {
        const firstInput = document.getElementById('pin-0')
        firstInput?.focus()
      }
    }, [autoFocus])

    const handlePinChange = (index: number, value: string) => {
      if (value.length > 1) {
        const pastedPin = value.slice(0, length).split('')
        const newPin = [...pin]
        pastedPin.forEach((digit, i) => {
          if (index + i < length && /^\d$/.test(digit)) {
            newPin[index + i] = digit
          }
        })
        setPin(newPin)
        const nextIndex = Math.min(index + pastedPin.length, length - 1)
        document.getElementById(`pin-${nextIndex}`)?.focus()
        return
      }

      if (value && !/^\d$/.test(value)) return

      const newPin = [...pin]
      newPin[index] = value
      setPin(newPin)

      if (value && index < length - 1) {
        document.getElementById(`pin-${index + 1}`)?.focus()
      } else if (!value && index > 0) {
        document.getElementById(`pin-${index - 1}`)?.focus()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && !pin[index] && index > 0) {
        document.getElementById(`pin-${index - 1}`)?.focus()
      }
    }

    const reset = useCallback(() => {
      setPin(Array(length).fill(''))
      document.getElementById('pin-0')?.focus()
    }, [length])

    useImperativeHandle(ref, () => ({
      getValue: () => pin.join(''),
      reset,
    }))

    useEffect(() => {
      if (!error) return
      const timer = setTimeout(() => reset(), 0)
      return () => clearTimeout(timer)
    }, [error, reset])

    useEffect(() => {
      const pinString = pin.join('')
      if (pinString.length === length && onComplete) {
        onComplete(pinString)
      }
    }, [pin, length, onComplete])

    return (
      <div>
        <div className="flex justify-center gap-2 sm:gap-3 mb-2">
          {pin.map((digit, index) => (
            <input
              key={index}
              id={`pin-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={(e) => {
                e.preventDefault()
                handlePinChange(index, e.clipboardData.getData('text'))
              }}
              className={`
                w-11 h-14 sm:w-12 text-center text-xl font-bold rounded-lg
                border transition-colors duration-200
                bg-white text-navy-900
                ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-navy-600'}
                focus:outline-none focus:ring-2 focus:ring-navy-600/20
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={disabled}
              autoFocus={index === 0 && autoFocus}
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>
        {error && (
          <p className="text-red-600 text-sm text-center mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

PINInput.displayName = 'PINInput'

export default PINInput
