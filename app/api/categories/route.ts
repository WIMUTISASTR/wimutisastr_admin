import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyPinCookie } from '@/app/lib/auth-middleware'
import { handleApiError, successResponse, NotFoundError, ValidationError } from '@/app/lib/errors'
import { createCategorySchema, updateCategorySchema, validateData } from '@/app/lib/validations'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`categories:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Fetch single category
      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new NotFoundError('Category not found')

      return successResponse(data)
    }

    // Fetch all categories
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return successResponse(data || [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`categories:post:${clientId}`, RATE_LIMITS.API_WRITE)

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(createCategorySchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const categoryData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Check for duplicate name
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .ilike('name', categoryData.name)
      .single()

    if (existing) {
      throw new ValidationError('A category with this name already exists')
    }

    // Insert category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{
        name: categoryData.name,
        description: categoryData.description || null,
        cover_url: categoryData.cover_url || null,
      }])
      .select()
      .single()

    if (error) throw error

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`categories:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Category ID is required')
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(updateCategorySchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const updateData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Check for duplicate name (excluding current category)
    if (updateData.name) {
      const { data: existing } = await supabaseAdmin
        .from('categories')
        .select('id')
        .ilike('name', updateData.name)
        .neq('id', id)
        .single()

      if (existing) {
        throw new ValidationError('A category with this name already exists')
      }
    }

    // Update category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Category not found')

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    verifyPinCookie(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`categories:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Category ID is required')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check if category has associated books
    const { data: books, error: booksError } = await supabaseAdmin
      .from('books')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (booksError) throw booksError

    if (books && books.length > 0) {
      throw new ValidationError('Cannot delete category with associated books')
    }

    // Delete category
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse({ success: true, message: 'Category deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
