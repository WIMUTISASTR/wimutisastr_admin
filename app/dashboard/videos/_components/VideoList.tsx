'use client'

import { useState, useMemo } from 'react'
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
    } catch (error) {
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

  // Category table columns (kept for potential fallback)
  const categoryColumns = [
    {
      header: 'Category',
      accessor: 'name',
      width: '50%',
      render: (value: string, row: VideoCategory) => (
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 rounded-xl shadow-sm overflow-hidden shrink-0">
            {row.cover_url ? (
              <img
                src={row.cover_url}
                alt={`${value} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 text-lg">{value}</div>
            {row.description && (
              <div className="text-sm text-slate-600 mt-1 line-clamp-2">{row.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Videos',
      accessor: 'id',
      width: '25%',
      render: (value: string) => {
        const categoryVideos = videos.filter(v => v.category_id === value)
        return (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{categoryVideos.length}</div>
              <div className="text-xs text-slate-500">video{categoryVideos.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Created',
      accessor: 'created_at',
      width: '25%',
      render: (value: string) => (
        <div>
          <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
          <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
  ]

  // If no category is selected, show categories table
  if (!selectedCategoryId) {
    return (
      <>
        <Card padding="md" className="mb-6 overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-blue-50" />
            <div className="relative flex flex-col gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900">Video Categories</h3>
              <p className="text-sm text-slate-600">
                Pick a category to view videos. Click a card to open.
              </p>
            </div>
          </div>
        </Card>

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
              title="No categories available"
              description="Create categories first to organize your videos."
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
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-linear-to-br from-slate-100 to-slate-200 border border-slate-200 shrink-0">
                        {cat.cover_url ? (
                          <img
                            src={cat.cover_url}
                            alt={`${cat.name} cover`}
                            className="w-full h-full object-cover"
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
                              {cat.description || 'No description'}
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
                          <span className="text-xs text-slate-600">video{count !== 1 ? 's' : ''}</span>
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
      header: 'Video',
      accessor: 'title',
      width: '40%',
      render: (value: string, row: Video) => (
        <div className="flex items-center gap-3">
          <div className="w-20 h-12 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 rounded-lg shadow-sm overflow-hidden shrink-0">
            {row.thumbnail_url ? (
              <img
                src={row.thumbnail_url}
                alt={`${value} thumbnail`}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 truncate">{value}</div>
            {row.description && (
              <div className="text-sm text-slate-600 truncate mt-0.5">{row.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      width: '20%',
      render: (value: { id: string; name: string } | null) => (
        value ? (
          <Badge variant="default" size="md">
            {value.name}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">Uncategorized</span>
        )
      ),
    },
    {
      header: 'Access',
      accessor: 'access_level',
      width: '10%',
      render: (value: 'free' | 'members' | undefined) => (
        <Badge variant={value === 'free' ? 'info' : 'default'} size="sm">
          {value === 'free' ? 'Free' : 'Members'}
        </Badge>
      ),
    },
    {
      header: 'File Size',
      accessor: 'file_size',
      width: '15%',
      render: (value: number) => (
        <span className="text-sm text-slate-700">{formatFileSize(value)}</span>
      ),
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      width: '15%',
      render: (value: string) => (
        <div>
          <div className="text-sm text-slate-900">{new Date(value).toLocaleDateString()}</div>
          <div className="text-xs text-slate-500">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      width: '10%',
      render: (value: string, row: Video) => (
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
                Back to categories
              </Button>
          
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{selectedCategory?.name}</div>
                {selectedCategory?.description ? (
                  <div className="text-sm text-slate-600 mt-1 max-w-2xl">{selectedCategory.description}</div>
                ) : (
                  <div className="text-sm text-slate-500 mt-1">No description</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:justify-end">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">Videos</div>
                <div className="text-lg font-bold text-slate-900">{filteredVideos.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">Total size</div>
                <div className="text-lg font-bold text-slate-900">{formatFileSize(totalSize)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <div className="text-xs text-slate-600">Last upload</div>
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
              placeholder="Search videos by title..."
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
              Showing <span className="font-semibold text-slate-900">{filteredVideos.length}</span> video{filteredVideos.length !== 1 ? 's' : ''}
              {searchQuery ? (
                <>
                  {' '}for "<span className="font-semibold text-slate-900">{searchQuery}</span>"
                </>
              ) : null}
            </div>
            {searchQuery ? (
              <Button type="button" variant="ghost" size="sm" className="transform-none justify-start sm:justify-center" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">Tip: click a row to edit the video.</div>
      </Card>

      {/* Videos Table */}
      <Card padding="none">
        <DataTable
          columns={columns}
          data={filteredVideos}
          isLoading={isLoading}
          emptyMessage={searchQuery ? "No videos match your search" : `No videos in "${selectedCategory?.name || 'this category'}" yet`}
          emptyDescription={searchQuery ? "Try a different search term" : "Upload videos to this category to see them here"}
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
        title="Delete Video"
        message="Are you sure you want to delete this video? This action cannot be undone."
        itemName={videoToDelete?.title}
        isLoading={isDeleting}
      />
    </>
  )
}

