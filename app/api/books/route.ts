import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Create admin client with service role key (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present but invalid' : 'Missing')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your .env file.')
  }

  console.log('Creating Supabase admin client with service role key (length:', supabaseServiceKey.length, ')')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Create R2 S3 client (R2 is S3-compatible)
function getR2Client() {
  const r2AccountId = process.env.R2_ACCOUNT_ID!
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!

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

// GET - Fetch all books
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Fetch books
    const { data: books, error: booksError } = await supabaseAdmin
      .from('books')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (booksError) {
      return NextResponse.json({ error: booksError.message }, { status: 500 })
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name')

    // Create a map of category_id to category for quick lookup
    const categoryMap = new Map()
    if (categories && !categoriesError) {
      categories.forEach(cat => {
        categoryMap.set(cat.id, { id: cat.id, name: cat.name })
      })
    }

    // Join books with categories
    const booksWithCategories = books?.map(book => ({
      ...book,
      category: book.category_id ? categoryMap.get(book.category_id) || null : null
    })) || []

    return NextResponse.json({ data: booksWithCategories })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch books' }, { status: 500 })
  }
}

// POST - Insert a new book
export async function POST(request: NextRequest) {
  try {
    // Check if service role key is configured
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing or not configured')
      return NextResponse.json(
        { 
          error: 'Service role key not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.',
          hint: 'Get it from: Supabase Dashboard > Settings > API > service_role key'
        },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    if (!body.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    console.log('Inserting book with data:', { 
      title: body.title, 
      author: body.author, 
      year: body.year,
      category_id: body.category_id
    })

    const { data: insertedBook, error } = await supabaseAdmin
      .from('books')
      .insert([{
        title: body.title,
        author: body.author,
        year: parseInt(body.year),
        description: body.description || null,
        file_name: body.file_name,
        file_url: body.file_url,
        file_size: body.file_size,
        cover_url: body.cover_url || null,
        category_id: body.category_id || null,
      }])
      .select('*')
      .single()

    // Fetch category if category_id exists
    let category = null
    if (insertedBook?.category_id) {
      const { data: categoryData } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('id', insertedBook.category_id)
        .single()
      
      if (categoryData) {
        category = { id: categoryData.id, name: categoryData.name }
      }
    }

    const data = insertedBook ? { ...insertedBook, category } : null

    if (error) {
      console.error('Database insert error:', error)
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
      error: error.message || 'Failed to create book',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// PUT - Update a book
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
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    if (!body.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const { data: updatedBook, error } = await supabaseAdmin
      .from('books')
      .update({
        title: body.title,
        author: body.author,
        year: parseInt(body.year),
        description: body.description || null,
        cover_url: body.cover_url || null,
        category_id: body.category_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select('*')
      .single()

    // Fetch category if category_id exists
    let category = null
    if (updatedBook?.category_id) {
      const { data: categoryData } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('id', updatedBook.category_id)
        .single()
      
      if (categoryData) {
        category = { id: categoryData.id, name: categoryData.name }
      }
    }

    const data = updatedBook ? { ...updatedBook, category } : null

    if (error) {
      console.error('Database update error:', error)
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
      error: error.message || 'Failed to update book' 
    }, { status: 500 })
  }
}

// DELETE - Delete a book
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    // Get book info first to delete files from storage
    const { data: book, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('file_url, cover_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Delete files from R2 storage
    const r2BucketName = process.env.R2_BUCKET_NAME!
    const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
    
    // Delete book file from R2 if exists
    if (book?.file_url && r2BucketName) {
      try {
        // Extract key from URL (e.g., "documents/book123.pdf" from "https://cdn.example.com/documents/book123.pdf")
        let key = book.file_url
        if (r2PublicUrl) {
          // Remove the public URL prefix to get the key
          key = book.file_url.replace(r2PublicUrl, '').replace(/^\//, '')
        } else {
          // Fallback: extract path after the last domain part
          const urlObj = new URL(book.file_url)
          key = urlObj.pathname.replace(/^\//, '')
        }
        
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: key,
          }))
        }
      } catch (error) {
        console.error('Error deleting book file from R2:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete cover from R2 if exists
    if (book?.cover_url && r2BucketName) {
      try {
        // Extract key from URL
        let key = book.cover_url
        if (r2PublicUrl) {
          key = book.cover_url.replace(r2PublicUrl, '').replace(/^\//, '')
        } else {
          const urlObj = new URL(book.cover_url)
          key = urlObj.pathname.replace(/^\//, '')
        }
        
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: key,
          }))
        }
      } catch (error) {
        console.error('Error deleting cover from R2:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete book' }, { status: 500 })
  }
}

