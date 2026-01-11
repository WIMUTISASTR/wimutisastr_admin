'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { Book, Category } from '../../../shared/types'
import { formatFileSize } from '../../../shared/utils'
import { useZodForm } from '@/app/lib/useZodForm'
import { Button } from '../../../../components/ui'
import { PageHeader } from '../../../../components/layout'
import { useCategories } from '../../../shared/hooks/useCategories'

export default function EditDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string
  const { categories } = useCategories()
  
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>('')

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
        author: z.string().min(1, 'Author is required').max(100, 'Author name must be less than 100 characters').trim(),
        year: z.coerce.number()
          .int('Year must be a whole number')
          .min(1000, 'Year must be a valid 4-digit year')
          .max(9999, 'Year must be a valid 4-digit year'),
        description: z
          .string()
          .max(1000, 'Description must be less than 1000 characters')
          .optional()
          .nullable(),
        category_id: z.string().uuid('Category is required').optional(),
      }),
    []
  )

  const form = useZodForm(formSchema, {
    title: '',
    author: '',
    year: '' as any,
    description: '',
    category_id: '',
  } as any)
  const { reset } = form

  // Get main categories (categories without parent_id)
  const mainCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent_id)
  }, [categories])

  // Get subcategories for selected main category
  const availableSubcategories = useMemo(() => {
    if (!selectedMainCategoryId) return []
    return categories.filter(cat => cat.parent_id === selectedMainCategoryId)
  }, [categories, selectedMainCategoryId])

  const bookInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setIsFetching(true)
        const response = await fetch(`/api/books?id=${bookId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch book')
        }

        if (result.data) {
          setBook(result.data)
        }
      } catch (error) {
        console.error('Fetch error:', error)
        toast.error('Failed to load book')
        router.push('/dashboard/documents/list')
      } finally {
        setIsFetching(false)
      }
    }

    if (bookId) {
      fetchBook()
    }
  }, [bookId, router])

  // Initialize form when book changes
  useEffect(() => {
    if (book) {
      reset({
        title: book.title,
        author: book.author,
        year: (book.year as any) ?? '',
        description: book.description || '',
        category_id: '',
      } as any)
      setCoverFile(null)
      setBookFile(null)
    }
  }, [book, reset])

  // Initialize category selection
  useEffect(() => {
    if (book?.category_id && categories.length > 0) {
      const currentCategory = categories.find(cat => cat.id === book.category_id)
      if (currentCategory) {
        if (currentCategory.parent_id) {
          setSelectedMainCategoryId(currentCategory.parent_id)
          const timer = setTimeout(() => {
            form.setValue('category_id' as any, book.category_id)
          }, 10)
          return () => clearTimeout(timer)
        } else {
          setSelectedMainCategoryId(book.category_id)
          form.setValue('category_id' as any, '')
        }
      } else {
        setSelectedMainCategoryId('')
        form.setValue('category_id' as any, '')
      }
    } else {
      setSelectedMainCategoryId('')
      form.setValue('category_id' as any, '')
    }
  }, [book?.category_id, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!book) return

    try {
      setIsLoading(true)

      const validated = form.validate({
        title: (form.values as any).title,
        author: (form.values as any).author,
        year: (form.values as any).year,
        description: ((form.values as any).description || '').trim()
          ? (form.values as any).description
          : null,
        category_id: (form.values as any).category_id,
      })

      if (!validated.success) {
        toast.error('Please fix the highlighted fields.')
        return
      }

      const finalCategoryId = (validated.data.category_id as string) || selectedMainCategoryId
      const category = categories.find(cat => cat.id === finalCategoryId) || book?.category
      const categoryName = category?.name || 'uncategorized'

      let coverUrl = book.cover_url
      let fileUrl = book.file_url
      let fileName = book.file_name
      let fileSize = book.file_size

      // Upload new book file if provided
      if (bookFile) {
        const fileExt = bookFile.name.split('.').pop()
        const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `documents/${newFileName}`

        const fileFormData = new FormData()
        fileFormData.append('file', bookFile)
        fileFormData.append('bucket', 'documents')
        fileFormData.append('path', filePath)
        if (finalCategoryId) {
          fileFormData.append('category_id', finalCategoryId)
          fileFormData.append('category_name', categoryName)
        }

        const fileUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        })

        const fileUploadResult = await fileUploadResponse.json()

        if (fileUploadResponse.ok) {
          fileUrl = fileUploadResult.publicUrl
          fileName = bookFile.name
          fileSize = bookFile.size
        } else {
          throw new Error(fileUploadResult.error || 'Failed to upload new book file')
        }
      }

      // Upload new cover if provided
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverFileName = `cover_${Date.now()}_${Math.random().toString(36).substring(7)}.${coverExt}`
        const coverPath = `covers/${coverFileName}`

        const coverFormData = new FormData()
        coverFormData.append('file', coverFile)
        coverFormData.append('bucket', 'documents')
        coverFormData.append('path', coverPath)
        if (finalCategoryId) {
          coverFormData.append('category_id', finalCategoryId)
          coverFormData.append('category_name', categoryName)
        }

        const coverUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (coverUploadResponse.ok) {
          coverUrl = coverUploadResult.publicUrl
        } else {
          toast.warning('Failed to upload new cover image, keeping existing one')
        }
      }

      // Update book via API
      const response = await fetch(`/api/books?id=${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: validated.data.title,
          author: validated.data.author,
          year: validated.data.year,
          description: validated.data.description || null,
          cover_url: coverUrl,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          category_id: finalCategoryId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update book')
      }

      toast.success('Book updated successfully!')
      router.push('/dashboard/documents/list')
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error(error.message || 'Failed to update book')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Cover image must be less than 5MB')
        return
      }
      setCoverFile(file)
    }
  }

  const handleBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Book file must be less than 500MB')
        return
      }
      setBookFile(file)
    }
  }

  const getFileNameFromUrl = (url: string | null | undefined) => {
    if (!url) return null
    try {
      const u = new URL(url)
      const last = u.pathname.split('/').filter(Boolean).pop()
      return last || null
    } catch {
      const last = String(url).split('/').filter(Boolean).pop()
      return last || null
    }
  }

  if (isFetching || !book) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Edit Document"
        description="Update document information and files"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents', href: '/dashboard/documents' },
          { label: 'List', href: '/dashboard/documents/list' },
          { label: 'Edit' },
        ]}
      />

      <div className="mt-6 max-w-5xl mx-auto">
        {/* Top summary */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-xl md:text-2xl font-bold text-slate-900">{book.title}</h3>
                  <p className="truncate text-slate-600">by {book.author}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800 border border-slate-200">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {book.year}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800 border border-slate-200">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {formatFileSize(book.file_size)}
                </span>
                {book.category?.name && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 border border-blue-100">
                    {book.category.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="transform-none"
                onClick={() => window.open(book.file_url, '_blank', 'noopener,noreferrer')}
              >
                View file
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
              <h4 className="text-lg font-bold text-slate-900">Details</h4>
              <p className="text-sm text-slate-600 mt-1">Update the book metadata.</p>

              <div className="mt-5 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={(form.values as any).title}
                    onChange={(e) => form.setValue('title' as any, e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                    disabled={isLoading}
                  />
                  {form.errors.title && <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Author <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={(form.values as any).author}
                      onChange={(e) => form.setValue('author' as any, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      required
                      disabled={isLoading}
                    />
                    {form.errors.author && <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.author}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={(form.values as any).year}
                      onChange={(e) => form.setValue('year' as any, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      min="1000"
                      max="9999"
                      required
                      disabled={isLoading}
                    />
                    {form.errors.year && <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.year}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Main Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMainCategoryId}
                    onChange={(e) => {
                      setSelectedMainCategoryId(e.target.value)
                      form.setValue('category_id' as any, '')
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select a main category</option>
                    {mainCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMainCategoryId && availableSubcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Subcategory (Optional)
                    </label>
                    <select
                      value={(form.values as any).category_id || ''}
                      onChange={(e) => form.setValue('category_id' as any, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      disabled={isLoading}
                    >
                      <option value="">None (Use main category)</option>
                      {availableSubcategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Optional: Select a subcategory for more specific organization
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={(form.values as any).description}
                    onChange={(e) => form.setValue('description' as any, e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                    disabled={isLoading}
                    placeholder="Optional description"
                  />
                  {form.errors.description && (
                    <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Files */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
              <h4 className="text-lg font-bold text-slate-900">Files</h4>
              <p className="text-sm text-slate-600 mt-1">Replace the document or cover (optional).</p>

              <div className="mt-5 space-y-5">
                {/* Book file */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Book file</p>
                      <p className="mt-1 text-sm text-slate-700 truncate">{book.file_name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatFileSize(book.file_size)}</p>
                      {bookFile && (
                        <p className="text-xs text-blue-700 mt-2">
                          New file: <span className="font-semibold">{bookFile.name}</span> ({formatFileSize(bookFile.size)})
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      <input
                        ref={bookInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.epub,.mobi,.txt"
                        onChange={handleBookFileChange}
                        className="hidden"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="transform-none"
                        onClick={() => bookInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        Change file
                      </Button>
                      {bookFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="transform-none"
                          onClick={() => {
                            setBookFile(null)
                            if (bookInputRef.current) bookInputRef.current.value = ''
                          }}
                          disabled={isLoading}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Supported: PDF, DOC, DOCX, EPUB, MOBI, TXT. Max 500MB.
                  </p>
                </div>

                {/* Cover file */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Cover image</p>
                      <p className="mt-1 text-sm text-slate-700 truncate">
                        {book.cover_url ? (getFileNameFromUrl(book.cover_url) || 'Existing cover image') : 'No cover image'}
                      </p>
                      {coverFile && (
                        <p className="text-xs text-blue-700 mt-2">
                          New image: <span className="font-semibold">{coverFile.name}</span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="transform-none"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        Change image
                      </Button>
                      {coverFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="transform-none"
                          onClick={() => {
                            setCoverFile(null)
                            if (coverInputRef.current) coverInputRef.current.value = ''
                          }}
                          disabled={isLoading}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Images only. Max 5MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-slate-200 pt-6">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => router.push('/dashboard/documents/list')} 
              disabled={isLoading}
              className="transform-none"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className="transform-none">
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
