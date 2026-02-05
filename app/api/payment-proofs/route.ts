import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError, ValidationError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch payment proofs with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

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

      // Fetch subscription plan data if subscription_plan_id exists
      let subscriptionPlanData = null
      if (data.subscription_plan_id) {
        const { data: planData } = await supabaseAdmin
          .from('subscription_plans')
          .select('id, name, price, duration_days, currency')
          .eq('id', data.subscription_plan_id)
          .single()

        if (planData) {
          subscriptionPlanData = planData
        }
      }

      // Add user data and subscription plan data to response
      const transformedData = {
        ...data,
        user: userData,
        subscription_plan: subscriptionPlanData
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

    // Fetch user data (email + profile) and subscription plan for all proofs
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

        // Fetch subscription plan data if subscription_plan_id exists
        let subscriptionPlanData = null
        if (proof.subscription_plan_id) {
          try {
            const { data: planData } = await supabaseAdmin
              .from('subscription_plans')
              .select('id, name, price, duration_days, currency')
              .eq('id', proof.subscription_plan_id)
              .single()

            if (planData) {
              subscriptionPlanData = planData
            }
          } catch (error) {
            console.error(`Failed to fetch subscription plan for ${proof.subscription_plan_id}:`, error)
          }
        }

        return {
          ...proof,
          user: userData,
          subscription_plan: subscriptionPlanData
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
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`payment-proofs:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Payment proof ID is required')
    }

    const body = await request.json()
    const { status, notes } = body

    if (!status || !['verified', 'rejected'].includes(status)) {
      throw new ValidationError('Status must be either "verified" or "rejected"')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Fetch current payment proof (needed to compute membership end date from plan)
    const { data: existingProof, error: existingError } = await supabaseAdmin
      .from('payment_proofs')
      .select('id, user_id, subscription_plan_id, plan_id, membership_starts_at, membership_ends_at, uploaded_at, verified_at')
      .eq('id', id)
      .single()

    if (existingError) throw existingError
    if (!existingProof) throw new NotFoundError('Payment proof not found')

    // Prepare update data
    const updateData: any = {
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    if (status === 'verified') {
      const nowIso = new Date().toISOString()
      updateData.verified_at = nowIso

      // Rule:
      // - membership starts when admin approves (now)
      // - membership ends based on subscription plan duration
      const startsAt = nowIso

      // Get duration_days from subscription_plans.
      // Prefer subscription_plan_id, fallback to legacy plan_id mapping.
      let durationDays = 0

      if (existingProof.subscription_plan_id) {
        const { data: plan, error: planError } = await supabaseAdmin
          .from('subscription_plans')
          .select('duration_days')
          .eq('id', existingProof.subscription_plan_id)
          .single()
        if (planError) throw planError
        durationDays = Number(plan?.duration_days || 0)
      } else if (existingProof.plan_id) {
        const legacy = String(existingProof.plan_id).toLowerCase()
        // common legacy values
        if (legacy === 'monthly') durationDays = 30
        if (legacy === 'yearly') durationDays = 365

        if (!durationDays) {
          const { data: plan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('duration_days')
            .ilike('name', `%${legacy}%`)
            .order('duration_days', { ascending: true })
            .limit(1)
            .single()
          if (!planError && plan) durationDays = Number(plan.duration_days || 0)
        }
      }

      if (!durationDays || durationDays <= 0) {
        throw new ValidationError('Unable to determine membership duration from subscription plan')
      }

      const endDate = new Date(Date.parse(startsAt) + durationDays * 24 * 60 * 60 * 1000)
      updateData.membership_starts_at = startsAt
      updateData.membership_ends_at = endDate.toISOString()
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
          membership_starts_at: data.membership_starts_at || null,
          membership_ends_at: data.membership_ends_at || null,
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
          membership_starts_at: null,
          membership_ends_at: null,
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

    // Fetch subscription plan data if subscription_plan_id exists
    let subscriptionPlanData = null
    if (data.subscription_plan_id) {
      const { data: planData } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, name, price, duration_days, currency')
        .eq('id', data.subscription_plan_id)
        .single()

      if (planData) {
        subscriptionPlanData = planData
      }
    }

    // Add user data and subscription plan data to response
    const transformedData = {
      ...data,
      user: userData,
      subscription_plan: subscriptionPlanData
    }

    return NextResponse.json({ data: transformedData })
  } catch (error) {
    return handleApiError(error)
  }
}
