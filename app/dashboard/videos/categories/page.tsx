'use client'

import { useEffect } from 'react'
import VideoCategoryManagement from '../_components/VideoCategoryManagement'
import { PageHeader } from '../../../components/layout'
import { useVideoCategories } from '../../shared/hooks/useVideos'

export default function VideosCategoriesPage() {
  const { categories, isLoading, fetchCategories } = useVideoCategories()

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader
        title="Video Categories"
        showBackButton
        backHref="/dashboard/videos"
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
