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

    // Fetch user profiles with membership status
    const userIds = data.users.map(u => u.id)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Create a map of profiles for easy lookup
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Transform the data to include useful information
    const users = data.users.map(user => {
      const profile = profilesMap.get(user.id)
      return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      user_metadata: user.user_metadata,
        membership_status: profile?.membership_status || 'pending',
        membership_approved_at: profile?.membership_approved_at || null,
        membership_denied_at: profile?.membership_denied_at || null,
        membership_notes: profile?.membership_notes || null,
      }
    })

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

// PUT - Update user membership status
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`users:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { membership_status, membership_notes } = body

    if (!membership_status || !['pending', 'approved', 'denied'].includes(membership_status)) {
      return NextResponse.json(
        { error: 'Valid membership_status is required (pending, approved, or denied)' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      membership_status,
      membership_notes: membership_notes || null,
    }

    // Set appropriate timestamp based on status
    if (membership_status === 'approved') {
      updateData.membership_approved_at = new Date().toISOString()
      updateData.membership_denied_at = null
    } else if (membership_status === 'denied') {
      updateData.membership_denied_at = new Date().toISOString()
      updateData.membership_approved_at = null
    } else {
      // pending status clears both timestamps
      updateData.membership_approved_at = null
      updateData.membership_denied_at = null
    }

    // Update or insert user profile
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        ...updateData,
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      data,
      message: `Membership status updated to ${membership_status}`
    }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`users:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Delete user from auth.users (cascade will delete profile)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw error

    return NextResponse.json({
      data: null,
      message: 'User deleted successfully'
    }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
