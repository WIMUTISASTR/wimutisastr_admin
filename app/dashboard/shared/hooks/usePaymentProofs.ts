import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'react-toastify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'
import { PaymentProof } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaymentProofsResponse {
  data: PaymentProof[]
  pagination: PaginationInfo
}

export function usePaymentProofs() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected' | undefined>(undefined)

  // Build URL with optional status filter
  const url = status 
    ? `/api/payment-proofs?page=${page}&limit=${limit}&status=${status}`
    : `/api/payment-proofs?page=${page}&limit=${limit}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<PaymentProofsResponse>(
    url,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 60 * 1000, // 1 minute for payments (more frequent updates)
    }
  )

  const proofs = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  const fetchProofs = useCallback((newPage = 1, newLimit = 20, newStatus?: 'pending' | 'verified' | 'rejected') => {
    setPage(newPage)
    setLimit(newLimit)
    setStatus(newStatus)
  }, [])

  const setProofs = useCallback((newProofs: PaymentProof[] | ((prev: PaymentProof[]) => PaymentProof[])) => {
    mutate(
      (current) => {
        if (!current) return current
        const updatedProofs = typeof newProofs === 'function' ? newProofs(current.data) : newProofs
        return { ...current, data: updatedProofs }
      },
      { revalidate: false }
    )
  }, [mutate])

  const updateProofStatus = async (
    proofId: string,
    newStatus: 'verified' | 'rejected',
    notes?: string,
    membership_starts_at?: string,
    membership_ends_at?: string
  ) => {
    try {
      const response = await apiFetch(`/api/payment-proofs?id=${proofId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
          membership_starts_at,
          membership_ends_at,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment proof')
      }

      // Update the proof in the cache
      mutate(
        (current) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.map(p => p.id === proofId ? result.data : p)
          }
        },
        { revalidate: false }
      )
      
      toast.success(`Payment proof ${newStatus === 'verified' ? 'approved' : 'rejected'} successfully!`)
      return true
    } catch (err: unknown) {
      console.error('Update error:', err)
      const message = err instanceof Error ? err.message : 'Failed to update payment proof'
      toast.error(message)
      return false
    }
  }

  return {
    proofs,
    isLoading: isLoading || isValidating,
    error: error?.message || null,
    pagination,
    fetchProofs,
    updateProofStatus,
    setProofs,
    refetch: () => mutate(),
  }
}
