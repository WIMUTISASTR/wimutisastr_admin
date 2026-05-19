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
      header: 'គម្រោង',
      accessor: 'name',
      width: '25%',
      render: (value: unknown, row: SubscriptionPlan) => (
        <div>
          <div className="font-bold text-slate-900">{typeof value === 'string' ? value : row.name}</div>
          <div className="text-sm text-slate-600 mt-1 line-clamp-2">{row.description || 'គ្មានការពិពណ៌នា'}</div>
        </div>
      ),
    },
    {
      header: 'តម្លៃ',
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
      header: 'រយៈពេល',
      accessor: 'duration_days',
      width: '12%',
      render: (value: unknown) => (
        <div className="text-slate-900">
          {typeof value === 'number' ? (value === 30 ? '១ ខែ' : value === 365 ? '១ ឆ្នាំ' : `${value} ថ្ងៃ`) : '-'}
        </div>
      ),
    },
    {
      header: 'លក្ខណៈ',
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
                  <li className="text-slate-500">+{features.length - 2} បន្ថែម</li>
                )}
              </ul>
            ) : (
              <span className="text-slate-400">គ្មានលក្ខណៈ</span>
            )}
          </div>
        )
      },
    },
    {
      header: 'ស្ថានភាព',
      accessor: 'is_active',
      width: '10%',
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'error'} size="sm">
          {value ? 'សកម្ម' : 'អសកម្ម'}
        </Badge>
      ),
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '13%',
      render: (_value: unknown, row: SubscriptionPlan) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleEditPlan(row)}
            variant="secondary"
            size="sm"
            className="transform-none"
            aria-label="កែប្រែគម្រោង"
          >
            <UIIcons.Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleDeleteClick(row)}
            variant="danger"
            size="sm"
            className="transform-none"
            aria-label="លុបគម្រោង"
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
        title="គម្រោងជាវ"
        action={
          <Button onClick={handleNewPlan} size="md">
            <UIIcons.Plus className="w-5 h-5" />
            គម្រោងថ្មី
          </Button>
        }
      />

      <div className="mt-6">
        <Card padding="none">
          <DataTable<SubscriptionPlan>
            columns={columns}
            data={plans}
            isLoading={isLoading}
            emptyMessage="មិនទាន់មានគម្រោងជាវ"
            emptyDescription="បង្កើតគម្រោងជាវដំបូងរបស់អ្នក ដើម្បីចាប់ផ្តើម"
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
        title="លុបគម្រោងជាវ"
        message="តើអ្នកប្រាកដថាចង់លុបគម្រោងជាវនេះទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។"
        itemName={planToDelete?.name}
        isLoading={isDeleting}
      />
    </>
  )
}
