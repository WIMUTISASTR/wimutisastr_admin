import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'

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

interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[]
  isLoading: boolean
  error: string | null
  fetchPlans: (activeOnly?: boolean) => Promise<void>
  createPlan: (planData: Partial<SubscriptionPlan>) => Promise<boolean>
  updatePlan: (id: string, planData: Partial<SubscriptionPlan>) => Promise<boolean>
  deletePlan: (planId: string) => Promise<boolean>
}

export function useSubscriptionPlans(): UseSubscriptionPlansReturn {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async (activeOnly = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const url = activeOnly 
        ? '/api/subscription-plans?active_only=true'
        : '/api/subscription-plans'
      
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch subscription plans')
      }

      setPlans(result.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch subscription plans'
      setError(message)
      console.error('Error fetching subscription plans:', err)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createPlan = useCallback(async (planData: Partial<SubscriptionPlan>): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription plan')
      }

      toast.success('Subscription plan created successfully!')
      await fetchPlans()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription plan'
      console.error('Error creating subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [fetchPlans])

  const updatePlan = useCallback(async (id: string, planData: Partial<SubscriptionPlan>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/subscription-plans?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subscription plan')
      }

      toast.success('Subscription plan updated successfully!')
      await fetchPlans()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription plan'
      console.error('Error updating subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [fetchPlans])

  const deletePlan = useCallback(async (planId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/subscription-plans?id=${planId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete subscription plan')
      }

      toast.success('Subscription plan deleted successfully!')
      setPlans(prevPlans => prevPlans.filter(p => p.id !== planId))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription plan'
      console.error('Error deleting subscription plan:', err)
      toast.error(message)
      return false
    }
  }, [])

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  }
}
