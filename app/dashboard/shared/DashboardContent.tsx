'use client'

import { StatsCard, QuickActionCard } from '../../components/data-display'
import { PageHeader } from '../../components/layout'
import { Card, EmptyState } from '../../components/ui'
import { useDashboardStats } from './hooks/useDashboardStats'
import { Icons } from './icons'

interface DashboardContentProps {
  onNavigate?: (menu: string) => void
}

const QUICK_ACTIONS = [
  {
    id: 'users',
    title: 'គ្រប់គ្រងអ្នកប្រើ',
    description: 'មើល និងគ្រប់គ្រងអ្នកប្រើប្រាស់ដែលបានចុះឈ្មោះ',
    color: 'navy' as const,
    icon: Icons.Users,
  },
  {
    id: 'upload-document',
    title: 'បញ្ចូលឯកសារ',
    description: 'បន្ថែមសៀវភៅ និងឯកសារថ្មី',
    color: 'gold' as const,
    icon: Icons.Upload,
  },
  {
    id: 'upload-video',
    title: 'បញ្ចូលវីដេអូ',
    description: 'បន្ថែមមាតិកាវីដេអូថ្មី',
    color: 'blue' as const,
    icon: Icons.Video,
  },
] as const

export default function DashboardContent({ onNavigate }: DashboardContentProps) {
  const { stats, isLoading } = useDashboardStats()

  return (
    <>
      <PageHeader
        title="ផ្ទាំងគ្រប់គ្រង"
        description="ទិដ្ឋភាពទូទៅនៃស្ថិតិវេទិកា និងសកម្មភាពរហ័ស"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatsCard
          title="អ្នកប្រើសរុប"
          value={stats.users}
          icon={Icons.Users}
          color="navy"
          isLoading={isLoading}
        />
        <StatsCard
          title="ឯកសារ"
          value={stats.documents}
          icon={Icons.Document}
          color="gold"
          isLoading={isLoading}
        />
        <StatsCard
          title="វីដេអូ"
          value={stats.videos}
          icon={Icons.Video}
          color="blue"
          isLoading={isLoading}
        />
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 font-heading">សកម្មភាពរហ័ស</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.id}
              title={action.title}
              description={action.description}
              color={action.color}
              onClick={() => onNavigate?.(action.id)}
              icon={action.icon}
            />
          ))}
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 font-heading">សកម្មភាពថ្មីៗ</h3>
        </div>
        <EmptyState
          icon={Icons.Activity}
          title="មិនមានសកម្មភាពថ្មីៗ"
          description="សកម្មភាពអ្នកប្រើ និងព្រឹត្តិការណ៍ប្រព័ន្ធនឹងបង្ហាញនៅទីនេះ"
        />
      </Card>
    </>
  )
}
