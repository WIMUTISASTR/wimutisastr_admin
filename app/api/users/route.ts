import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch all users with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`users:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const offset = (page - 1) * limit

    // Fetch users from auth.users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit,
    })

    if (error) throw error

    // Transform the data to include useful information
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      user_metadata: user.user_metadata,
    }))

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total: data.users.length, // Note: Supabase doesn't provide total count
        totalPages: Math.ceil(data.users.length / limit),
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
