'use client'

import { useRouter } from 'next/navigation'
import HubSectionCard from '../../components/data-display/HubSectionCard'
import { PageHeader } from '../../components/layout'

export default function VideosPage() {
  const router = useRouter()

  const sections = [
    {
      title: 'បញ្ចូលវីដេអូ',
      description: 'បញ្ចូលវីដេអូថ្មីទៅក្នុងបណ្ណាល័យ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      href: '/dashboard/videos/upload',
      color: 'navy' as const,
    },
    {
      title: 'មើលវីដេអូទាំងអស់',
      description: 'រុករក និងគ្រប់គ្រងបណ្ណាល័យវីដេអូ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      href: '/dashboard/videos/list',
      color: 'gold' as const,
    },
    {
      title: 'គ្រប់គ្រងប្រភេទ',
      description: 'រៀបចំវីដេអូរបស់អ្នកតាមប្រភេទ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      href: '/dashboard/videos/categories',
      color: 'purple' as const,
    },
  ]

  return (
    <>
      <PageHeader
        title="វីដេអូ"
        description="បញ្ចូល រុករក និងរៀបចំបណ្ណាល័យមាតិកាវីដេអូ"
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
