'use client'

import dynamic from 'next/dynamic'
import { PageSkeleton } from '../../components/feedback'

const UsersContent = dynamic(() => import('./_components/UsersContent'), {
  loading: () => <PageSkeleton />,
  ssr: false,
})

export default function UsersPage() {
  return <UsersContent />
}
