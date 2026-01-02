'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '../components/AuthCard'
import LoginForm from '../components/LoginForm'
import { signIn, getSession } from '../lib/auth'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if PIN is verified
    const pinVerified = localStorage.getItem('pinVerified')
    if (pinVerified !== 'true') {
      router.push('/')
      return
    }

    // Check if already logged in with Supabase
    const checkSession = async () => {
      try {
        const session = await getSession()
        if (session) {
          router.push('/dashboard')
        }
      } catch (error) {
        // No session, user needs to login
      }
    }
    checkSession()
  }, [router])

  const handleSubmit = async (email: string, password: string) => {
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setIsLoading(false)
      // Show the actual error message from Supabase or our custom message
      let errorMessage = 'Invalid email or password. Please try again.'
      
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err
        } else if (err?.message) {
          errorMessage = err.message
        } else if (err?.error?.message) {
          errorMessage = err.error.message
        }
      }
      
      setError(errorMessage)
      
      // Log error details for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error details:', {
          error: err,
          message: err?.message,
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
          onClick={() => {
            localStorage.removeItem('pinVerified')
            router.push('/')
          }}
          className="text-xs text-amber-600 hover:text-amber-700 underline"
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
