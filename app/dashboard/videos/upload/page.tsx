'use client'

import { useEffect } from 'react'
import { notify } from '@/lib/utils/notify'
import VideoUploadForm from '../_components/VideoUploadForm'
import { PageHeader } from '../../../components/layout'
import { useUploadQueue } from '@/app/contexts/UploadQueueContext'
import { useVideoCategories } from '../../shared/hooks/useVideos'

export default function VideosUploadPage() {
  const { categories, fetchCategories } = useVideoCategories()
  const { enqueueVideoUpload } = useUploadQueue()

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVideoUpload = async (videoData: {
    title: string
    presented_by: string
    description: string
    category_id: string
    file: File
    thumbnail: File | null
    access_level: 'free' | 'members'
  }) => {
    const categoryName = categories.find((c) => c.id === videoData.category_id)?.name ?? null

    enqueueVideoUpload({
      ...videoData,
      category_name: categoryName,
    })

    notify.info('បានចាប់ផ្ទុកវីដេអូ — មើលវឌ្ឍនភាពក្នុងម៉ឺនុយ «ការផ្ទុក» ខាងលើ')
  }

  return (
    <>
      <PageHeader
        title="ផ្ទុកវីដេអូ"
        showBackButton
        backHref="/dashboard/videos"
      />

      <div>
        <VideoUploadForm categories={categories} isLoading={false} onUpload={handleVideoUpload} />
      </div>
    </>
  )
}
