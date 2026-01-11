'use client'

import { useRouter } from 'next/navigation'
import DashboardContent from './shared/DashboardContent'

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
