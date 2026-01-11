'use client'

import CategoryManagement from '../_components/BookCategoryManagement'
import { PageHeader } from '../../../components/layout'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsCategoriesPage() {
  const { categories, isLoading, fetchCategories } = useCategories()

  return (
    <>
      <PageHeader
        title="Document Categories"
        description="Organize your documents with categories and subcategories"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents', href: '/dashboard/documents' },
          { label: 'Categories' },
        ]}
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
