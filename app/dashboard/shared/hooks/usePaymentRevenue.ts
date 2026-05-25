import useSWR from 'swr'
import { fetcher, swrConfig } from '../swr-config'

export interface RevenueByPlan {
  planId: string
  planName: string
  count: number
  revenue: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  count: number
}

export interface RecentVerifiedPayment {
  id: string
  amount: number
  verified_at: string
  file_type: string
  plan_name: string | null
}

export interface PaymentRevenueStats {
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  monthTrend: number
  verifiedCount: number
  pendingCount: number
  rejectedCount: number
  pendingAmount: number
  totalTransactions: number
  averageVerified: number
  revenueByPlan: RevenueByPlan[]
  monthlyRevenue: MonthlyRevenue[]
  revenueByMethod: {
    baray: { count: number; revenue: number }
    manual: { count: number; revenue: number }
  }
  recentVerified: RecentVerifiedPayment[]
  currency: string
}

interface PaymentRevenueResponse {
  data: PaymentRevenueStats
}

export function usePaymentRevenue() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<PaymentRevenueResponse>(
    '/api/payment-proofs/revenue',
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 2 * 60 * 1000,
    }
  )

  return {
    stats: data?.data ?? null,
    isLoading: isLoading || isValidating,
    error: error?.message ?? null,
    refetch: () => mutate(),
  }
}
