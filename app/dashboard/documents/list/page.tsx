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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePageChange = (page: number) => {
    fetchBooks(page, pagination.limit)
  }

  const handleEdit = (bookId: string) => {
    router.push(`/dashboard/documents/edit/${bookId}`)
  }

  return (
    <>
      <PageHeader
        title="ឯកសារ"
        showBackButton
        backHref="/dashboard/documents"
        action={
          <Button onClick={() => router.push('/dashboard/documents/upload')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ផ្ទុកឯកសារ
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
