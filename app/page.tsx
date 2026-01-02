'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PINInput, { PINInputRef } from './components/PINInput'
import AuthCard from './components/AuthCard'
import Button from './components/Button'

export default function PINPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pinInputRef = useRef<PINInputRef>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if PIN already verified
    const pinVerified = localStorage.getItem('pinVerified')
    if (pinVerified === 'true') {
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pin = pinInputRef.current?.getValue() || ''
    
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Verify PIN via API route (server-side validation)
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('pinVerified', 'true')
        router.push('/login')
      } else {
        setError('Invalid PIN. Please try again.')
        pinInputRef.current?.reset()
        setIsLoading(false)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      pinInputRef.current?.reset()
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      footer={
        <p className="text-xs text-slate-600">
          Admin Panel Access
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-4 text-center">
            Enter Your PIN
          </label>
          <PINInput
            ref={pinInputRef}
            error={error}
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          className="w-full py-3 px-4"
        >
          Verify PIN
        </Button>
      </form>
    </AuthCard>
  )
}
