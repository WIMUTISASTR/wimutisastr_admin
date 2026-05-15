import { NextRequest, NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError, successResponse, NotFoundError, ValidationError } from '@/app/lib/errors'
import { createVideoSchema, updateVideoSchema, validateData } from '@/app/lib/validations'
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

// GET - Fetch videos with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`videos:get:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
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

      return successResponse(data)
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

// POST - Create a new video
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`videos:post:${clientId}`, RATE_LIMITS.API_WRITE)

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(createVideoSchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const videoData = validation.data
    const supabaseAdmin = getSupabaseAdmin()

    // Insert video
    const { data, error } = await supabaseAdmin
      .from('videos')
      .insert([{
        title: videoData.title,
        presented_by: videoData.presented_by || null,
        description: videoData.description || null,
        file_name: videoData.file_name,
        file_url: videoData.file_url,
        file_size: videoData.file_size || null,
        thumbnail_url: videoData.thumbnail_url || null,
        category_id: videoData.category_id,
        access_level: videoData.access_level,
      }])
      .select('*, category:video_categories(id, name, cover_url)')
      .single()

    if (error) throw error

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update a video
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`videos:put:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Video ID is required')
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateData(updateVideoSchema, body)
    
    if (!validation.success) {
      throw new ValidationError(validation.errors.join(', '))
    }

    const updateData: Record<string, unknown> = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Update video
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select('*, category:video_categories(id, name, cover_url)')
      .single()

    if (error) throw error
    if (!data) throw new NotFoundError('Video not found')

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete a video
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request)

    // Rate limiting
    const clientId = getClientIdentifier(request)
    checkRateLimit(`videos:delete:${clientId}`, RATE_LIMITS.API_WRITE)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Video ID is required')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get video data first to delete files from storage
    const { data: video, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('file_url, thumbnail_url')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!video) throw new NotFoundError('Video not found')

    // Delete files from R2 storage
    const r2VideoBucketName = process.env.R2_VIDEO_BUCKET_NAME || 'video'
    const r2VideoPublicUrl = process.env.R2_VIDEO_PUBLIC_URL || ''
    const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
    
    // Helper function to extract key from URL
    const extractKeyFromUrl = (url: string): string => {
      let key = url
      if (r2VideoPublicUrl && url.startsWith(r2VideoPublicUrl)) {
        key = url.replace(r2VideoPublicUrl, '').replace(/^\//, '')
      } else if (r2PublicUrl && url.startsWith(r2PublicUrl)) {
        key = url.replace(r2PublicUrl, '').replace(/^\//, '')
      } else if (url.startsWith('http')) {
        const urlObj = new URL(url)
        const queryKey = urlObj.searchParams.get('key')
        key = queryKey ? queryKey : urlObj.pathname.replace(/^\//, '')
      }
      return key
    }

    // Delete video file
    if (video.file_url) {
      try {
        const key = extractKeyFromUrl(video.file_url)
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2VideoBucketName,
            Key: key,
          }))
        }
      } catch (error) {
        // Log but don't fail - file might already be deleted
        console.warn('Error deleting video file from R2:', error)
      }
    }

    // Delete thumbnail
    if (video.thumbnail_url) {
      try {
        const key = extractKeyFromUrl(video.thumbnail_url)
        if (key) {
          const s3Client = getR2Client()
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2VideoBucketName,
            Key: key,
          }))
        }
      } catch (error) {
        console.warn('Error deleting thumbnail from R2:', error)
      }
    }

    // Delete video record from database
    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse({ success: true, message: 'Video deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
