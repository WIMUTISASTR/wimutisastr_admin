'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PINInput, { PINInputRef } from '@/app/components/auth/PINInput'
import AuthCard from '@/app/components/auth/AuthCard'
import { Button } from '@/app/components/ui'

export default function PINPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pinInputRef = useRef<PINInputRef>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if PIN already verified by trying to access a protected endpoint
    const checkPinStatus = async () => {
      try {
        const response = await fetch('/api/auth/verify-pin', {
          method: 'GET',
        })
        if (response.ok) {
          router.push('/login')
        }
      } catch (error) {
        // PIN not verified, stay on this page
      }
    }
    checkPinStatus()
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
        // Cookie is set by the API route, no localStorage needed
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
