'use client'

import dynamic from 'next/dynamic'
import { PageSkeleton } from '../../components/feedback'

// Dynamic import with loading skeleton for faster initial page load
const UsersContent = dynamic(() => import('./_components/UsersContent'), {
  loading: () => <PageSkeleton />,
  ssr: false, // Client-side only for faster hydration
})

export default function UsersPage() {
  return (
    <>
      <div className="mt-6">
        <UsersContent />
      </div>
    </>
  )
}
