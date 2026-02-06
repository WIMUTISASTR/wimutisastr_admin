import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

function addDaysIso(startIso: string, days: number): string {
  const ms = Date.parse(startIso)
  const d = new Date(Number.isFinite(ms) ? ms : Date.now())
  const end = new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
  return end.toISOString()
}

async function getDurationDaysForUser(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string): Promise<number> {
  // Prefer the most recent pending proof (user just paid), otherwise fallback to latest verified.
  const { data: proof } = await supabaseAdmin
    .from('payment_proofs')
    .select('subscription_plan_id, plan_id, uploaded_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'verified'])
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (proof?.subscription_plan_id) {
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('duration_days')
      .eq('id', proof.subscription_plan_id)
      .single()
    if (planError) throw planError
    const days = Number(plan?.duration_days || 0)
    if (days > 0) return days
  }

  const legacy = String(proof?.plan_id || '').toLowerCase()
  if (legacy === 'monthly') return 30
  if (legacy === 'yearly') return 365

  // Last resort: use the first active plan by sort_order.
  const { data: defaultPlan } = await supabaseAdmin
    .from('subscription_plans')
    .select('duration_days')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return Number(defaultPlan?.duration_days || 0)
}

// GET - Fetch all users with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`users:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    // Fetch users from auth.users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit,
    })

    if (error) throw error

    // Fetch user profiles with membership status and expiry
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
        membership_ends_at: profile?.membership_ends_at || null,
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
    // Verify admin authentication
    await verifyAdminAuth(request)

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
    const updateData: Record<string, unknown> = {
      membership_status,
      membership_notes: membership_notes || null,
    }

    // Set appropriate timestamp based on status
    if (membership_status === 'approved') {
      const nowIso = new Date().toISOString()
      updateData.membership_approved_at = nowIso
      updateData.membership_denied_at = null

      // When admin approves in User Management:
      // membership starts NOW and ends based on plan duration.
      const durationDays = await getDurationDaysForUser(supabaseAdmin, userId)
      if (!durationDays || durationDays <= 0) {
        return NextResponse.json(
          { error: 'Cannot approve: no active subscription plan found for this user.' },
          { status: 400 }
        )
      }
      updateData.membership_starts_at = nowIso
      updateData.membership_ends_at = addDaysIso(nowIso, durationDays)
    } else if (membership_status === 'denied') {
      updateData.membership_denied_at = new Date().toISOString()
      updateData.membership_approved_at = null
      updateData.membership_starts_at = null
      updateData.membership_ends_at = null
    } else {
      // pending status clears both timestamps
      updateData.membership_approved_at = null
      updateData.membership_denied_at = null
      updateData.membership_starts_at = null
      updateData.membership_ends_at = null
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
    // Verify admin authentication
    await verifyAdminAuth(request)

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
