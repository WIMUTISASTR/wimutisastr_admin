'use client'

import { useState } from 'react'
import DataTable from '../../../components/DataTable'
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal'
import { Video, VideoCategory } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

interface VideoListProps {
  videos: Video[]
  categories: VideoCategory[]
  isLoading: boolean
  onEdit: (video: Video) => void
  onDelete: (videoId: string) => Promise<void>
}

export default function VideoList({ videos, categories, isLoading, onEdit, onDelete }: VideoListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter videos by selected category
  const filteredVideos = selectedCategoryId
    ? videos.filter(video => video.category_id === selectedCategoryId)
    : []

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
      header: 'Cover',
      accessor: 'cover_url',
      render: (value: string | null, row: VideoCategory) => (
        <div className="w-16 h-16 flex items-center justify-center bg-slate-50 rounded border border-slate-200 overflow-hidden">
          {value ? (
            <img
              src={value}
              alt={`${row.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      ),
    },
    {
      header: 'Category Name',
      accessor: 'name',
      render: (value: string, row: VideoCategory) => (
        <div>
          <div className="font-semibold text-slate-800">{value}</div>
          {row.description && (
            <div className="text-sm text-slate-600 mt-1 line-clamp-2">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Videos',
      accessor: 'id',
      render: (value: string) => {
        const categoryVideos = videos.filter(v => v.category_id === value)
        return (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-slate-800">{categoryVideos.length}</span>
            <span className="text-slate-500 text-sm">video{categoryVideos.length !== 1 ? 's' : ''}</span>
          </div>
        )
      },
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  // If no category is selected, show categories table
  if (!selectedCategoryId) {
    return (
      <div className="space-y-4">

        <div className="overflow-x-auto overflow-y-visible">
          <DataTable
            columns={categoryColumns}
            data={categories}
            isLoading={isLoading}
            emptyMessage="No categories available. Create categories first."
            onRowClick={(category) => handleCategoryClick((category as VideoCategory).id)}
          />
        </div>
      </div>
    )
  }

  // Show videos for selected category
  const columns = [
    {
      header: 'Thumbnail',
      accessor: 'thumbnail_url',
      render: (value: string | null, row: Video) => (
        <div className="w-24 h-16 flex items-center justify-center bg-slate-50 rounded border border-slate-200 overflow-hidden">
          {value ? (
            <img
              src={value}
              alt={`${row.title} thumbnail`}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      ),
    },
    {
      header: 'Title',
      accessor: 'title',
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (value: { id: string; name: string } | null) => (
        value ? (
          <span className="px-3 py-1 bg-linear-to-r from-indigo-100 to-blue-100 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">
            {value.name}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">No category</span>
        )
      ),
    },
    {
      header: 'Size',
      accessor: 'file_size',
      render: (value: number) => formatFileSize(value),
    },
    {
      header: 'Uploaded',
      accessor: 'uploaded_at',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: Video) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(row)
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Back button and category header */}
      <div className="mb-6">
        <button
          onClick={handleBackToCategories}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>
        <div className="flex justify-center">
          <h3 className="text-2xl font-bold text-slate-800 mb-2 text-center">
            {selectedCategory?.name}
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <DataTable
          columns={columns}
          data={filteredVideos}
          isLoading={isLoading}
          emptyMessage={`No videos in "${selectedCategory?.name || 'this category'}" yet`}
          onRowClick={(video) => onEdit(video as Video)}
        />
      </div>

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

