import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'
import { Video, VideoCategory } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface VideosResponse {
  data: Video[]
  pagination: PaginationInfo
}

export function useVideos() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data, error, isLoading, isValidating, mutate } = useSWR<VideosResponse>(
    `/api/videos?page=${page}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  const videos = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  const fetchVideos = useCallback((newPage = 1, newLimit = 20) => {
    setPage(newPage)
    setLimit(newLimit)
  }, [])

  const setVideos = useCallback((newVideos: Video[] | ((prev: Video[]) => Video[])) => {
    mutate(
      (current) => {
        if (!current) return current
        const updatedVideos = typeof newVideos === 'function' ? newVideos(current.data) : newVideos
        return { ...current, data: updatedVideos }
      },
      { revalidate: false }
    )
  }, [mutate])

  const deleteVideo = async (videoId: string) => {
    const previousData = data

    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.filter(v => v.id !== videoId)
        }
      },
      { revalidate: false }
    )

    try {
      const response = await apiFetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        mutate(previousData, { revalidate: false })
        throw new Error(result.error || 'Failed to delete video')
      }

      notify.success('វីដេអូត្រូវបានលុបដោយជោគជ័យ!')
      return true
    } catch (err: unknown) {
      console.error('Delete error:', err)
      const message = err instanceof Error ? err.message : 'លុបវីដេអូមិនជោគជ័យ។'
      notify.error(message)
      return false
    }
  }

  return {
    videos,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    pagination,
    fetchVideos,
    deleteVideo,
    setVideos,
    refetch: () => mutate(),
  }
}

interface VideoCategoriesResponse {
  data: VideoCategory[]
  pagination: PaginationInfo
}

export function useVideoCategories() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const { data, isLoading, mutate } = useSWR<VideoCategoriesResponse>(
    `/api/video-categories?page=${page}&limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes for categories (rarely change)
    }
  )

  const categories = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }

  const fetchCategories = useCallback((newPage = 1, newLimit = 50) => {
    setPage(newPage)
    setLimit(newLimit)
  }, [])

  return {
    categories,
    isLoading,
    pagination,
    fetchCategories,
    refetch: () => mutate(),
  }
}

