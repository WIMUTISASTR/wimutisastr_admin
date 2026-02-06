'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button, UIIcons } from '../../components/ui'
import { DataTable } from '../../components/data-display'
import { DeleteConfirmationModal } from '../../components/feedback'
import { useSubscriptionPlans, SubscriptionPlan } from '../shared/hooks/useSubscriptionPlans'

export default function SubscriptionsPage() {
  const router = useRouter()
  const { plans, isLoading, fetchPlans, deletePlan } = useSubscriptionPlans()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleNewPlan = () => {
    router.push('/dashboard/subscriptions/create')
  }

  const handleEditPlan = (plan: SubscriptionPlan) => {
    router.push(`/dashboard/subscriptions/edit/${plan.id}`)
  }

  const handleDeleteClick = (plan: SubscriptionPlan) => {
    setPlanToDelete({ id: plan.id, name: plan.name })
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return

    try {
      setIsDeleting(true)
      await deletePlan(planToDelete.id)
      setDeleteModalOpen(false)
      setPlanToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    {
      header: 'Plan',
      accessor: 'name',
      width: '25%',
      render: (value: unknown, row: SubscriptionPlan) => (
        <div>
          <div className="font-bold text-slate-900">{typeof value === 'string' ? value : row.name}</div>
          <div className="text-sm text-slate-600 mt-1 line-clamp-2">{row.description || 'No description'}</div>
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: 'price',
      width: '15%',
      render: (value: unknown, row: SubscriptionPlan) => {
        if (typeof value !== 'number') {
          return <div className="font-bold text-slate-900">-</div>
        }
        return (
          <div className="font-bold text-slate-900">
            {row.currency} ${value.toFixed(2)}
          </div>
        )
      },
    },
    {
      header: 'Duration',
      accessor: 'duration_days',
      width: '12%',
      render: (value: unknown) => (
        <div className="text-slate-900">
          {typeof value === 'number' ? (value === 30 ? '1 Month' : value === 365 ? '1 Year' : `${value} Days`) : '-'}
        </div>
      ),
    },
    {
      header: 'Features',
      accessor: 'features',
      width: '25%',
      render: (value: unknown) => {
        const features = Array.isArray(value) ? value : []
        return (
          <div className="text-sm text-slate-600">
            {features.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {features.slice(0, 2).map((feature, i) => (
                  <li key={i} className="truncate">{feature}</li>
                ))}
                {features.length > 2 && (
                  <li className="text-slate-500">+{features.length - 2} more</li>
                )}
              </ul>
            ) : (
              <span className="text-slate-400">No features</span>
            )}
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessor: 'is_active',
      width: '10%',
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'error'} size="sm">
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '13%',
      render: (_value: unknown, row: SubscriptionPlan) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleEditPlan(row)}
            variant="secondary"
            size="sm"
            className="transform-none"
            aria-label="Edit plan"
          >
            <UIIcons.Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleDeleteClick(row)}
            variant="danger"
            size="sm"
            className="transform-none"
            aria-label="Delete plan"
          >
            <UIIcons.Delete className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        action={
          <Button onClick={handleNewPlan} size="md">
            <UIIcons.Plus className="w-5 h-5" />
            New Plan
          </Button>
        }
      />

      <div className="mt-6">
        <Card padding="none">
          <DataTable<SubscriptionPlan>
            columns={columns}
            data={plans}
            isLoading={isLoading}
            emptyMessage="No subscription plans created yet"
            emptyDescription="Create your first subscription plan to get started"
            emptyIcon={
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscription Plan"
        message="Are you sure you want to delete this subscription plan? This action cannot be undone."
        itemName={planToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}
