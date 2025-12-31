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
      // Show the actual error message from Supabase or our custom message
      const errorMessage = err.message || 'Invalid email or password. Please try again.'
      setError(errorMessage)
      setIsLoading(false)
      console.error('Login error details:', {
        message: err.message,
        error: err,
        stack: err.stack
      }) // For debugging
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
