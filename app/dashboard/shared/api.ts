'use client'

import { supabase } from '@/app/lib/supabase'

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
  return fetch(input, { ...init, headers })
}
