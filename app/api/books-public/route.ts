import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyMembership } from '@/app/lib/auth-middleware'
import { handleApiError, NotFoundError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch books for members (requires approved membership)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const hasAuthToken = Boolean(authHeader?.replace('Bearer ', '').trim())

    // If token exists, require approved membership. If no token, allow free content only.
    if (hasAuthToken) {
      await verifyMembership(request)
    }

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`books-public:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    if (id) {
      // Fetch single book
      const query = supabaseAdmin
        .from('books')
        .select('*, category:categories(id, name)')
        .eq('id', id)

      if (!hasAuthToken) {
        query.eq('access_level', 'free')
      }

      const { data, error } = await query.single()

      if (error) throw error
      if (!data) throw new NotFoundError('Book not found')

      return NextResponse.json({ data })
    }

    // Fetch books with pagination
    const query = supabaseAdmin
      .from('books')
      .select('*, category:categories(id, name)', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!hasAuthToken) {
      query.eq('access_level', 'free')
    }

    const { data: books, error: booksError, count } = await query

    if (booksError) throw booksError

    return NextResponse.json({
      data: books || [],
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
