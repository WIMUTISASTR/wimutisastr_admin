import useSWR from 'swr'
import { apiFetch } from '../api'
import { swrConfig } from '../swr-config'

interface DashboardStats {
  users: number
  documents: number
  videos: number
}

interface UseDashboardStatsReturn {
  stats: DashboardStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Custom fetcher that fetches all stats in parallel
async function statsFetcher(): Promise<DashboardStats> {
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

  return {
    users: usersData.data?.length || usersData.pagination?.total || 0,
    documents: booksData.data?.length || 0,
    videos: videosData.data?.length || 0,
  }
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    'dashboard-stats', // Static key since we're fetching multiple endpoints
    statsFetcher,
    {
      ...swrConfig,
      // Keep stats fresh for 5 minutes
      dedupingInterval: 5 * 60 * 1000,
      // Revalidate every 5 minutes in background
      refreshInterval: 5 * 60 * 1000,
    }
  )

  return {
    stats: data || { users: 0, documents: 0, videos: 0 },
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  }
}

