'use client'

import { useState, useMemo } from 'react'
import { DataTable, Pagination } from '../../../components/data-display'
import { DeleteConfirmationModal } from '../../../components/feedback'
import { Card, Badge } from '../../../components/ui'
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

  // Category table columns
  const categoryColumns = [
    {
      header: 'Category',
      accessor: 'name',
      width: '50%',
      render: (value: string, row: VideoCategory) => (
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center bg-linear-to-br from-gold-100 to-gold-200 rounded-xl shadow-sm overflow-hidden shrink-0">
            {row.cover_url ? (
              <img
                src={row.cover_url}
                alt={`${value} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {/* Categories Table */}
        <Card padding="none">

          <DataTable
            columns={categoryColumns}
            data={categories}
            isLoading={isLoading}
            emptyMessage="No categories available"
            emptyDescription="Create categories first to organize your videos"
            emptyIcon={
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            onRowClick={(category) => handleCategoryClick((category as VideoCategory).id)}
            hoverable
          />
        </Card>
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row)
            }}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Edit"
            title="Edit video"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete"
            title="Delete video"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Back button and category info */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToCategories}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{selectedCategory?.name}</div>
              <div className="text-sm text-slate-600">
                {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-100 bg-white pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

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

