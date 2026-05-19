'use client'

import { useRouter } from 'next/navigation'
import HubSectionCard from '../../components/data-display/HubSectionCard'
import { PageHeader } from '../../components/layout'

export default function DocumentsPage() {
  const router = useRouter()

  const sections = [
    {
      title: 'បញ្ចូលឯកសារ',
      description: 'បញ្ចូលឯកសារថ្មីទៅក្នុងបណ្ណាល័យ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      href: '/dashboard/documents/upload',
      color: 'navy' as const,
    },
    {
      title: 'មើលឯកសារទាំងអស់',
      description: 'រុករក និងគ្រប់គ្រងបណ្ណាល័យឯកសារ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/dashboard/documents/list',
      color: 'gold' as const,
    },
    {
      title: 'គ្រប់គ្រងប្រភេទ',
      description: 'រៀបចំឯកសាររបស់អ្នកតាមប្រភេទ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      href: '/dashboard/documents/categories',
      color: 'green' as const,
    },
  ]

  return (
    <>
      <PageHeader
        title="ឯកសារ"
        description="បញ្ចូល រុករក និងរៀបចំបណ្ណាល័យឯកសារច្បាប់"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((section) => (
          <HubSectionCard
            key={section.href}
            title={section.title}
            description={section.description}
            icon={section.icon}
            color={section.color}
            onClick={() => router.push(section.href)}
          />
        ))}
      </div>
    </>
  )
}
