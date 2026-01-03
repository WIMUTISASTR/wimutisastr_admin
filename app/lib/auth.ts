import { supabase } from './supabase'

// Get admin email from environment variable - no fallback for security
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

if (!ADMIN_EMAIL) {
  throw new Error('NEXT_PUBLIC_ADMIN_EMAIL environment variable is required')
}

export interface AuthUser {
  id: string
  email?: string
  [key: string]: any
}

export function isAdminEmail(email: string): boolean {
  if (!ADMIN_EMAIL) {
    throw new Error('NEXT_PUBLIC_ADMIN_EMAIL environment variable is required')
  }
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

export async function signIn(email: string, password: string) {
  // Check if email is admin email
  if (!isAdminEmail(email)) {
    throw new Error('Access denied. Only admin email is allowed.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Log the actual error for debugging
    console.error('Supabase auth error:', error)
    
    // Provide more specific error messages based on Supabase error codes
    if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
      throw new Error('Invalid email or password. Please verify your credentials in Supabase dashboard.')
    } else if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
      throw new Error('Please confirm your email address before logging in.')
    } else if (error.message?.includes('User not found') || error.message?.includes('user_not_found')) {
      throw new Error('User not found. Please create the user in Supabase dashboard first.')
    } else if (error.message) {
      // Return the actual Supabase error message
      throw new Error(error.message)
    }
    throw new Error('Authentication failed. Please check your credentials.')
  }

  // Double check the user email after successful login
  if (data.user && !isAdminEmail(data.user.email || '')) {
    await supabase.auth.signOut()
    throw new Error('Access denied. Only admin email is allowed.')
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return session
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }
  return user
}

export async function verifyAdminAccess(): Promise<boolean> {
  try {
    const user = await getUser()
    return user?.email ? isAdminEmail(user.email) : false
  } catch {
    return false
  }
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
