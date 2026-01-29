import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'

interface DashboardStats {
  users: number
  documents: number
  videos: number
}

interface UseDashboardStatsReturn {
  stats: DashboardStats
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    documents: 0,
    videos: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [usersResponse, booksResponse, videosResponse] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/books'),
        apiFetch('/api/videos'),
      ])

      const [usersData, booksData, videosData] = await Promise.all([
        usersResponse.json(),
        booksResponse.json(),
        videosResponse.json(),
      ])

      setStats({
        users: usersData.data?.length || 0,
        documents: booksData.data?.length || 0,
        videos: videosData.data?.length || 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats'
      setError(message)
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  }
}

