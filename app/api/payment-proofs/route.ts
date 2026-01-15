import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError, ValidationError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch payment proofs with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`payment-proofs:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status') // Filter by status: pending, verified, rejected
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    if (id) {
      // Fetch single payment proof
      const { data, error } = await supabaseAdmin
        .from('payment_proofs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Payment proof not found')

      // Fetch user data from auth.users and user_profiles
      let userData = null
      if (data.user_id) {
        // Get email from auth.users
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(data.user_id)
        const userEmail = authData?.user?.email || null

        // Get profile data from user_profiles
        const { data: profileData } = await supabaseAdmin
          .from('user_profiles')
          .select('membership_status, membership_approved_at, membership_denied_at, created_at')
          .eq('id', data.user_id)
          .single()

        userData = {
          email: userEmail,
          membership_status: profileData?.membership_status || 'pending',
          membership_approved_at: profileData?.membership_approved_at || null,
          membership_denied_at: profileData?.membership_denied_at || null,
          registered_at: profileData?.created_at || null,
        }
      }

      // Add user data to response
      const transformedData = {
        ...data,
        user: userData
      }

      return NextResponse.json({ data: transformedData })
    }

    // Build query
    let query = supabaseAdmin
      .from('payment_proofs')
      .select('*', { count: 'exact' })

    // Filter by status if provided
    if (status && ['pending', 'verified', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    // Fetch payment proofs with pagination
    const { data: proofs, error: proofsError, count } = await query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (proofsError) throw proofsError

    // Fetch user data (email + profile) for all proofs
    const transformedProofs = await Promise.all(
      (proofs || []).map(async (proof) => {
        let userData = null
        if (proof.user_id) {
          try {
            // Get email from auth.users
            const { data: authData } = await supabaseAdmin.auth.admin.getUserById(proof.user_id)
            const userEmail = authData?.user?.email || null

            // Get profile data from user_profiles
            const { data: profileData } = await supabaseAdmin
              .from('user_profiles')
              .select('membership_status, membership_approved_at, membership_denied_at, created_at')
              .eq('id', proof.user_id)
              .single()

            userData = {
              email: userEmail,
              membership_status: profileData?.membership_status || 'pending',
              membership_approved_at: profileData?.membership_approved_at || null,
              membership_denied_at: profileData?.membership_denied_at || null,
              registered_at: profileData?.created_at || null,
            }
          } catch (error) {
            console.error(`Failed to fetch user data for ${proof.user_id}:`, error)
          }
        }
        return {
          ...proof,
          user: userData
        }
      })
    )

    return NextResponse.json({
      data: transformedProofs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update payment proof status (verify or reject)
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`payment-proofs:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Payment proof ID is required')
    }

    const body = await request.json()
    const { status, notes, membership_starts_at, membership_ends_at } = body

    if (!status || !['verified', 'rejected'].includes(status)) {
      throw new ValidationError('Status must be either "verified" or "rejected"')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Prepare update data
    const updateData: any = {
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    if (status === 'verified') {
      updateData.verified_at = new Date().toISOString()
      updateData.membership_starts_at = membership_starts_at || null
      updateData.membership_ends_at = membership_ends_at || null
      // TODO: Add verified_by with admin user ID when auth is implemented
    } else {
      // Reset verification fields if rejected
      updateData.verified_at = null
      updateData.verified_by = null
      updateData.membership_starts_at = null
      updateData.membership_ends_at = null
    }

    // Update payment proof
    const { data, error } = await supabaseAdmin
      .from('payment_proofs')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Payment proof not found')

    // If payment is verified, update user_profiles to set membership_status to 'approved'
    if (status === 'verified' && data.user_id) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          membership_status: 'approved',
          membership_approved_at: new Date().toISOString(),
          membership_denied_at: null, // Clear any previous denial
        })
        .eq('id', data.user_id)

      if (profileError) {
        console.error('Failed to update user profile:', profileError)
        // Don't throw error - payment proof is already updated
      }
    }

    // If payment is rejected, update user_profiles to set membership_status to 'denied'
    if (status === 'rejected' && data.user_id) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          membership_status: 'denied',
          membership_denied_at: new Date().toISOString(),
          membership_approved_at: null, // Clear any previous approval
        })
        .eq('id', data.user_id)

      if (profileError) {
        console.error('Failed to update user profile:', profileError)
        // Don't throw error - payment proof is already updated
      }
    }

    // Fetch user data from auth.users and user_profiles
    let userData = null
    if (data.user_id) {
      // Get email from auth.users
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(data.user_id)
      const userEmail = authData?.user?.email || null

      // Get profile data from user_profiles
      const { data: profileData } = await supabaseAdmin
        .from('user_profiles')
        .select('membership_status, membership_approved_at, membership_denied_at, created_at')
        .eq('id', data.user_id)
        .single()

      userData = {
        email: userEmail,
        membership_status: profileData?.membership_status || 'pending',
        membership_approved_at: profileData?.membership_approved_at || null,
        membership_denied_at: profileData?.membership_denied_at || null,
        registered_at: profileData?.created_at || null,
      }
    }

    // Add user data to response
    const transformedData = {
      ...data,
      user: userData
    }

    return NextResponse.json({ data: transformedData })
  } catch (error) {
    return handleApiError(error)
  }
}
