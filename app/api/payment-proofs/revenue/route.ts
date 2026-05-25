import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, verifyAdminAuth } from '@/app/lib/auth-middleware'
import { handleApiError } from '@/app/lib/errors'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/app/lib/rate-limit'

function parseAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'))
  return Number.isFinite(n) ? n : 0
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const clientId = getClientIdentifier(request)
    checkRateLimit(`payment-proofs:revenue:${clientId}`, RATE_LIMITS.API_READ)

    const supabaseAdmin = getSupabaseAdmin()

    const { data: proofs, error } = await supabaseAdmin
      .from('payment_proofs')
      .select(
        'id, amount, status, uploaded_at, verified_at, file_type, subscription_plan_id, subscription_plans(id, name, price, currency)'
      )
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    const rows = proofs ?? []
    const now = new Date()
    const thisMonthKey = monthKey(now)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = monthKey(lastMonthDate)

    let totalRevenue = 0
    let thisMonthRevenue = 0
    let lastMonthRevenue = 0
    let verifiedCount = 0
    let pendingCount = 0
    let rejectedCount = 0
    let pendingAmount = 0

    const byPlanMap = new Map<string, { planId: string; planName: string; count: number; revenue: number }>()
    const byMonthMap = new Map<string, { revenue: number; count: number }>()
    const byMethodMap = { baray: { count: 0, revenue: 0 }, manual: { count: 0, revenue: 0 } }

    for (const row of rows) {
      const amount = parseAmount(row.amount)
      const status = row.status as string

      if (status === 'pending') {
        pendingCount++
        pendingAmount += amount
      } else if (status === 'rejected') {
        rejectedCount++
      } else if (status === 'verified') {
        verifiedCount++
        totalRevenue += amount

        const revenueDate = row.verified_at
          ? new Date(row.verified_at)
          : new Date(row.uploaded_at)
        const mKey = monthKey(revenueDate)

        if (mKey === thisMonthKey) thisMonthRevenue += amount
        if (mKey === lastMonthKey) lastMonthRevenue += amount

        const monthEntry = byMonthMap.get(mKey) ?? { revenue: 0, count: 0 }
        monthEntry.revenue += amount
        monthEntry.count++
        byMonthMap.set(mKey, monthEntry)

        const plan = row.subscription_plans as
          | { id: string; name: string; price: number; currency: string }
          | null
          | Array<{ id: string; name: string; price: number; currency: string }>
        const planData = Array.isArray(plan) ? plan[0] : plan
        const planId = planData?.id ?? row.subscription_plan_id ?? 'unknown'
        const planName = planData?.name ?? 'មិនស្គាល់'
        const planEntry = byPlanMap.get(planId) ?? {
          planId,
          planName,
          count: 0,
          revenue: 0,
        }
        planEntry.count++
        planEntry.revenue += amount
        byPlanMap.set(planId, planEntry)

        const isBaray = row.file_type === 'baray'
        const methodKey = isBaray ? 'baray' : 'manual'
        byMethodMap[methodKey].count++
        byMethodMap[methodKey].revenue += amount
      }
    }

    const monthlyRevenue = Array.from(byMonthMap.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)

    const revenueByPlan = Array.from(byPlanMap.values()).sort((a, b) => b.revenue - a.revenue)

    const monthTrend =
      lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : thisMonthRevenue > 0
          ? 100
          : 0

    const recentVerified = rows
      .filter((r) => r.status === 'verified')
      .slice(0, 10)
      .map((r) => {
        const plan = r.subscription_plans as
          | { id: string; name: string; price: number; currency: string }
          | null
          | Array<{ id: string; name: string; price: number; currency: string }>
        const planData = Array.isArray(plan) ? plan[0] : plan
        return {
          id: r.id,
          amount: parseAmount(r.amount),
          verified_at: r.verified_at ?? r.uploaded_at,
          file_type: r.file_type,
          plan_name: planData?.name ?? null,
        }
      })

    return NextResponse.json({
      data: {
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        monthTrend,
        verifiedCount,
        pendingCount,
        rejectedCount,
        pendingAmount,
        totalTransactions: rows.length,
        averageVerified:
          verifiedCount > 0 ? Math.round((totalRevenue / verifiedCount) * 100) / 100 : 0,
        revenueByPlan,
        monthlyRevenue,
        revenueByMethod: byMethodMap,
        recentVerified,
        currency: 'USD',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
