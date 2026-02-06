import { NextRequest } from 'next/server'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { z } from 'zod'

// Validation schemas
const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  description: z.string().optional().nullable(),
  price: z.number().positive('Price must be positive'),
  duration_days: z.number().int().positive('Duration must be a positive integer'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  qr_code_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  features: z.array(z.string()).optional().default([]),
  sort_order: z.number().int().optional().default(0),
})

const updatePlanSchema = createPlanSchema.partial()

// GET - Fetch subscription plans
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`subscription-plans:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const activeOnly = searchParams.get('active_only') === 'true'

    if (id) {
      // Fetch single plan
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Subscription plan not found')

      return successResponse(data)
    }

    // Fetch all plans
    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    // Filter by active status if requested
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: plans, error: plansError } = await query

    if (plansError) throw plansError

    return successResponse(plans || [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Create a new subscription plan
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`subscription-plans:post:${clientId}`, RATE_LIMITS.API_WRITE)

    const body = await request.json()
    
    // Validate request body
    const validation = createPlanSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map((e) => e.message).join(', '))
    }

    const planData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Insert subscription plan
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert([{
        name: planData.name,
        description: planData.description || null,
        price: planData.price,
        duration_days: planData.duration_days,
        currency: planData.currency,
        qr_code_url: planData.qr_code_url || null,
        is_active: planData.is_active,
        features: planData.features,
        sort_order: planData.sort_order,
      }])
      .select()
      .single()

    if (error) throw error

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update a subscription plan
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`subscription-plans:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Subscription plan ID is required')
    }

    const body = await request.json()
    
    // Validate request body
    const validation = updatePlanSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map((e) => e.message).join(', '))
    }

    const updateData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Update subscription plan
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Subscription plan not found')

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete a subscription plan
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`subscription-plans:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Subscription plan ID is required')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Delete subscription plan
    const { error: deleteError } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse({ success: true, message: 'Subscription plan deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
