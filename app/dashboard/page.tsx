'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// Dynamic import with skeleton for faster initial load
const DashboardContent = dynamic(() => import('./shared/DashboardContent'), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-200 rounded-xl" />
        ))}
      </div>
    </div>
  ),
  ssr: false,
})

export default function Dashboard() {
  const router = useRouter()

  const handleNavigate = (section: string) => {
    switch (section) {
      case 'users':
        router.push('/dashboard/users')
        break
      case 'upload-document':
        router.push('/dashboard/documents')
        break
      case 'upload-video':
        router.push('/dashboard/videos')
        break
      default:
        break
    }
  }

  return <DashboardContent onNavigate={handleNavigate} />
}
