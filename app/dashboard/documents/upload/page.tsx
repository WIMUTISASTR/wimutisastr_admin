'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import BookUploadForm from '../_components/BookUploadForm'
import { UploadProgressModal } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { apiFetch, getAuthToken } from '../../shared/api'
import { useCategories } from '../../shared/hooks/useCategories'

export default function DocumentsUploadPage() {
  const router = useRouter()
  const { categories, fetchCategories } = useCategories()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Helper function to upload file with progress tracking (uses XHR for progress events)
  type UploadResult = {
    data?: {
      publicUrl?: string
      url?: string
    }
  }

  const uploadFileWithProgress = useCallback(async (
    formData: FormData,
    url: string,
    onProgress: (progress: number) => void
  ): Promise<UploadResult> => {
    const token = await getAuthToken()
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch {
            reject(new Error('Failed to parse response'))
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.error || 'Upload failed'))
          } catch {
            reject(new Error('Upload failed'))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open('POST', url)
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }
      xhr.send(formData)
    })
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

    setIsUploading(true)
    setIsProgressModalOpen(true)
    setUploadProgress(0)
    setUploadingFileName(bookData.file.name)
    
    try {
      const category = categories.find(cat => cat.id === bookData.category_id)
      const categoryName = category?.name || 'uncategorized'

      // Upload book file with progress tracking
      setUploadStep('កំពុងផ្ទុកឯកសារ...')
      
      // Prepare form data for document file
      const fileFormData = new FormData()
      fileFormData.append('file', bookData.file)
      fileFormData.append('bucket', 'documents')
      fileFormData.append('path', `documents/${bookData.file.name}`)
      if (bookData.category_id) {
        fileFormData.append('category_id', bookData.category_id)
        fileFormData.append('category_name', categoryName)
      }

      const fileUploadResult = await uploadFileWithProgress(
        fileFormData,
        '/api/storage/upload',
        (progress) => {
          const totalProgress = progress * 0.9
          setUploadProgress(totalProgress)
        }
      )

      const fileUrl = fileUploadResult.data?.publicUrl || fileUploadResult.data?.url || ''
      if (!fileUrl) {
        throw new Error('Failed to get file URL from upload response')
      }

      // Save book metadata
      setUploadStep('កំពុងរក្សាទុកព័ត៌មានឯកសារ...')
      setUploadProgress(90)

      const response = await apiFetch('/api/books', {
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
          cover_url: null,
          category_id: bookData.category_id || null,
          access_level: bookData.access_level,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save book to database')
      }

      setUploadProgress(100)
      setUploadStep('រួចរាល់!')

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500))

      setIsProgressModalOpen(false)
      toast.success('ឯកសារត្រូវបានផ្ទុកដោយជោគជ័យ!')
      router.push('/dashboard/documents/list')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload book'
      console.error('Upload error:', error)
      setIsProgressModalOpen(false)
      toast.error(message)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadStep('')
      setUploadingFileName('')
    }
  }

  return (
    <>
      <PageHeader
        title="ផ្ទុកឯកសារ"
        description="បន្ថែមឯកសារថ្មីទៅបណ្ណាល័យ — ជ្រើសឯកសារ បំពេញព័ត៌មាន រួចផ្ទុក"
        showBackButton
        backHref="/dashboard/documents"
      />

      <div>
        <BookUploadForm
          onUpload={handleUpload}
          isLoading={isUploading}
          categories={categories}
        />
      </div>

      <UploadProgressModal
        isOpen={isProgressModalOpen}
        progress={uploadProgress}
        currentStep={uploadStep}
        fileName={uploadingFileName}
        title="កំពុងផ្ទុកឯកសារ"
      />
    </>
  )
}
