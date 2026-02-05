'use client'

import { supabase } from '@/app/lib/supabase'

let isRedirectingToLogin = false

async function handleUnauthorized(): Promise<void> {
  if (typeof window === 'undefined') return
  if (isRedirectingToLogin) return
  isRedirectingToLogin = true

  try {
    // Clear Supabase session (access token)
    await supabase.auth.signOut()
  } catch {
    // ignore
  }

  try {
    // Clear PIN cookie so /dashboard is protected again
    await fetch('/api/auth/verify-pin', { method: 'DELETE' })
  } catch {
    // ignore
  }

  // Redirect to login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Get the current Supabase access token for admin API routes.
 * Use with apiFetch or when you need to set headers manually (e.g. XHR uploads).
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Fetch wrapper that attaches the Supabase access token for admin API routes.
 * Use this for all dashboard calls to /api/* (except /api/auth/verify-pin).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getAuthToken()
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(input, { ...init, headers })

  // If token expired/invalid, force re-login.
  // This wrapper is for dashboard admin calls (not /api/auth/verify-pin).
  if (res.status === 401) {
    void handleUnauthorized()
  }

  return res
}
