'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookList from '../_components/BookList'
import { PageHeader } from '../../../components/layout'
import { useBooks } from '../../shared/hooks/useBooks'
import { Button } from '../../../components/ui'

export default function DocumentsListPage() {
  const router = useRouter()
  const { books, isLoading, pagination, fetchBooks, deleteBook } = useBooks()

  useEffect(() => {
    fetchBooks(1, 20)
  }, [fetchBooks])

  const handlePageChange = (page: number) => {
    fetchBooks(page, pagination.limit)
  }

  const handleEdit = (bookId: string) => {
    router.push(`/dashboard/documents/edit/${bookId}`)
  }

  return (
    <>
      <PageHeader
        title="Documents"
        description="Browse and manage your document library"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents', href: '/dashboard/documents' },
          { label: 'List' },
        ]}
        action={
          <Button onClick={() => router.push('/dashboard/documents/upload')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </Button>
        }
      />

      <div className="mt-6">
        <BookList
          books={books}
          isLoading={isLoading}
          onEdit={(book) => handleEdit(book.id)}
          onDelete={deleteBook}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  )
}
