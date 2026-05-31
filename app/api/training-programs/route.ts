import { NextRequest } from 'next/server'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError, ValidationError, successResponse } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'
import { z } from 'zod'

const programTypeSchema = z.enum(['course', 'event', 'workshop'])

const createProgramSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  program_type: programTypeSchema.default('course'),
  description: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  event_start_at: z.string().datetime().optional().nullable(),
  event_end_at: z.string().datetime().optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  instructor: z.string().max(200).optional().nullable(),
  highlights: z.array(z.string()).optional().default([]),
  cta_label: z.string().max(80).optional().nullable(),
  cta_url: z.string().max(500).optional().nullable(),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().optional().default(0),
})

const updateProgramSchema = createProgramSchema.partial()

function toDbRow(data: z.infer<typeof createProgramSchema>) {
  return {
    title: data.title,
    program_type: data.program_type,
    description: data.description ?? null,
    cover_url: data.cover_url ?? null,
    event_start_at: data.event_start_at ?? null,
    event_end_at: data.event_end_at ?? null,
    location: data.location ?? null,
    instructor: data.instructor ?? null,
    highlights: data.highlights ?? [],
    cta_label: data.cta_label?.trim() || 'សួរព័ត៌មាន',
    cta_url: data.cta_url?.trim() || '/contact',
    is_published: data.is_published,
    sort_order: data.sort_order ?? 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`training-programs:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const publishedOnly = searchParams.get('published_only') === 'true'

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('training_programs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Training program not found')

      return successResponse(data)
    }

    let query = supabaseAdmin
      .from('training_programs')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (publishedOnly) {
      query = query.eq('is_published', true)
    }

    const { data: programs, error: programsError } = await query

    if (programsError) throw programsError

    return successResponse(programs || [])
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`training-programs:post:${clientId}`, RATE_LIMITS.API_WRITE)

    const body = await request.json()
    const validation = createProgramSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map((e) => e.message).join(', '))
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('training_programs')
      .insert([toDbRow(validation.data)])
      .select()
      .single()

    if (error) throw error

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`training-programs:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Training program ID is required')
    }

    const body = await request.json()
    const validation = updateProgramSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map((e) => e.message).join(', '))
    }

    const updatePayload: Record<string, unknown> = { ...validation.data }
    if (validation.data.highlights === undefined) {
      delete updatePayload.highlights
    }
    if (validation.data.cta_label !== undefined) {
      updatePayload.cta_label = validation.data.cta_label?.trim() || 'សួរព័ត៌មាន'
    }
    if (validation.data.cta_url !== undefined) {
      updatePayload.cta_url = validation.data.cta_url?.trim() || '/contact'
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('training_programs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Training program not found')

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`training-programs:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Training program ID is required')
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: deleteError } = await supabaseAdmin
      .from('training_programs')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse({ success: true, message: 'Training program deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
