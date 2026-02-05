/*
  Client-only auth listener to handle invalid refresh tokens.
  Keeps session state clean and prevents repeated console errors.
*/
'use client'

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

function isInvalidRefreshToken(message?: string | null) {
  if (!message) return false
  const lower = message.toLowerCase()
  return lower.includes('refresh token') || lower.includes('invalid refresh token')
}

export default function AuthListener() {
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const { error } = await supabase.auth.getSession()
      if (isMounted && error && isInvalidRefreshToken(error.message)) {
        await supabase.auth.signOut({ scope: 'local' })
      }
    }

    checkSession()

    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      // Handle session errors - if session becomes null after being active, it may indicate token issues
      if (event === 'SIGNED_OUT') {
        // Session ended - no action needed, user is already signed out
      }
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  return null
}
