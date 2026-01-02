import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Categories fetch error:', error)
      // If table doesn't exist, return empty array instead of error
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json({ data: [] })
      }
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Categories API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch categories',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{
        name: body.name.trim(),
        description: body.description?.trim() || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'A category with this name already exists' 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create category' 
    }, { status: 500 })
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'A category with this name already exists' 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update category' 
    }, { status: 500 })
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to delete category' 
    }, { status: 500 })
  }
}

