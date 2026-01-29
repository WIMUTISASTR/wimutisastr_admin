import { useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../api'
import { Video, VideoCategory } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchVideos = async (page = 1, limit = 20) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiFetch(`/api/videos?page=${page}&limit=${limit}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch videos')
      }

      if (result.data) {
        setVideos(result.data)
      }

      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err)
      setError(err.message || 'Failed to fetch videos')
      toast.error(err.message || 'Failed to fetch videos')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteVideo = async (videoId: string) => {
    try {
      const response = await apiFetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete video')
      }

      setVideos(videos.filter(v => v.id !== videoId))
      toast.success('Video deleted successfully!')
      return true
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error(err.message || 'Failed to delete video')
      return false
    }
  }

  return {
    videos,
    isLoading,
    error,
    pagination,
    fetchVideos,
    deleteVideo,
    setVideos,
  }
}

export function useVideoCategories() {
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  const fetchCategories = async (page = 1, limit = 50) => {
    try {
      setIsLoading(true)
      const response = await apiFetch(`/api/video-categories?page=${page}&limit=${limit}`)
      const result = await response.json()
      if (response.ok && result.data) {
        setCategories(result.data)
      }
      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('Error fetching video categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    categories,
    isLoading,
    pagination,
    fetchCategories,
  }
}

