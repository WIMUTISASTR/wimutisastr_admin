'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard, LoginForm } from '../components/auth'
import { signIn, getSession } from '../lib/auth'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check both PIN verification and Supabase session
    const checkAuth = async () => {
      try {
        // Check if PIN is verified (cookie-based)
        const pinResponse = await fetch('/api/auth/verify-pin', {
          method: 'GET',
        })
        
        if (!pinResponse.ok) {
          router.push('/')
          return
        }

        // Check if already logged in with Supabase
        const session = await getSession()
        if (session) {
          router.push('/dashboard')
        }
      } catch {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (email: string, password: string) => {
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setIsLoading(false)
      // Show the actual error message from Supabase or our custom message
      let errorMessage = 'Invalid email or password. Please try again.'
      
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err
        } else if (err instanceof Error) {
          errorMessage = err.message
        } else if (typeof err === 'object' && err !== null) {
          const maybeError = err as { error?: { message?: string } }
          if (maybeError.error?.message) {
            errorMessage = maybeError.error.message
          }
        }
      }
      
      setError(errorMessage)
      
      // Log error details for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error details:', {
          error: err,
          message: err instanceof Error ? err.message : undefined,
          errorMessage: errorMessage,
          type: typeof err,
          stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
        })
      }
    }
  }

  return (
    <AuthCard
      footer={
        <button
          onClick={async () => {
            // Clear PIN verification cookie
            await fetch('/api/auth/verify-pin', {
              method: 'DELETE',
            })
            router.push('/')
          }}
          className="text-xs text-gold-600 hover:text-gold-700 underline"
        >
          Back to PIN Entry
        </button>
      }
    >
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </AuthCard>
  )
}
