'use client'

import { useState, useRef, useMemo, useCallback, useId } from 'react'
import Link from 'next/link'
import { Button, Card, Badge } from '../../../components/ui'
import { Category } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../../shared/constants'

interface BookData {
  title: string
  author: string
  year: string
  description: string
  file: File | null
  category_id: string | null
  access_level: 'free' | 'members'
}

interface BookUploadFormProps {
  onUpload: (bookData: BookData) => Promise<void>
  isLoading?: boolean
  categories?: Category[]
}

type FieldKey = 'title' | 'author' | 'year' | 'file' | 'category' | 'access_level' | 'form'

const ALLOWED_EXTENSIONS = [
  ...new Set([...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS, ...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS_EDIT]),
] as string[]

const FILE_TYPE_LABELS = ALLOWED_EXTENSIONS.map((ext) => ext.replace('.', '').toUpperCase())

function getFileExtension(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : ''
}

function getFileTypeStyle(ext: string): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pdf: { bg: 'bg-red-50', text: 'text-red-700', label: 'PDF' },
    doc: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'DOC' },
    docx: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'DOCX' },
    txt: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'TXT' },
    xls: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'XLS' },
    xlsx: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'XLSX' },
    epub: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'EPUB' },
    mobi: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'MOBI' },
  }
  const key = ext.replace('.', '')
  return map[key] ?? { bg: 'bg-navy-50', text: 'text-navy-700', label: key.toUpperCase() || 'FILE' }
}

