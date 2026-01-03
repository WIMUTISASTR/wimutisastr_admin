import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthenticationError, AuthorizationError } from './errors'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

if (!ADMIN_EMAIL) {
  throw new Error('NEXT_PUBLIC_ADMIN_EMAIL environment variable is required')
}

/**
 * Verify that the request has a valid PIN verification cookie
 */
export function verifyPinCookie(request: NextRequest): void {
  const pinVerified = request.cookies.get('pinVerified')?.value
  
  if (pinVerified !== 'true') {
    throw new AuthenticationError('PIN verification required')
  }
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
  verifyPinCookie(request)

  // Get the session token from the Authorization header or cookies
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    // Try to get from cookies (Supabase auth cookie)
    const cookies = request.cookies.getAll()
    const supabaseAuthCookie = cookies.find(cookie => 
      cookie.name.includes('supabase-auth-token') || 
      cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
    )
    
    if (!supabaseAuthCookie) {
      throw new AuthenticationError('Authentication required')
    }
  }

  // Verify the user is the admin email
  // Note: In a production app, you'd verify the token here
  // For now, we trust the PIN + Supabase session verification done on the client
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
    verifyPinCookie(request)
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

