'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { Card, Badge, Button, UIIcons, EmptyState } from '../../../components/ui'
import { Video, VideoCategory } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface VideoListProps {
  videos: Video[]
  categories: VideoCategory[]
  isLoading: boolean
  onEdit: (video: Video) => void
  onDelete: (videoId: string) => Promise<void>
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}

export default function VideoList({ videos, categories, isLoading, onEdit, onDelete, pagination, onPageChange }: VideoListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const videoCountsByCategoryId = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of videos) {
      if (!v.category_id) continue
      map.set(v.category_id, (map.get(v.category_id) ?? 0) + 1)
    }
    return map
  }, [videos])

  // Filter videos by selected category and search
  const filteredVideos = useMemo(() => {
    let filtered = selectedCategoryId
      ? videos.filter(video => video.category_id === selectedCategoryId)
      : videos

    if (searchQuery) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [videos, selectedCategoryId, searchQuery])

  // Get category name
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)

  // Derived metrics (must be declared before any early returns to preserve Hooks order)
  const totalSize = useMemo(() => {
    return filteredVideos.reduce((sum, v) => sum + (v.file_size || 0), 0)
  }, [filteredVideos])

  const lastUploadedAt = useMemo(() => {
    const max = filteredVideos.reduce<number | null>((acc, v) => {
      const t = v.uploaded_at ? new Date(v.uploaded_at).getTime() : null
      if (!t) return acc
      if (acc === null) return t
      return Math.max(acc, t)
    }, null)
    return max ? new Date(max) : null
  }, [filteredVideos])

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete({ id: video.id, title: video.title })
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return
    
    try {
      setIsDeleting(true)
      await onDelete(videoToDelete.id)
      setDeleteModalOpen(false)
      setVideoToDelete(null)
    } catch {
      // Error is handled by parent component
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setVideoToDelete(null)
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
  }

  const handleBackToCategories = () => {
    setSelectedCategoryId(null)
  }

  const resolveMediaUrl = (url: string | null | undefined) => {
    if (!url) return null
    if (url.includes('/api/storage/serve')) return url
    if (!/^https?:\/\//i.test(url)) {
      return `/api/storage/serve?key=${encodeURIComponent(url)}`
    }
    try {
      const parsed = new URL(url)
      const host = parsed.hostname
      const looksLikeR2 = host.includes('r2.cloudflarestorage.com') || host.includes('.r2.dev')
      if (looksLikeR2) {
        const key = parsed.pathname.replace(/^\//, '')
        return key ? `/api/storage/serve?key=${encodeURIComponent(key)}` : url
      }
      return url
    } catch {
      return url
    }
  }

  // If no category is selected, show categories table
  if (!selectedCategoryId) {
    return (
      <>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-4 w-2/3 bg-slate-200 rounded" />
                    <div className="mt-2 h-3 w-full bg-slate-100 rounded" />
                    <div className="mt-2 h-3 w-5/6 bg-slate-100 rounded" />
                    <div className="mt-3 h-6 w-24 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
        <Card padding="none">
            <EmptyState
              title="មិនមានប្រភេទ"
              description="បង្កើតប្រភេទជាមុនសិន ដើម្បីរៀបចំវីដេអូ។"
              icon={
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
        </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => {
              const count = videoCountsByCategoryId.get(cat.id) ?? 0
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-linear-to-br from-slate-100 to-slate-200 border border-slate-200 shrink-0">
                        {cat.cover_url ? (
                          <Image
                            src={cat.cover_url}
                            alt={`${cat.name} cover`}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-bold text-slate-900 truncate">{cat.name}</div>
                            <div className="text-sm text-slate-600 line-clamp-2 mt-0.5">
                              {cat.description || 'គ្មានការពិពណ៌នា'}
                            </div>
                          </div>
                          <div className="shrink-0 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                          <span className="text-sm font-semibold text-slate-900">{count}</span>
                          <span className="text-xs text-slate-600">វីដេអូ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </>
    )
  }

  // Show videos for selected category
  const columns = [
    {
      header: 'វីដេអូ',
      accessor: 'title',
      width: '40%',
      render: (value: unknown, row: Video) => (
        <div className="flex items-center gap-3">
          <div className="relative w-20 h-12 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 rounded-lg shadow-sm overflow-hidden shrink-0">
            {row.thumbnail_url ? (
              <Image
                src={resolveMediaUrl(row.thumbnail_url) || row.thumbnail_url}
                alt={`${row.title} thumbnail`}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 truncate">
              {typeof value === 'string' ? value : row.title}
            </div>
            {row.description && (
              <div className="text-sm text-slate-600 truncate mt-0.5">{row.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'ប្រភេទ',
      accessor: 'category',
      width: '20%',
      render: (value: unknown) => (
        value && typeof value === 'object' && 'name' in value ? (
          <Badge variant="default" size="md">
            {(value as { name: string }).name}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">មិនមានប្រភេទ</span>
        )
      ),
    },
    {
      header: 'ការចូលប្រើ',
      accessor: 'access_level',
      width: '10%',
      render: (value: unknown) => {
        const access = value === 'free' ? 'free' : 'members'
        return (
          <Badge variant={access === 'free' ? 'info' : 'default'} size="sm">
            {access === 'free' ? 'ឥតគិតថ្លៃ' : 'សមាជិក'}
          </Badge>
        )
      },
    },
    {
      header: 'ទំហំឯកសារ',
      accessor: 'file_size',
      width: '15%',
      render: (value: unknown) => (
        <span className="text-sm text-slate-700">
          {typeof value === 'number' ? formatFileSize(value) : '-'}
        </span>
      ),
    },
    {
      header: 'ផ្ទុក',
      accessor: 'uploaded_at',
      width: '15%',
      render: (value: unknown) => {
        if (typeof value !== 'string') {
          return <span className="text-sm text-slate-400">-</span>
        }
        return (
          <div>
            <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '10%',
      render: (_value: unknown, row: Video) => (
        <div className="flex gap-1">         
          <Button
            variant="danger"
            size="sm"
            className="transform-none"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            aria-label="Delete"
            title="Delete video"
          >
            <UIIcons.Delete className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Back button and category info */}
      <Card padding="md" className="mb-6 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-blue-50" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                className="transform-none justify-start"
            onClick={handleBackToCategories}
          >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
                ត្រឡប់ទៅប្រភេទ
              </Button>
          
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{selectedCategory?.name}</div>
                {selectedCategory?.description ? (
                  <div className="text-sm text-slate-600 mt-1 max-w-2xl">{selectedCategory.description}</div>
                ) : (
                  <div className="text-sm text-slate-500 mt-1">គ្មានការពិពណ៌នា</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:justify-end">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">វីដេអូ</div>
                <div className="text-lg font-bold text-slate-900">{filteredVideos.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">ទំហំសរុប</div>
                <div className="text-lg font-bold text-slate-900">{formatFileSize(totalSize)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">ផ្ទុកចុងក្រោយ</div>
                <div className="text-sm font-semibold text-slate-900">
                  {lastUploadedAt ? lastUploadedAt.toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md" className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
          <input
            type="text"
              placeholder="ស្វែងរកវីដេអូតាមចំណងជើង..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
                type="button"
              onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                aria-label="Clear search"
            >
                <UIIcons.Close className="w-5 h-5" />
            </button>
          )}
        </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:text-right">
            <div className="text-sm text-slate-600">
              បង្ហាញ <span className="font-semibold text-slate-900">{filteredVideos.length}</span> វីដេអូ
              {searchQuery ? (
                <>
                  {' '}សម្រាប់ &quot;<span className="font-semibold text-slate-900">{searchQuery}</span>&quot;
                </>
              ) : null}
            </div>
            {searchQuery ? (
              <Button type="button" variant="ghost" size="sm" className="transform-none justify-start sm:justify-center" onClick={() => setSearchQuery('')}>
                លុបការស្វែងរក
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">ព័ត៌មានជំនួយ: ចុចជួរដើម្បីកែប្រែវីដេអូ</div>
      </Card>

      {/* Videos Table */}
      <Card padding="none">
        <DataTable<Video>
          columns={columns}
          data={filteredVideos}
          isLoading={isLoading}
          emptyMessage={searchQuery ? "មិនមានវីដេអូដែលត្រូវនឹងការស្វែងរក" : `មិនទាន់មានវីដេអូក្នុង "${selectedCategory?.name || 'ប្រភេទនេះ'}"`}
          emptyDescription={searchQuery ? "សាកល្បងពាក្យស្វែងរកផ្សេង" : "ផ្ទុកវីដេអូទៅក្នុងប្រភេទនេះ"}
          emptyIcon={
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
          onRowClick={(video) => onEdit(video as Video)}
          hoverable
        />
        {!isLoading && videos.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={onPageChange}
            isLoading={isLoading}
          />
        )}
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="លុបវីដេអូ"
        message="តើអ្នកប្រាកដជាចង់លុបវីដេអូនេះទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។"
        itemName={videoToDelete?.title}
        isLoading={isDeleting}
      />
    </>
  )
}

