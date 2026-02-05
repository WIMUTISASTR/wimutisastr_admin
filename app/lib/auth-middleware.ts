import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthenticationError, AuthorizationError } from './errors'
import { getPinCookieName, verifyPinSessionToken } from './pin-session'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

if (!ADMIN_EMAIL) {
  throw new Error('NEXT_PUBLIC_ADMIN_EMAIL environment variable is required')
}

/**
 * Verify that the request has a valid PIN verification cookie
 */
export async function verifyPinCookie(request: NextRequest): Promise<void> {
  const pinCookie = request.cookies.get(getPinCookieName())?.value
  const ok = await verifyPinSessionToken(pinCookie)
  if (!ok) throw new AuthenticationError('PIN verification required')
}

/**
 * Create Supabase admin client for server-side operations
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  if (supabaseServiceKey === 'your_service_role_key_here') {
    throw new Error('Please configure a valid Supabase service role key')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Verify that the user is authenticated with Supabase and is the admin
 * This should be used for sensitive operations
 */
export async function verifyAdminAuth(request: NextRequest): Promise<void> {
  // First check PIN
  await verifyPinCookie(request)

  // Require a Supabase access token (sent by the client)
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    throw new AuthenticationError('Authentication required')
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new AuthenticationError('Invalid authentication token')
  if (!user.email || !isAdminEmail(user.email)) {
    throw new AuthorizationError('Access denied')
  }
}

/**
 * Check if an email is the admin email
 */
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL!.toLowerCase()
}

/**
 * Middleware wrapper for protected API routes
 * Verifies PIN cookie before processing request
 */
export function withPinAuth<T>(
  handler: (request: NextRequest, ...args: any[]) => Promise<T>
) {
  return async (request: NextRequest, ...args: any[]): Promise<T> => {
    await verifyPinCookie(request)
    return handler(request, ...args)
  }
}

/**
 * Middleware wrapper for admin-only API routes
 * Verifies both PIN and Supabase authentication
 */
export function withAdminAuth<T>(
  handler: (request: NextRequest, ...args: any[]) => Promise<T>
) {
  return async (request: NextRequest, ...args: any[]): Promise<T> => {
    await verifyAdminAuth(request)
    return handler(request, ...args)
  }
}

/**
 * Verify that the user has an approved membership
 * Used for protecting content access (books, videos)
 */
export async function verifyMembership(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    throw new AuthenticationError('Authentication required to access content')
  }

  const supabaseAdmin = getSupabaseAdmin()
  
  // Verify the token and get user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  
  if (authError || !user) {
    throw new AuthenticationError('Invalid authentication token')
  }

  // Check membership status + expiry window
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('membership_status, membership_ends_at')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    throw new AuthorizationError('Unable to verify membership status')
  }

  if (!profile || profile.membership_status !== 'approved') {
    throw new AuthorizationError(
      'Active membership required to access content. Please subscribe or contact support.'
    )
  }

  // If membership_ends_at exists and is in the past -> revoke access.
  // If it's null, treat as not active (until a verified payment sets it).
  const endsAt = profile.membership_ends_at as string | null | undefined
  if (!endsAt) {
    throw new AuthorizationError(
      'Active membership required to access content. Please subscribe or contact support.'
    )
  }

  const endsAtMs = Date.parse(endsAt)
  if (!Number.isFinite(endsAtMs) || endsAtMs <= Date.now()) {
    throw new AuthorizationError(
      'Your membership has expired. Please make a payment to renew access.'
    )
  }

  return user.id
}
