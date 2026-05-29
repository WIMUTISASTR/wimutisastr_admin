'use client'

import { useState, useRef, useMemo, useCallback, useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button, Card, Badge } from '../../../components/ui'
import { VideoCategory } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../../shared/constants'

interface VideoUploadFormProps {
  categories: VideoCategory[]
  isLoading: boolean
  onUpload: (videoData: {
    title: string
    presented_by: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
    access_level: 'free' | 'members'
  }) => Promise<void>
}

type FieldKey =
  | 'title'
  | 'presented_by'
  | 'description'
  | 'file'
  | 'category_id'
  | 'access_level'
  | 'thumbnail'
  | 'form'

const VIDEO_EXTENSIONS = [...ALLOWED_FILE_TYPES.VIDEOS] as string[]
const VIDEO_TYPE_LABELS = VIDEO_EXTENSIONS.map((ext) => ext.replace('.', '').toUpperCase())

const MAX_TITLE_LENGTH = 200
const MAX_PRESENTED_BY_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 1000

const inputClass =
  'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 disabled:opacity-50 disabled:cursor-not-allowed'

const inputErrorClass =
  'w-full px-4 py-2.5 border border-red-300 rounded-xl text-slate-900 bg-red-50/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed'

function getVideoTypeLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ext ? ext.toUpperCase() : 'VIDEO'
}

