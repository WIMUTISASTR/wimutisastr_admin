import { NextRequest, NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError, successResponse, NotFoundError, ValidationError } from '@/app/lib/errors'
import { createBookSchema, updateBookSchema, validateData } from '@/app/lib/validations'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// Create R2 S3 client
function getR2Client() {
  const r2AccountId = process.env.R2_ACCOUNT_ID
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
}

// GET - Fetch books with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`books:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const offset = (page - 1) * limit

    if (id) {
      // Fetch single book
      const { data, error } = await supabaseAdmin
        .from('books')
        .select('*, category:categories(id, name)')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Book not found')

      return successResponse(data)
    }

    // Fetch books with pagination
    const { data: books, error: booksError, count } = await supabaseAdmin
      .from('books')
      .select('*, category:categories(id, name)', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

// POST - Create a new book
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`books:post:${clientId}`, RATE_LIMITS.API_WRITE)

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(createBookSchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const bookData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Insert book
    const { data, error } = await supabaseAdmin
      .from('books')
      .insert([{
        title: bookData.title,
        year: bookData.year,
        description: bookData.description || null,
        author: bookData.author || null,
        file_name: bookData.file_name,
        file_url: bookData.file_url,
        file_size: bookData.file_size || null,
        cover_url: bookData.cover_url || null,
        category_id: bookData.category_id,
      }])
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update a book
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`books:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Book ID is required')
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(updateBookSchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const updateData: any = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Update book
    const { data, error } = await supabaseAdmin
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Book not found')

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete a book
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`books:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Book ID is required')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get book data first to delete files from storage
    const { data: book, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('file_url, cover_url')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!book) throw new NotFoundError('Book not found')

    // Delete files from R2 storage
    const r2BucketName = process.env.R2_BUCKET_NAME || 'books'
    const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
    
    // Helper function to extract key from URL
    const extractKeyFromUrl = (url: string): string => {
      let key = url
      if (r2PublicUrl && url.startsWith(r2PublicUrl)) {
        key = url.replace(r2PublicUrl, '').replace(/^\//, '')
      } else if (url.startsWith('http')) {
        const urlObj = new URL(url)
        key = urlObj.pathname.replace(/^\//, '')
      }
      return key
    }

    // Delete book file
    if (book.file_url) {
      try {
        const key = extractKeyFromUrl(book.file_url)
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: key,
          }))
        }
      } catch (error) {
        // Log but don't fail - file might already be deleted
        console.warn('Error deleting book file from R2:', error)
      }
    }

    // Delete cover image
    if (book.cover_url) {
      try {
        const key = extractKeyFromUrl(book.cover_url)
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: key,
          }))
        }
      } catch (error) {
        console.warn('Error deleting cover from R2:', error)
      }
    }

    // Delete book record from database
    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse({ success: true, message: 'Book deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
