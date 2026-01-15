import { useState } from 'react'
import { toast } from 'react-toastify'
import { PaymentProof } from '../types'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function usePaymentProofs() {
  const [proofs, setProofs] = useState<PaymentProof[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchProofs = async (page = 1, limit = 20, status?: 'pending' | 'verified' | 'rejected') => {
    try {
      setIsLoading(true)
      setError(null)
      
      let url = `/api/payment-proofs?page=${page}&limit=${limit}`
      if (status) {
        url += `&status=${status}`
      }
      
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment proofs')
      }

      if (result.data) {
        setProofs(result.data)
      }

      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (err: any) {
      console.error('Error fetching payment proofs:', err)
      setError(err.message || 'Failed to fetch payment proofs')
      toast.error(err.message || 'Failed to fetch payment proofs')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProofStatus = async (
    proofId: string,
    status: 'verified' | 'rejected',
    notes?: string,
    membership_starts_at?: string,
    membership_ends_at?: string
  ) => {
    try {
      const response = await fetch(`/api/payment-proofs?id=${proofId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes,
          membership_starts_at,
          membership_ends_at,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment proof')
      }

      // Update the proof in the local state
      setProofs(proofs.map(p => p.id === proofId ? result.data : p))
      
      toast.success(`Payment proof ${status === 'verified' ? 'approved' : 'rejected'} successfully!`)
      return true
    } catch (err: any) {
      console.error('Update error:', err)
      toast.error(err.message || 'Failed to update payment proof')
      return false
    }
  }

  return {
    proofs,
    isLoading,
    error,
    pagination,
    fetchProofs,
    updateProofStatus,
    setProofs,
  }
}
