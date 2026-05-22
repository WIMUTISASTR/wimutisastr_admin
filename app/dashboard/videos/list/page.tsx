'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import VideoList from '../_components/VideoList'
import { PageHeader } from '../../../components/layout'
import { useVideos, useVideoCategories } from '../../shared/hooks/useVideos'
import { apiFetch } from '../../shared/api'
import { Button } from '../../../components/ui'
import { toast } from 'react-toastify'

export default function VideosListPage() {
  const router = useRouter()
  const { videos, isLoading, pagination, fetchVideos, setVideos } = useVideos()
  const { categories, fetchCategories } = useVideoCategories()

  useEffect(() => {
    fetchVideos(1, 20)
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePageChange = (page: number) => {
    fetchVideos(page, pagination.limit)
  }

  const handleEdit = (videoId: string) => {
    router.push(`/dashboard/videos/edit/${videoId}`)
  }

  const handleDelete = async (videoId: string) => {
    try {
      const response = await apiFetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'មិនអាចលុបវីដេអូបានទេ')
      }

      toast.success('វីដេអូត្រូវបានលុបដោយជោគជ័យ!')
      setVideos(videos.filter(v => v.id !== videoId))
    } catch (error: unknown) {
      console.error('Delete error:', error)
      const message = error instanceof Error ? error.message : 'មិនអាចលុបវីដេអូបានទេ'
      toast.error(message)
      throw error
    }
  }

  return (
    <>
      <PageHeader
        title="វីដេអូ"
        showBackButton
        backHref="/dashboard/videos"
        action={
          <Button onClick={() => router.push('/dashboard/videos/upload')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ផ្ទុកវីដេអូ
          </Button>
        }
      />

      <div className="mt-6">
        <VideoList
          videos={videos}
          categories={categories}
          isLoading={isLoading}
          onEdit={(video) => handleEdit(video.id)}
          onDelete={handleDelete}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  )
}
