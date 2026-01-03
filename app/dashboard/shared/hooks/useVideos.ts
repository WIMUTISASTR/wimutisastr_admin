import { useState } from 'react'
import { toast } from 'react-toastify'
import { Video, VideoCategory } from '../types'

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVideos = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/videos')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch videos')
      }

      if (result.data) {
        setVideos(result.data)
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
      const response = await fetch(`/api/videos?id=${videoId}`, {
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
    fetchVideos,
    deleteVideo,
    setVideos,
  }
}

export function useVideoCategories() {
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/video-categories')
      const result = await response.json()
      if (response.ok && result.data) {
        setCategories(result.data)
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
    fetchCategories,
  }
}

