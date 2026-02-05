'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { apiFetch } from '../../../shared/api'
import { Book, Category } from '../../../shared/types'
import { formatFileSize } from '../../../shared/utils'
import { useZodForm } from '@/app/lib/useZodForm'
import { Button } from '../../../../components/ui'
import { PageHeader } from '../../../../components/layout'
import { LoadingSkeleton, Modal } from '../../../../components/feedback'
import { useCategories } from '../../../shared/hooks/useCategories'
import { renderAsync } from 'docx-preview'

export default function EditDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string
  const { categories, fetchCategories } = useCategories()
  
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>('')
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false)
  const [isFilePreviewFullscreenOpen, setIsFilePreviewFullscreenOpen] = useState(false)

  const filePreviewUrl = useMemo(() => {
    if (!book?.file_url) return ''

    // Already served via our same-origin endpoint
    if (book.file_url.includes('/api/storage/serve')) {
      return book.file_url
    }

    // Convert a public URL into a same-origin serve URL to avoid iframe blocking (X-Frame-Options/CSP).
    try {
      const url = new URL(book.file_url)
      const key = url.pathname.replace(/^\//, '')
      if (!key) return book.file_url
      return `/api/storage/serve?key=${encodeURIComponent(key)}`
    } catch {
      return book.file_url
    }
  }, [book?.file_url])

  const fileExtension = useMemo(() => {
    const name = (book?.file_name || '').trim()
    const source = name || book?.file_url || ''
    const lower = source.toLowerCase()
    const withoutQuery = lower.split('?')[0].split('#')[0]
    const parts = withoutQuery.split('.')
    if (parts.length < 2) return ''
    return parts[parts.length - 1]
  }, [book?.file_name, book?.file_url])

  const filePreviewIframeSrc = useMemo(() => {
    const url = filePreviewUrl || book?.file_url || ''
    if (!url) return ''
    if (fileExtension !== 'pdf') return url
    // Improve PDF embed UX in most browsers
    return url.includes('#') ? url : `${url}#zoom=page-width&toolbar=0&navpanes=0`
  }, [book?.file_url, filePreviewUrl, fileExtension])

  const filePreviewFetchUrl = useMemo(() => {
    // For formats that require fetching (docx), prefer same-origin serve URL.
    return filePreviewUrl || book?.file_url || ''
  }, [book?.file_url, filePreviewUrl])

  const DocxPreview = ({ src }: { src: string }) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isRendering, setIsRendering] = useState(false)
    const [renderError, setRenderError] = useState<string | null>(null)

    useEffect(() => {
      let cancelled = false
      const el = containerRef.current
      if (!el || !src) return

      el.innerHTML = ''
      setIsRendering(true)
      setRenderError(null)

      ;(async () => {
        try {
          const res = await fetch(src)
          if (!res.ok) throw new Error('Failed to load document')
          const buffer = await res.arrayBuffer()
          if (cancelled) return
          el.innerHTML = ''
          await renderAsync(buffer, el, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: false,
          })
        } catch (e: any) {
          if (cancelled) return
          setRenderError(e?.message || 'Failed to render document')
        } finally {
          if (cancelled) return
          setIsRendering(false)
        }
      })()

      return () => {
        cancelled = true
      }
    }, [src])

    return (
      <div className="h-full w-full bg-white overflow-auto">
        {isRendering && (
          <div className="p-4 text-sm text-slate-600">Loading document preview…</div>
        )}
        {renderError && (
          <div className="p-4 text-sm text-red-600">{renderError}</div>
        )}
        <div ref={containerRef} className="p-4" />
      </div>
    )
  }

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        access_level: z.enum(['free', 'members']),
      }),
    []
  )

  const form = useZodForm(formSchema, {
    title: '',
    author: '',
    year: '' as any,
    description: '',
    category_id: '',
    access_level: 'members',
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
        const response = await apiFetch(`/api/books?id=${bookId}`)
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
        access_level: book.access_level || 'members',
      } as any)
      setCoverFile(null)
      setBookFile(null)
      setIsFilePreviewOpen(false)
      setIsFilePreviewFullscreenOpen(false)
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
        access_level: (form.values as any).access_level,
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
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        const filePath = `documents/${bookFile.name}`

        const fileFormData = new FormData()
        fileFormData.append('file', bookFile)
        fileFormData.append('bucket', 'documents')
        fileFormData.append('path', filePath)
        if (finalCategoryId) {
          fileFormData.append('category_id', finalCategoryId)
          fileFormData.append('category_name', categoryName)
        }

        const fileUploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        })

        const fileUploadResult = await fileUploadResponse.json()

        if (fileUploadResponse.ok) {
          fileUrl = fileUploadResult.data?.publicUrl || fileUploadResult.data?.url || ''
          fileName = bookFile.name
          fileSize = bookFile.size
        } else {
          throw new Error(fileUploadResult.error || 'Failed to upload new book file')
        }
      }

      // Upload new cover if provided
      if (coverFile) {
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        const coverPath = `covers/${coverFile.name}`

        const coverFormData = new FormData()
        coverFormData.append('file', coverFile)
        coverFormData.append('bucket', 'documents')
        coverFormData.append('path', coverPath)
        if (finalCategoryId) {
          coverFormData.append('category_id', finalCategoryId)
          coverFormData.append('category_name', categoryName)
        }

        const coverUploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: coverFormData,
        })

        const coverUploadResult = await coverUploadResponse.json()

        if (coverUploadResponse.ok) {
          coverUrl = coverUploadResult.data?.publicUrl || coverUploadResult.data?.url || null
        } else {
          toast.warning('Failed to upload new cover image, keeping existing one')
        }
      }

      // Update book via API
      const response = await apiFetch(`/api/books?id=${book.id}`, {
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
          access_level: validated.data.access_level,
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
      <>
        <PageHeader
          title="Edit Document"
          showBackButton
          backHref="/dashboard/documents"
        />
        <div className="mt-6 max-w-5xl mx-auto">
          <div className="space-y-6">
            {/* Summary skeleton */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
            {/* Form skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-10 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-10 bg-slate-200 rounded w-full"></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-32 bg-slate-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Edit Document"
        showBackButton
        backHref="/dashboard/documents"
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
                variant="ghost"
                size="sm"
                className="transform-none h-10 w-10 p-0 border border-slate-200 hover:bg-slate-50"
                onClick={() => setIsFilePreviewOpen((v) => !v)}
                aria-label={isFilePreviewOpen ? 'Collapse file preview' : 'Expand file preview'}
                title={isFilePreviewOpen ? 'Collapse' : 'Expand'}
              >
                {isFilePreviewOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>

        {isFilePreviewOpen && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">File preview</div>
                <div className="text-xs text-slate-600 truncate">{book.file_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="transform-none"
                  onClick={() => setIsFilePreviewFullscreenOpen(true)}
                >
                  Full screen
                </Button>
                <a
                  href={filePreviewUrl || book.file_url}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                  download
                >
                  Download
                </a>
              </div>
            </div>
            <div className="flex flex-col h-[70vh] bg-slate-50">
              {fileExtension === 'docx' ? (
                <DocxPreview src={filePreviewFetchUrl} />
              ) : (
                <iframe
                  title={`Preview: ${book.title}`}
                  src={filePreviewIframeSrc || filePreviewUrl || book.file_url}
                  className="w-full flex-1 bg-white"
                />
              )}
              <div className="p-3 text-sm text-slate-600 border-t border-slate-200 bg-white">
                If the preview does not load, use “Full screen” or “Download” above.
              </div>
            </div>
          </div>
        )}

        {book && (
          <Modal
            isOpen={isFilePreviewFullscreenOpen}
            onClose={() => setIsFilePreviewFullscreenOpen(false)}
            variant="fullscreen"
            className="p-0"
            showCloseButton={false}
          >
            <div className="h-dvh flex flex-col">
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-slate-900 truncate">File preview</div>
                    <div className="text-sm text-slate-600 truncate">{book.file_name}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={filePreviewUrl || book.file_url}
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                      download
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsFilePreviewFullscreenOpen(false)}
                      aria-label="Close"
                      className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-2xl leading-none">×</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-slate-50 overflow-hidden">
                {fileExtension === 'docx' ? (
                  <DocxPreview src={filePreviewFetchUrl} />
                ) : (
                  <iframe
                    title={`Fullscreen preview: ${book.title}`}
                    src={filePreviewIframeSrc || filePreviewUrl || book.file_url}
                    className="w-full h-full bg-white"
                  />
                )}
              </div>
            </div>
          </Modal>
        )}

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
                    Access Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={(form.values as any).access_level}
                    onChange={(e) => form.setValue('access_level' as any, e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                    disabled={isLoading}
                  >
                    <option value="members">Members only</option>
                    <option value="free">Free</option>
                  </select>
                  {form.errors.access_level && (
                    <p className="mt-1 text-sm text-red-600 font-medium">{form.errors.access_level}</p>
                  )}
                </div>

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
