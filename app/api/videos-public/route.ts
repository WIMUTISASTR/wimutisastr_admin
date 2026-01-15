import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyMembership } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch videos for members (requires approved membership)
export async function GET(request: NextRequest) {
  try {
    // Verify user has approved membership
    await verifyMembership(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`videos-public:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    if (id) {
      // Fetch single video
      const { data, error } = await supabaseAdmin
        .from('videos')
        .select('*, category:video_categories(id, name, cover_url)')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Video not found')

      return NextResponse.json({ data })
    }

    // Fetch videos with pagination
    const { data: videos, error: videosError, count } = await supabaseAdmin
      .from('videos')
      .select('*, category:video_categories(id, name, cover_url)', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (videosError) throw videosError

    return NextResponse.json({
      data: videos || [],
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
