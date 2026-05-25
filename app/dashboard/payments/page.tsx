'use client'

import { useRouter } from 'next/navigation'
import HubSectionCard from '../../components/data-display/HubSectionCard'
import { PageHeader } from '../../components/layout'
import PaymentsNav from './_components/PaymentsNav'

export default function PaymentsHubPage() {
  const router = useRouter()

  const sections = [
    {
      title: 'ប្រវត្តិការទូទាត់',
      description: 'មើល និងគ្រប់គ្រងការទូទាត់របស់អ្នកប្រើទាំងអស់',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      href: '/dashboard/payments/history',
      color: 'navy' as const,
    },
    {
      title: 'ចំណូល',
      description: 'មើលចំណូលសរុប តាមខែ និងតាមគម្រោងសមាជិក',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      href: '/dashboard/payments/revenue',
      color: 'gold' as const,
    },
  ]

  return (
    <>
      <PageHeader
        title="ប្រវត្តិទូទាត់"
        description="គ្រប់គ្រងការទូទាត់ និងតាមដានចំណូល"
      />

      <PaymentsNav />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
