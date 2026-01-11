'use client'

import VideoCategoryManagement from '../_components/VideoCategoryManagement'
import { PageHeader } from '../../../components/layout'
import { useVideoCategories } from '../../shared/hooks/useVideos'

export default function VideosCategoriesPage() {
  const { categories, isLoading, fetchCategories } = useVideoCategories()

  return (
    <>
      <PageHeader
        title="Video Categories"
        description="Organize your videos with categories"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Videos', href: '/dashboard/videos' },
          { label: 'Categories' },
        ]}
      />

      <div className="mt-6">
        <VideoCategoryManagement
          categories={categories}
          isLoading={isLoading}
          onRefresh={fetchCategories}
        />
      </div>
    </>
  )
}
