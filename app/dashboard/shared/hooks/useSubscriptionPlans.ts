import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'react-toastify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  currency: string
  qr_code_url: string | null
  is_active: boolean
  features: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

interface SubscriptionPlansResponse {
  data: SubscriptionPlan[]
}

interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[]
  isLoading: boolean
  error: string | null
  fetchPlans: (activeOnly?: boolean) => void
  createPlan: (planData: Partial<SubscriptionPlan>) => Promise<boolean>
  updatePlan: (id: string, planData: Partial<SubscriptionPlan>) => Promise<boolean>
  deletePlan: (planId: string) => Promise<boolean>
  refetch: () => void
}

export function useSubscriptionPlans(): UseSubscriptionPlansReturn {
  const [activeOnly, setActiveOnly] = useState(false)

  const url = activeOnly 
    ? '/api/subscription-plans?active_only=true'
    : '/api/subscription-plans'

  const { data, error, isLoading, isValidating, mutate } = useSWR<SubscriptionPlansResponse>(
    url,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes for subscription plans
    }
  )

  const plans = data?.data || []

  const fetchPlans = useCallback((newActiveOnly = false) => {
    setActiveOnly(newActiveOnly)
  }, [])

  const createPlan = useCallback(async (planData: Partial<SubscriptionPlan>): Promise<boolean> => {
    try {
      const response = await apiFetch('/api/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription plan')
      }

      toast.success('Subscription plan created successfully!')
      mutate() // Refresh the list
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription plan'
      console.error('Error creating subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [mutate])

  const updatePlan = useCallback(async (id: string, planData: Partial<SubscriptionPlan>): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/subscription-plans?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subscription plan')
      }

      toast.success('Subscription plan updated successfully!')
      mutate() // Refresh the list
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription plan'
      console.error('Error updating subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [mutate])

  const deletePlan = useCallback(async (planId: string): Promise<boolean> => {
    const previousData = data

    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.filter(p => p.id !== planId)
        }
      },
      { revalidate: false }
    )

    try {
      const response = await apiFetch(`/api/subscription-plans?id=${planId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        mutate(previousData, { revalidate: false })
        throw new Error(result.error || 'Failed to delete subscription plan')
      }

      toast.success('Subscription plan deleted successfully!')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription plan'
      console.error('Error deleting subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [data, mutate])

  return {
    plans,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    refetch: () => mutate(),
  }
}
