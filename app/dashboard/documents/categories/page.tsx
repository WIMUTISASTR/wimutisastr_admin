'use client'

import { useEffect } from 'react'
import CategoryManagement from '../_components/BookCategoryManagement'
import { PageHeader } from '../../../components/layout'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsCategoriesPage() {
  const { categories, isLoading, fetchCategories } = useCategories()

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader
        title="Document Categories"
        showBackButton
        backHref="/dashboard/documents"
      />

      <div className="mt-6">
        <CategoryManagement
          categories={categories}
          isLoading={isLoading}
          onRefresh={fetchCategories}
        />
      </div>
    </>
  )
}