function FileTypeIcon({ ext, className = 'h-8 w-8' }: { ext: string; className?: string }) {
  const style = getFileTypeStyle(ext)
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 ${style.bg} ${style.text}`}
      aria-hidden
    >
      <span className={`text-xs font-bold tracking-wide ${className}`}>{style.label}</span>
    </div>
  )
}

const inputClass =
  'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 disabled:opacity-50 disabled:cursor-not-allowed'

const inputErrorClass =
  'w-full px-4 py-2.5 border border-red-300 rounded-xl text-slate-900 bg-red-50/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed'

export default function BookUploadForm({
  onUpload,
  isLoading = false,
  categories = [],
}: BookUploadFormProps) {
  const formId = useId()
  const fileRequirementsId = `${formId}-file-requirements`
  const [formData, setFormData] = useState<BookData>({
    title: '',
    author: '',
    year: '',
    description: '',
    file: null,
    category_id: null,
    access_level: 'members',
  })
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mainCategories = useMemo(() => categories.filter((cat) => !cat.parent_id), [categories])

  const availableSubcategories = useMemo(() => {
    if (!selectedMainCategoryId) return []
    return categories.filter((cat) => cat.parent_id === selectedMainCategoryId)
  }, [categories, selectedMainCategoryId])

  const completion = useMemo(() => {
    const steps = [
      { id: 'file', label: 'ឯកសារ', done: !!formData.file },
      { id: 'title', label: 'ចំណងជើង', done: !!formData.title.trim() },
      { id: 'author', label: 'អ្នកនិពន្ធ', done: !!formData.author.trim() },
      { id: 'year', label: 'ឆ្នាំ', done: !!formData.year.trim() },
      { id: 'category', label: 'ប្រភេទ', done: !!selectedMainCategoryId },
    ]
    const doneCount = steps.filter((s) => s.done).length
    return { steps, doneCount, total: steps.length, percent: Math.round((doneCount / steps.length) * 100) }
  }, [formData, selectedMainCategoryId])

  const clearFieldError = useCallback((key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const setFieldError = useCallback((key: FieldKey, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }))
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
      clearFieldError(name as FieldKey)
      clearFieldError('form')
    },
    [clearFieldError],
  )

  const handleMainCategoryChange = useCallback(
    (mainCategoryId: string) => {
      setSelectedMainCategoryId(mainCategoryId)
      setFormData((prev) => ({ ...prev, category_id: null }))
      clearFieldError('category')
      clearFieldError('form')
    },
    [clearFieldError],
  )

  const handleSubcategoryChange = useCallback(
    (subcategoryId: string) => {
      setFormData((prev) => ({ ...prev, category_id: subcategoryId || null }))
      clearFieldError('category')
    },
    [clearFieldError],
  )

  const handleFile = useCallback(
    (selectedFile: File) => {
      clearFieldError('file')
      clearFieldError('form')

      if (selectedFile.size > FILE_SIZE_LIMITS.BOOK_FILE) {
        setFieldError('file', `ទំហំឯកសារត្រូវតែតិចជាង ${formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}`)
        return
      }

      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (!ext) {
        setFieldError('file', 'ឈ្មោះឯកសារមិនត្រឹមត្រូវ')
        return
      }

      const fileExt = `.${ext}` as
        | (typeof ALLOWED_FILE_TYPES.BOOK_DOCUMENTS)[number]
        | (typeof ALLOWED_FILE_TYPES.BOOK_DOCUMENTS_EDIT)[number]

      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        setFieldError(
          'file',
          `ប្រភេទឯកសារមិនត្រឹមត្រូវ។ អនុញ្ញាត: ${FILE_TYPE_LABELS.join(', ')}`,
        )
        return
      }

      setFormData((prev) => ({ ...prev, file: selectedFile }))
    },
    [clearFieldError, setFieldError],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (e.target.files?.[0]) {
        handleFile(e.target.files[0])
      }
    },
    [handleFile],
  )

  const openFilePicker = useCallback(() => {
    if (!isLoading) fileInputRef.current?.click()
  }, [isLoading])

  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openFilePicker()
      }
    },
    [openFilePicker],
  )

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {}

    if (!formData.file) errors.file = 'សូមជ្រើសឯកសារ'
    if (!formData.title.trim()) errors.title = 'ចំណងជើងឯកសារត្រូវតែបំពេញ'
    if (!formData.author.trim()) errors.author = 'អ្នកនិពន្ធត្រូវតែបំពេញ'
    if (!formData.year.trim()) errors.year = 'ឆ្នាំត្រូវតែបំពេញ'
    if (!selectedMainCategoryId) errors.category = 'សូមជ្រើសប្រភេទ'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!validate()) return

    const finalCategoryId = formData.category_id || selectedMainCategoryId

    try {
      await onUpload({
        ...formData,
        category_id: finalCategoryId || null,
      })
      setFormData({
        title: '',
        author: '',
        year: '',
        description: '',
        file: null,
        category_id: null,
        access_level: 'members',
      })
      setSelectedMainCategoryId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ការផ្ទុកបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត។'
      setFieldErrors({ form: message })
    }
  }

  const canSubmit =
    !isLoading &&
    formData.file &&
    formData.title.trim() &&
    formData.author.trim() &&
    formData.year.trim() &&
    selectedMainCategoryId

  const fileExt = formData.file ? getFileExtension(formData.file.name) : ''

  return (
    <form onSubmit={handleSubmit}>
      {/* Completion progress */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">វឌ្ឍនភាពការបំពេញ</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {completion.doneCount} / {completion.total} ជំហានរួចរាល់
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {completion.steps.map((step) => (
              <span
                key={step.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                {step.done ? (
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300" aria-hidden />
                )}
                {step.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-linear-to-r from-navy-600 to-navy-500 transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${completion.percent}%` }}
            role="progressbar"
            aria-valuenow={completion.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="វឌ្ឍនភាពការបំពេញទម្រង់"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* File upload — sticky on large screens */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 text-sm font-bold border border-navy-100">
                1
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 font-heading">ឯកសារ</h4>
                <p className="text-sm text-slate-600">អូសទម្លាក់ ឬចុចដើម្បីជ្រើស</p>
              </div>
            </div>

            <div
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-label="ជ្រើសរើសឯកសារដើម្បីផ្ទុក"
              aria-describedby={fileRequirementsId}
              aria-invalid={!!fieldErrors.file}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={openFilePicker}
              onKeyDown={handleDropZoneKeyDown}
              className={`
                relative min-h-[220px] rounded-xl border-2 border-dashed p-6 text-center
                transition-colors duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2
                ${dragActive ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-slate-50/50 hover:border-navy-300 hover:bg-navy-50/30'}
                ${fieldErrors.file ? 'border-red-400 bg-red-50/30' : ''}
                ${isLoading ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <input
                ref={fileInputRef}
                id="book-file"
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleChange}
                className="sr-only"
                disabled={isLoading}
                aria-hidden
              />

              {!formData.file ? (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-200 ${
                      dragActive ? 'border-navy-300 bg-white' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <svg
                      className={`h-8 w-8 transition-colors duration-200 ${dragActive ? 'text-navy-600' : 'text-slate-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3l3 3m-3 3v6"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {dragActive ? 'ទម្លាក់ឯកសារទីនេះ' : 'ផ្ទុកឯកសាររបស់អ្នក'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      អូសទម្លាក់ ឬ <span className="font-semibold text-navy-700">ចុចជ្រើសឯកសារ</span>
                    </p>
                  </div>
                  <p id={fileRequirementsId} className="text-xs text-slate-500 max-w-xs">
                    អតិបរមា {formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}
                  </p>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center gap-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <FileTypeIcon ext={fileExt} />
                  <div className="min-w-0 w-full text-center">
                    <p className="truncate text-sm font-semibold text-slate-900 px-2">{formData.file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatFileSize(formData.file.size)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={openFilePicker}
                      disabled={isLoading}
                    >
                      ផ្លាស់ប្តូរ
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, file: null }))
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        clearFieldError('file')
                      }}
                      disabled={isLoading}
                    >
                      យកចេញ
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {fieldErrors.file && (
              <p className="mt-2 text-sm text-red-600 font-medium" role="alert">
                {fieldErrors.file}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {FILE_TYPE_LABELS.map((label) => (
                <Badge key={label} variant="default" size="sm">
                  {label}
                </Badge>
              ))}
            </div>
          </Card>

          <Card padding="md" className="bg-navy-50/50 border-navy-100">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-navy-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">គន្លឹះ</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>ជ្រើសឯកសារមុន បន្ទាប់មកបំពេញព័ត៌មាន</li>
                  <li>ចំណងជើងច្បាស់លាស់ជួយស្វែងរក</li>
                  <li>ឯកសារធំអាចចំណាយពេលផ្ទុកបន្តិច</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Metadata */}
        <div className="lg:col-span-3 space-y-6">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 text-sm font-bold border border-navy-100">
                2
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 font-heading">ព័ត៌មានលម្អិត</h4>
                <p className="text-sm text-slate-600">ព័ត៌មានឯកសារសម្រាប់បង្ហាញជាសាធារណៈ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                  ចំណងជើងឯកសារ <span className="text-red-500" aria-hidden>*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={fieldErrors.title ? inputErrorClass : inputClass}
                  placeholder="បញ្ចូលចំណងជើងឯកសារ"
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                />
                {fieldErrors.title && (
                  <p id="title-error" className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="author" className="block text-sm font-semibold text-slate-900 mb-2">
                    អ្នកនិពន្ធ <span className="text-red-500" aria-hidden>*</span>
                  </label>
                  <input
                    id="author"
                    name="author"
                    type="text"
                    value={formData.author}
                    onChange={handleInputChange}
                    className={fieldErrors.author ? inputErrorClass : inputClass}
                    placeholder="បញ្ចូលឈ្មោះអ្នកនិពន្ធ"
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.author}
                  />
                  {fieldErrors.author && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                      {fieldErrors.author}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-semibold text-slate-900 mb-2">
                    ឆ្នាំ <span className="text-red-500" aria-hidden>*</span>
                  </label>
                  <input
                    id="year"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    min="1000"
                    max={new Date().getFullYear()}
                    className={fieldErrors.year ? inputErrorClass : inputClass}
                    placeholder={String(new Date().getFullYear())}
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.year}
                  />
                  {fieldErrors.year && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                      {fieldErrors.year}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="main-category" className="block text-sm font-semibold text-slate-900 mb-2">
                  ប្រភេទ <span className="text-red-500" aria-hidden>*</span>
                </label>
                <select
                  id="main-category"
                  value={selectedMainCategoryId}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className={fieldErrors.category ? inputErrorClass : inputClass}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.category}
                >
                  <option value="">ជ្រើសប្រភេទចម្បង</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              {selectedMainCategoryId && availableSubcategories.length > 0 && (
                <div>
                  <label htmlFor="sub-category" className="block text-sm font-semibold text-slate-900 mb-2">
                    ប្រភេទរង <span className="text-slate-500 font-normal">(ស្រេចចិត្ត)</span>
                  </label>
                  <select
                    id="sub-category"
                    value={formData.category_id || ''}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className={inputClass}
                    disabled={isLoading}
                  >
                    <option value="">គ្មាន — ប្រើប្រភេទចម្បង</option>
                    {availableSubcategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  ការពិពណ៌នា <span className="text-slate-500 font-normal">(ស្រេចចិត្ត)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  maxLength={1000}
                  className={`${inputClass} resize-none`}
                  placeholder="សង្ខេបខ្លីអំពីឯកសារនេះ..."
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-slate-500 text-right tabular-nums">
                  {formData.description.length} / 1000
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <fieldset>
              <legend className="block text-sm font-semibold text-slate-900 mb-3">
                កម្រិតការចូលប្រើ <span className="text-red-500" aria-hidden>*</span>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: 'members' as const,
                      label: 'សមាជិកប៉ុណ្ណោះ',
                      desc: 'ត្រូវការគណនីសមាជិកដើម្បីទាញយក',
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      ),
                    },
                    {
                      value: 'free' as const,
                      label: 'ឥតគិតថ្លៃ',
                      desc: 'អ្នកប្រើប្រាស់ទាំងអស់អាចចូលប្រើបាន',
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ),
                    },
                  ] as const
                ).map((option) => {
                  const selected = formData.access_level === option.value
                  return (
                    <label
                      key={option.value}
                      className={`
                        relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4
                        transition-colors duration-200
                        focus-within:ring-2 focus-within:ring-navy-400 focus-within:ring-offset-2
                        ${selected ? 'border-navy-500 bg-navy-50/80' : 'border-slate-200 bg-white hover:border-navy-200 hover:bg-slate-50'}
                        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                      `}
                    >
                      <input
                        type="radio"
                        name="access_level"
                        value={option.value}
                        checked={selected}
                        onChange={() => {
                          setFormData((prev) => ({ ...prev, access_level: option.value }))
                          clearFieldError('access_level')
                        }}
                        className="sr-only"
                        disabled={isLoading}
                      />
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                            selected ? 'border-navy-200 bg-white text-navy-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            {option.icon}
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                          <p className="mt-0.5 text-xs text-slate-600">{option.desc}</p>
                        </div>
                        {selected && (
                          <svg
                            className="h-5 w-5 shrink-0 text-navy-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </Card>

          {fieldErrors.form && (
            <div
              className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 flex gap-3"
              role="alert"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{fieldErrors.form}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar — stays within main scroll area */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mt-8 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_-4px_rgb(15_23_42/0.08)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="min-w-0 text-sm text-slate-600">
            {canSubmit ? (
              <span className="font-medium text-emerald-700">រួចរាល់ផ្ទុក — ចុចបញ្ជូនដើម្បីចាប់ផ្តើម</span>
            ) : (
              <span>
                នៅសល់{' '}
                <span className="font-semibold text-slate-900">
                  {completion.total - completion.doneCount}
                </span>{' '}
                ជំហានមុនផ្ទុក
              </span>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
            <Link href="/dashboard/documents/list">
              <Button type="button" variant="secondary" fullWidth className="sm:w-auto" disabled={isLoading}>
                បោះបង់
              </Button>
            </Link>
            <Button
              variant="submit"
              type="submit"
              disabled={!canSubmit}
              isLoading={isLoading}
              className="sm:min-w-[160px]"
            >
              {isLoading ? 'កំពុងផ្ទុក...' : 'ផ្ទុកឯកសារ'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
