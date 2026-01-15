'use client'

import { useRouter } from 'next/navigation'
import { Card } from '../../components/ui'
import { PageHeader } from '../../components/layout'

export default function VideosPage() {
  const router = useRouter()

  const sections = [
    {
      title: 'Upload Video',
      description: 'Upload new videos to your library',
      icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      href: '/dashboard/videos/upload',
      color: 'blue',
    },
    {
      title: 'View All Videos',
      description: 'Browse and manage your video library',
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      href: '/dashboard/videos/list',
      color: 'green',
    },
    {
      title: 'Manage Categories',
      description: 'Organize your videos with categories',
      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      href: '/dashboard/videos/categories',
      color: 'purple',
    },
  ]

  return (
    <>
      <PageHeader
        title="Video Management"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {sections.map((section) => (
          <div
            key={section.href}
            onClick={() => router.push(section.href)}
            className="cursor-pointer hover:-translate-y-1 transition-all duration-200"
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-200">
              <div
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center mb-4
                  ${section.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                  ${section.color === 'green' ? 'bg-green-50 text-green-600' : ''}
                  ${section.color === 'purple' ? 'bg-purple-50 text-purple-600' : ''}
                `}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{section.title}</h3>
              <p className="text-slate-600">{section.description}</p>
            </Card>
          </div>
        ))}
      </div>
    </>
  )
}
