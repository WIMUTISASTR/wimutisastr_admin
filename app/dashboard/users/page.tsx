'use client'

import UsersContent from './_components/UsersContent'
import { PageHeader } from '../../components/layout'

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="User Management"
        description="View and manage registered users"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Users' },
        ]}
      />

      <div className="mt-6">
        <UsersContent />
      </div>
    </>
  )
}
