'use client'

import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import BookUploadForm from '../_components/BookUploadForm'
import { PageHeader } from '../../../components/layout'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsUploadPage() {
  const router = useRouter()
  const { categories } = useCategories()

  const handleUpload = async (bookData: {
    title: string
    author: string
    year: string
    description: string
    file: File | null
    cover: File | null
    category_id: string | null
  }) => {
    if (!bookData.file) {
      throw new Error('File is required')
    }

    try {
      const category = categories.find(cat => cat.id === bookData.category_id)
      const categoryName = category?.name || 'uncategorized'

      // Upload book file
      const fileUrl = await uploadFile(bookData.file, 'documents', bookData.category_id, categoryName)

      // Upload cover if provided
      let coverUrl: string | null = null
      if (bookData.cover) {
        coverUrl = await uploadFile(bookData.cover, 'covers', bookData.category_id, categoryName)
      }

      // Save book metadata
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
          year: bookData.year,
          description: bookData.description || null,
          file_name: bookData.file.name,
          file_url: fileUrl,
          file_size: bookData.file.size,
          cover_url: coverUrl,
          category_id: bookData.category_id || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save book to database')
      }

      toast.success('Book uploaded successfully!')
      router.push('/dashboard/documents/list')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload book'
      console.error('Upload error:', error)
      toast.error(message)
      throw error
    }
  }

  return (
    <>
      <PageHeader
        title="Upload Document"
        description="Add a new document to your library"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents', href: '/dashboard/documents' },
          { label: 'Upload' },
        ]}
      />

      <div className="mt-6">
        <BookUploadForm
          onUpload={handleUpload}
          isLoading={false}
          categories={categories}
        />
      </div>
    </>
  )
}

/**
 * Helper function to upload files to storage
 */
async function uploadFile(
  file: File,
  folder: string,
  categoryId: string | null,
  categoryName: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', folder === 'covers' ? 'documents' : 'documents')
  formData.append('path', filePath)
  
  if (categoryId) {
    formData.append('category_id', categoryId)
    formData.append('category_name', categoryName)
  }

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Failed to upload ${folder}`)
  }

  return result.publicUrl
}
