'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'

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

const PINInput = forwardRef<PINInputRef, PINInputProps>(({
  length = 6,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}, ref) => {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''))
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (autoFocus) {
      const firstInput = document.getElementById('pin-0')
      if (firstInput) {
        firstInput.focus()
      }
    }
  }, [autoFocus])

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedPin = value.slice(0, length).split('')
      const newPin = [...pin]
      pastedPin.forEach((digit, i) => {
        if (index + i < length && /^\d$/.test(digit)) {
          newPin[index + i] = digit
        }
      })
      setPin(newPin)
      const nextIndex = Math.min(index + pastedPin.length, length - 1)
      setCurrentIndex(nextIndex)
      const nextInput = document.getElementById(`pin-${nextIndex}`)
      if (nextInput) {
        nextInput.focus()
      }
      
      return
    }

    if (value && !/^\d$/.test(value)) {
      return
    }

    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    if (value && index < length - 1) {
      setCurrentIndex(index + 1)
      const nextInput = document.getElementById(`pin-${index + 1}`)
      if (nextInput) {
        nextInput.focus()
      }
    } else if (!value && index > 0) {
      setCurrentIndex(index - 1)
      const prevInput = document.getElementById(`pin-${index - 1}`)
      if (prevInput) {
        prevInput.focus()
      }
    }

  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`)
      if (prevInput) {
        prevInput.focus()
      }
    }
  }

  const reset = () => {
    setPin(Array(length).fill(''))
    setCurrentIndex(0)
    const firstInput = document.getElementById('pin-0')
    if (firstInput) {
      firstInput.focus()
    }
  }

  useImperativeHandle(ref, () => ({
    getValue: () => pin.join(''),
    reset,
  }))

  // Reset on error
  useEffect(() => {
    if (error) {
      reset()
    }
  }, [error])

  // Call onComplete when PIN is complete (optional)
  useEffect(() => {
    const pinString = pin.join('')
    if (pinString.length === length && onComplete) {
      onComplete(pinString)
    }
  }, [pin, length, onComplete])

  return (
    <div>
      <div className="flex justify-center gap-3 mb-4">
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
              const pastedData = e.clipboardData.getData('text')
              handlePinChange(index, pastedData)
            }}
            className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg transition-all bg-amber-50/50 border-amber-200 text-amber-900"
            disabled={disabled}
            autoFocus={index === 0 && autoFocus}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-600 text-sm text-center mt-2">{error}</p>
      )}
    </div>
  )
})

PINInput.displayName = 'PINInput'

export default PINInput

