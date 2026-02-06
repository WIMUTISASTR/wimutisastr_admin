'use client'

import useSWR, { SWRConfiguration } from 'swr'
import { apiFetch } from './api'

// Default SWR configuration for the dashboard
export const swrConfig: SWRConfiguration = {
  // Revalidate on focus after 5 minutes of inactivity
  revalidateOnFocus: true,
  focusThrottleInterval: 5 * 60 * 1000, // 5 minutes
  
  // Don't revalidate on reconnect immediately
  revalidateOnReconnect: true,
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  
  // Don't automatically revalidate on mount if data exists
  revalidateIfStale: true,
  revalidateOnMount: true,
}

// Generic fetcher for SWR that uses our authenticated apiFetch
export async function fetcher<T>(url: string): Promise<T> {
  const response = await apiFetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch ${url}`)
  }
  
  return response.json()
}

// Fetcher that extracts data from { data: [...] } response format
export async function dataFetcher<T>(url: string): Promise<T> {
  const response = await apiFetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch ${url}`)
  }
  
  const json = await response.json()
  return json.data ?? json
}

// Hook for fetching paginated data
export function usePaginatedData<T>(
  baseUrl: string,
  page: number,
  limit: number,
  config?: SWRConfiguration
) {
  const url = `${baseUrl}?page=${page}&limit=${limit}`
  
  return useSWR<{ data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    url,
    fetcher,
    {
      ...swrConfig,
      ...config,
    }
  )
}

// Hook for fetching simple data lists
export function useDataList<T>(
  url: string | null,
  config?: SWRConfiguration
) {
  return useSWR<T>(
    url,
    url ? dataFetcher : null,
    {
      ...swrConfig,
      ...config,
    }
  )
}
