import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

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

// GET - Fetch all videos
export async function GET(request: NextRequest) {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Fetch single video
      const { data, error } = await supabaseAdmin
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Fetch all videos with categories
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (videosError) {
      return NextResponse.json({ error: videosError.message }, { status: 500 })
    }

    // Fetch all categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('video_categories')
      .select('id, name')

    if (categoriesError) {
      console.warn('Error fetching categories:', categoriesError)
    }

    // Join categories with videos
    const videosWithCategories = videos?.map(video => ({
      ...video,
      category: categories?.find(cat => cat.id === video.category_id) || null
    })) || []

    return NextResponse.json({ data: videosWithCategories })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}

// POST - Create a new video
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

    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!body.file_url) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 })
    }

    if (!body.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('videos')
      .insert([{
        title: body.title.trim(),
        description: body.description?.trim() || null,
        file_name: body.file_name,
        file_url: body.file_url,
        file_size: body.file_size,
        thumbnail_url: body.thumbnail_url || null,
        category_id: body.category_id,
      }])
      .select()
      .single()

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
      error: error.message || 'Failed to create video' 
    }, { status: 500 })
  }
}

// PUT - Update a video
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    const body = await request.json()

    if (!body.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.title) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.category_id) updateData.category_id = body.category_id
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url

    const { data, error } = await supabaseAdmin
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

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
      error: error.message || 'Failed to update video' 
    }, { status: 500 })
  }
}

// DELETE - Delete a video
export async function DELETE(request: NextRequest) {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Get video data first to delete files from storage
    const { data: video, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('file_url, thumbnail_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Delete files from R2 storage
    const r2BucketName = process.env.R2_BUCKET_NAME!
    const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
    
    if (video.file_url && r2BucketName) {
      try {
        // Extract key from URL (e.g., "videos/video123.mp4" from "https://cdn.example.com/videos/video123.mp4")
        let key = video.file_url
        if (r2PublicUrl) {
          // Remove the public URL prefix to get the key
          key = video.file_url.replace(r2PublicUrl, '').replace(/^\//, '')
        } else {
          // Fallback: extract path after the last domain part
          const urlObj = new URL(video.file_url)
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
        console.error('Error deleting video file from R2:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    if (video.thumbnail_url && r2BucketName) {
      try {
        // Extract key from URL
        let key = video.thumbnail_url
        if (r2PublicUrl) {
          key = video.thumbnail_url.replace(r2PublicUrl, '').replace(/^\//, '')
        } else {
          const urlObj = new URL(video.thumbnail_url)
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
        console.error('Error deleting thumbnail from R2:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete video record
    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to delete video' 
    }, { status: 500 })
  }
}

