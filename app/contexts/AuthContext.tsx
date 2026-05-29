'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, signOut, getUser, isAdminEmail } from '../lib/auth'
import { notify } from '@/lib/utils/notify'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Cache the auth state to prevent re-checking on every navigation
let authCache: { isAuthenticated: boolean; timestamp: number } | null = null
const AUTH_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async (forceRefresh = false) => {
    // Use cached auth if available and not expired
    if (!forceRefresh && authCache && Date.now() - authCache.timestamp < AUTH_CACHE_DURATION) {
      setIsAuthenticated(authCache.isAuthenticated)
      setIsLoading(false)
      return
    }

    try {
      // Check PIN verification (cookie-based) - quick check first
      const pinResponse = await fetch('/api/auth/verify-pin', {
        method: 'GET',
        // Use cache for this request
        cache: 'no-store',
      })

      if (!pinResponse.ok) {
        authCache = { isAuthenticated: false, timestamp: Date.now() }
        setIsAuthenticated(false)
        router.push('/')
        return
      }

      // Check Supabase session
      const session = await getSession()
      if (session) {
        const user = await getUser()
        if (user && user.email && isAdminEmail(user.email)) {
          authCache = { isAuthenticated: true, timestamp: Date.now() }
          setIsAuthenticated(true)
        } else {
          await signOut()
          await fetch('/api/auth/verify-pin', { method: 'DELETE' })
          authCache = { isAuthenticated: false, timestamp: Date.now() }
          setIsAuthenticated(false)
          router.push('/')
        }
      } else {
        await fetch('/api/auth/verify-pin', { method: 'DELETE' })
        authCache = { isAuthenticated: false, timestamp: Date.now() }
        setIsAuthenticated(false)
        router.push('/')
      }
    } catch {
      await fetch('/api/auth/verify-pin', { method: 'DELETE' })
      authCache = { isAuthenticated: false, timestamp: Date.now() }
      setIsAuthenticated(false)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const logout = useCallback(async () => {
    try {
      await signOut()
      await fetch('/api/auth/verify-pin', { method: 'DELETE' })
    } catch (error) {
      console.error('Error signing out:', error)
      notify.error('ចាកចេញមិនជោគជ័យ។ សូមព្យាយាមម្តងទៀត។')
      await fetch('/api/auth/verify-pin', { method: 'DELETE' })
    } finally {
      // Clear auth cache on logout
      authCache = null
      setIsAuthenticated(false)
      router.push('/')
    }
  }, [router])

  const refreshAuth = useCallback(async () => {
    await checkAuth(true)
  }, [checkAuth])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export function to clear cache when needed (e.g., on login)
export function clearAuthCache() {
  authCache = null
}
