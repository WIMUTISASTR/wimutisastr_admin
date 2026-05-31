'use client'

import { useEffect } from 'react'
import { notify } from '@/lib/utils/notify'
import BookUploadForm from '../_components/BookUploadForm'
import { PageHeader } from '../../../components/layout'
import { useUploadQueue } from '@/app/contexts/UploadQueueContext'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsUploadPage() {
  const { categories, fetchCategories } = useCategories()
  const { enqueueDocumentUpload } = useUploadQueue()

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (bookData: {
    title: string
    author: string
    year: string
    description: string
    file: File | null
    category_id: string | null
    access_level: 'free' | 'members'
  }) => {
    if (!bookData.file) {
      throw new Error('File is required')
    }

    const category = categories.find((cat) => cat.id === bookData.category_id)
    const categoryName = category?.name ?? null
    const categoryId = bookData.category_id

    if (!categoryId) {
      throw new Error('Category is required')
    }

    enqueueDocumentUpload({
      title: bookData.title,
      author: bookData.author,
      year: bookData.year,
      description: bookData.description,
      category_id: categoryId,
      category_name: categoryName,
      file: bookData.file,
      access_level: bookData.access_level,
    })

    notify.info('បានចាប់ផ្ទុកឯកសារ — មើលវឌ្ឍនភាពក្នុងម៉ឺនុយ «ការផ្ទុក» ខាងលើ')
  }

  return (
    <>
      <PageHeader
        title="ផ្ទុកឯកសារ"
        showBackButton
        backHref="/dashboard/documents"
      />

      <div>
        <BookUploadForm onUpload={handleUpload} isLoading={false} categories={categories} />
      </div>
    </>
  )
}
