'use client'

import StatsCard from '../../components/StatsCard'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import QuickActionCard from '../../components/QuickActionCard'
import { useDashboardStats } from './hooks/useDashboardStats'
import { Icons } from './icons'

interface DashboardContentProps {
  onNavigate?: (menu: string) => void
}

const QUICK_ACTIONS = [
  {
    id: 'users',
    title: 'Manage Users',
    description: 'View and manage registered users',
    color: 'gold' as const,
    icon: Icons.Users,
  },
  {
    id: 'upload-document',
    title: 'Upload Document',
    description: 'Add new books and documents',
    color: 'blue' as const,
    icon: Icons.Upload,
  },
  {
    id: 'upload-video',
    title: 'Upload Video',
    description: 'Add new video content',
    color: 'purple' as const,
    icon: Icons.Video,
  },
] as const

export default function DashboardContent({ onNavigate }: DashboardContentProps) {
  const { stats, isLoading } = useDashboardStats()

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Monitor your platform's key metrics and activity"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.users}
          icon={Icons.Users}
          color="gold"
          isLoading={isLoading}
        />
        <StatsCard
          title="Documents"
          value={stats.documents}
          icon={Icons.Document}
          color="blue"
          isLoading={isLoading}
        />
        <StatsCard
          title="Videos"
          value={stats.videos}
          icon={Icons.Video}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all
          </button>
        </div>
        <EmptyState
          icon={Icons.Activity}
          title="No recent activity"
          description="User activities and system events will appear here"
        />
      </Card>
    </>
  )
}