export default function VideoUploadForm({ categories, isLoading, onUpload }: VideoUploadFormProps) {
  const formId = useId()
  const fileRequirementsId = `${formId}-file-requirements`
  const [formData, setFormData] = useState({
    title: '',
    presented_by: '',
    description: '',
    category_id: '',
    file: null as File | null,
    thumbnail: null as File | null,
    access_level: 'members' as 'free' | 'members',
  })
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [videoDragActive, setVideoDragActive] = useState(false)
  const [thumbDragActive, setThumbDragActive] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const completion = useMemo(() => {
    const steps = [
      { id: 'file', label: 'វីដេអូ', done: !!formData.file, required: true },
      { id: 'title', label: 'ចំណងជើង', done: !!formData.title.trim(), required: true },
      { id: 'category', label: 'ប្រភេទ', done: !!formData.category_id, required: true },
      { id: 'thumbnail', label: 'រូបថត', done: !!formData.thumbnail, required: false },
    ]
    const requiredSteps = steps.filter((s) => s.required)
    const doneCount = requiredSteps.filter((s) => s.done).length
    return {
      steps,
      doneCount,
      total: requiredSteps.length,
      percent: Math.round((doneCount / requiredSteps.length) * 100),
    }
  }, [formData])

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

  const handleVideoFile = useCallback(
    (file: File) => {
      clearFieldError('file')
      clearFieldError('form')

      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext) {
        setFieldError('file', 'ឈ្មោះឯកសារមិនត្រឹមត្រូវ')
        return
      }

      const fileExt = `.${ext}` as (typeof ALLOWED_FILE_TYPES.VIDEOS)[number]
      if (!VIDEO_EXTENSIONS.includes(fileExt)) {
        setFieldError(
          'file',
          `ប្រភេទឯកសារមិនត្រឹមត្រូវ។ អនុញ្ញាត: ${VIDEO_TYPE_LABELS.join(', ')}`,
        )
        return
      }

      setFormData((prev) => ({ ...prev, file }))
    },
    [clearFieldError, setFieldError],
  )

  const handleThumbnailFile = useCallback(
    (file: File) => {
      clearFieldError('thumbnail')

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setFieldError('thumbnail', 'ប្រភេទរូបភាព: JPG, PNG, WEBP, GIF')
        return
      }

      if (file.size > FILE_SIZE_LIMITS.THUMBNAIL_IMAGE) {
        setFieldError('thumbnail', `រូបថតត្រូវតែតិចជាង ${formatFileSize(FILE_SIZE_LIMITS.THUMBNAIL_IMAGE)}`)
        return
      }

      setFormData((prev) => ({ ...prev, thumbnail: file }))
      const reader = new FileReader()
      reader.onloadend = () => setThumbnailPreview(reader.result as string)
      reader.readAsDataURL(file)
    },
    [clearFieldError, setFieldError],
  )

  const clearThumbnail = useCallback(() => {
    setFormData((prev) => ({ ...prev, thumbnail: null }))
    setThumbnailPreview(null)
    if (thumbInputRef.current) thumbInputRef.current.value = ''
    clearFieldError('thumbnail')
  }, [clearFieldError])

  const openVideoPicker = useCallback(() => {
    if (!isLoading) videoInputRef.current?.click()
  }, [isLoading])

  const openThumbPicker = useCallback(() => {
    if (!isLoading) thumbInputRef.current?.click()
  }, [isLoading])

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {}

    if (!formData.title.trim()) {
      errors.title = 'ចំណងជើងវីដេអូត្រូវតែបំពេញ'
    } else if (formData.title.trim().length > MAX_TITLE_LENGTH) {
      errors.title = `ចំណងជើងត្រូវតែតិចជាង ${MAX_TITLE_LENGTH} តួអក្សរ`
    }

    if (!formData.category_id) errors.category_id = 'សូមជ្រើសប្រភេទ'
    if (!formData.file) errors.file = 'សូមជ្រើសឯកសារវីដេអូ'

    if (formData.presented_by.trim().length > MAX_PRESENTED_BY_LENGTH) {
      errors.presented_by = `ឈ្មោះអ្នកបង្ហាញត្រូវតែតិចជាង ${MAX_PRESENTED_BY_LENGTH} តួអក្សរ`
    }

    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `ការពិពណ៌នាត្រូវតែតិចជាង ${MAX_DESCRIPTION_LENGTH} តួអក្សរ`
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!validate()) return

    try {
      await onUpload({
        title: formData.title.trim(),
        presented_by: formData.presented_by.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        file: formData.file!,
        thumbnail: formData.thumbnail,
        access_level: formData.access_level,
      })

      setFormData({
        title: '',
        presented_by: '',
        description: '',
        category_id: '',
        file: null,
        thumbnail: null,
        access_level: 'members',
      })
      setThumbnailPreview(null)
      if (videoInputRef.current) videoInputRef.current.value = ''
      if (thumbInputRef.current) thumbInputRef.current.value = ''
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ការផ្ទុកបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត។'
      setFieldErrors({ form: message })
    }
  }

  const canSubmit =
    !isLoading && !!formData.file && !!formData.title.trim() && !!formData.category_id

  return (
    <form onSubmit={handleSubmit}>
      <Card padding="md" className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">វឌ្ឍនភាពការបំពេញ</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {completion.doneCount} / {completion.total} ជំហានចាំបាច់
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
                {!step.required && <span className="text-slate-400">(ស្រេច)</span>}
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
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 text-sm font-bold border border-navy-100">
                1
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 font-heading">វីដេអូ</h4>
                <p className="text-sm text-slate-600">អូសទម្លាក់ ឬចុចដើម្បីជ្រើស</p>
              </div>
            </div>

            <div
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-label="ជ្រើសរើសវីដេអូដើម្បីផ្ទុក"
              aria-describedby={fileRequirementsId}
              aria-invalid={!!fieldErrors.file}
              onDragEnter={(e) => {
                e.preventDefault()
                setVideoDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setVideoDragActive(false)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                setVideoDragActive(false)
                if (e.dataTransfer.files?.[0]) handleVideoFile(e.dataTransfer.files[0])
              }}
              onClick={openVideoPicker}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openVideoPicker()
                }
              }}
              className={`
                relative min-h-[200px] rounded-xl border-2 border-dashed p-6 text-center
                transition-colors duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2
                ${videoDragActive ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-slate-50/50 hover:border-navy-300 hover:bg-navy-50/30'}
                ${fieldErrors.file ? 'border-red-400 bg-red-50/30' : ''}
                ${isLoading ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept={VIDEO_EXTENSIONS.join(',')}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleVideoFile(e.target.files[0])
                }}
                className="sr-only"
                disabled={isLoading}
              />

              {!formData.file ? (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-200 ${
                      videoDragActive ? 'border-navy-300 bg-white' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <svg
                      className={`h-8 w-8 ${videoDragActive ? 'text-navy-600' : 'text-slate-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {videoDragActive ? 'ទម្លាក់វីដេអូទីនេះ' : 'ផ្ទុកវីដេអូរបស់អ្នក'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      អូសទម្លាក់ ឬ <span className="font-semibold text-navy-700">ចុចជ្រើសឯកសារ</span>
                    </p>
                  </div>
                  <p id={fileRequirementsId} className="text-xs text-slate-500 max-w-xs">
                    ទំហំឯកសារគ្មានកំណត់ — ផ្ទុកវីដេអូទំហំណាក៏បាន
                  </p>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center gap-3 py-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
                    <span className="text-xs font-bold">{getVideoTypeLabel(formData.file.name)}</span>
                  </div>
                  <div className="min-w-0 w-full text-center">
                    <p className="truncate text-sm font-semibold text-slate-900 px-2">{formData.file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatFileSize(formData.file.size)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button type="button" variant="secondary" size="sm" onClick={openVideoPicker} disabled={isLoading}>
                      ផ្លាស់ប្តូរ
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, file: null }))
                        if (videoInputRef.current) videoInputRef.current.value = ''
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
              {VIDEO_TYPE_LABELS.map((label) => (
                <Badge key={label} variant="default" size="sm">
                  {label}
                </Badge>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-sm font-bold border border-slate-200">
                +
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">រូបថតតូច</h4>
                <p className="text-xs text-slate-600">ស្រេចចិត្ត — បង្ហាញមុនពេលចាក់</p>
              </div>
            </div>

            <div
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-label="ជ្រើសរូបថតតូច"
              onDragEnter={(e) => {
                e.preventDefault()
                setThumbDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setThumbDragActive(false)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                setThumbDragActive(false)
                if (e.dataTransfer.files?.[0]) handleThumbnailFile(e.dataTransfer.files[0])
              }}
              onClick={openThumbPicker}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openThumbPicker()
                }
              }}
              className={`
                rounded-xl border-2 transition-colors duration-200 outline-none overflow-hidden
                focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2
                ${thumbnailPreview ? 'border-slate-200 bg-white' : `border-dashed ${thumbDragActive ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-slate-50/50 hover:border-navy-300'}`}
                ${fieldErrors.thumbnail ? 'border-red-400' : ''}
                ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleThumbnailFile(e.target.files[0])
                }}
                className="sr-only"
                disabled={isLoading}
              />

              {thumbnailPreview ? (
                <div className="relative group" onClick={(e) => e.stopPropagation()}>
                  <div className="relative w-full aspect-video bg-slate-100">
                    <Image
                      src={thumbnailPreview}
                      alt="រូបថតតូច"
                      fill
                      sizes="(min-width: 1024px) 320px, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button type="button" variant="secondary" size="sm" onClick={openThumbPicker} disabled={isLoading}>
                      ផ្លាស់ប្តូរ
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={clearThumbnail}
                      disabled={isLoading}
                    >
                      យកចេញ
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-700">រូបថតតូច</p>
                  <p className="text-xs text-slate-500 mt-0.5">JPG, PNG, WEBP · {formatFileSize(FILE_SIZE_LIMITS.THUMBNAIL_IMAGE)}</p>
                </div>
              )}
            </div>
            {fieldErrors.thumbnail && (
              <p className="mt-2 text-sm text-red-600 font-medium" role="alert">
                {fieldErrors.thumbnail}
              </p>
            )}
          </Card>

          <Card padding="md" className="bg-navy-50/50 border-navy-100">
            <div className="flex gap-3">
              <svg className="h-5 w-5 shrink-0 text-navy-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
                  <li>វីដេអូធំអាចចំណាយពេលផ្ទុកបន្តិច</li>
                  <li>MP4 ជាជម្រើសល្អបំផុតសម្រាប់គ្រប់ឧបករណ៍</li>
                  <li>រូបថតតូចជួយអ្នកប្រើស្វែងរកវីដេអូ</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card padding="md">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 text-sm font-bold border border-navy-100">
                2
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 font-heading">ព័ត៌មានលម្អិត</h4>
                <p className="text-sm text-slate-600">ព័ត៌មានវីដេអូសម្រាប់បង្ហាញ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="video-title" className="block text-sm font-semibold text-slate-900 mb-2">
                  ចំណងជើងវីដេអូ <span className="text-red-500" aria-hidden>*</span>
                </label>
                <input
                  id="video-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                    clearFieldError('title')
                  }}
                  className={fieldErrors.title ? inputErrorClass : inputClass}
                  placeholder="បញ្ចូលចំណងជើងវីដេអូ"
                  disabled={isLoading}
                  maxLength={MAX_TITLE_LENGTH}
                  aria-invalid={!!fieldErrors.title}
                />
                <div className="flex justify-between mt-1.5">
                  {fieldErrors.title ? (
                    <p className="text-sm text-red-600 font-medium" role="alert">
                      {fieldErrors.title}
                    </p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs text-slate-500 tabular-nums">
                    {formData.title.length}/{MAX_TITLE_LENGTH}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="presented-by" className="block text-sm font-semibold text-slate-900 mb-2">
                  បង្ហាញដោយ <span className="text-slate-500 font-normal">(ស្រេចចិត្ត)</span>
                </label>
                <input
                  id="presented-by"
                  type="text"
                  value={formData.presented_by}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, presented_by: e.target.value }))
                    clearFieldError('presented_by')
                  }}
                  className={fieldErrors.presented_by ? inputErrorClass : inputClass}
                  placeholder="ឧ. ឈ្មោះអ្នកបង្ហាញ"
                  disabled={isLoading}
                  maxLength={MAX_PRESENTED_BY_LENGTH}
                />
                {fieldErrors.presented_by && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                    {fieldErrors.presented_by}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="video-category" className="block text-sm font-semibold text-slate-900 mb-2">
                  ប្រភេទ <span className="text-red-500" aria-hidden>*</span>
                </label>
                <select
                  id="video-category"
                  value={formData.category_id}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                    clearFieldError('category_id')
                  }}
                  className={fieldErrors.category_id ? inputErrorClass : inputClass}
                  disabled={isLoading || categories.length === 0}
                  aria-invalid={!!fieldErrors.category_id}
                >
                  <option value="">ជ្រើសប្រភេទ</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category_id && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
                    {fieldErrors.category_id}
                  </p>
                )}
                {categories.length === 0 && (
                  <p className="mt-1.5 text-sm text-amber-700">គ្មានប្រភេទ — បង្កើតប្រភេទវីដេអូមុន</p>
                )}
              </div>

              <div>
                <label htmlFor="video-description" className="block text-sm font-semibold text-slate-900 mb-2">
                  ការពិពណ៌នា <span className="text-slate-500 font-normal">(ស្រេចចិត្ត)</span>
                </label>
                <textarea
                  id="video-description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                    clearFieldError('description')
                  }}
                  rows={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  className={`${fieldErrors.description ? inputErrorClass : inputClass} resize-none`}
                  placeholder="សង្ខេបខ្លីអំពីវីដេអូនេះ..."
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-slate-500 text-right tabular-nums">
                  {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
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
                      desc: 'ត្រូវការគណនីសមាជិកដើម្បីមើល',
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
                      desc: 'អ្នកប្រើប្រាស់ទាំងអស់អាចមើលបាន',
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
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
                          <svg className="h-5 w-5 shrink-0 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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

      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mt-8 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_-4px_rgb(15_23_42/0.08)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="min-w-0 text-sm text-slate-600">
            {canSubmit ? (
              <span className="font-medium text-emerald-700">រួចរាល់ផ្ទុក — ចុចផ្ទុកវីដេអូដើម្បីចាប់ផ្តើម</span>
            ) : (
              <span>
                នៅសល់{' '}
                <span className="font-semibold text-slate-900">
                  {completion.total - completion.doneCount}
                </span>{' '}
                ជំហានមុនផ្ទុក
              </span>
            )}
            {formData.file && (
              <span className="block text-xs text-slate-500 mt-0.5 truncate">
                {formData.file.name} · {formatFileSize(formData.file.size)}
              </span>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
            <Link href="/dashboard/videos/list">
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
              {isLoading ? 'កំពុងផ្ទុក...' : 'ផ្ទុកវីដេអូ'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
