'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CategoryList from '../_components/BookCategoryList'
import { PageHeader } from '../../../components/layout'
import { Button, UIIcons } from '../../../components/ui'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsCategoriesPage() {
  const router = useRouter()
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
        action={
          <Button onClick={() => router.push('/dashboard/documents/categories/create')}>
            <UIIcons.Plus className="w-5 h-5 mr-2" />
            New Category
          </Button>
        }
      />

      <div className="mt-6">
        <CategoryList
          categories={categories}
          isLoading={isLoading}
          onRefresh={fetchCategories}
        />
      </div>
    </>
  )
}
