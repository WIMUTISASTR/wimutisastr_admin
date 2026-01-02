'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import DataTable from '../../../components/DataTable'
import FileUpload from '../../../components/FileUpload'

interface VideoCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface Video {
  id: string
  title: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  thumbnail_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

export default function UploadVideoContent() {
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'upload' | 'list' | 'categories'>('upload')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  // Video upload form state
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    file: null as File | null,
    thumbnail: null as File | null,
  })
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  
  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })
  const [openCategoryDropdownId, setOpenCategoryDropdownId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    if (activeView === 'list') {
      fetchVideos()
    } else {
      setOpenDropdownId(null)
      setOpenCategoryDropdownId(null)
    }
  }, [activeView])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/video-categories')
      const result = await response.json()
      if (response.ok && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching video categories:', error)
    }
  }

  const fetchVideos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/videos')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch videos')
      }

      if (result.data) {
        setVideos(result.data)
      }
    } catch (error: any) {
      console.error('Error fetching videos:', error)
      toast.error(error.message || 'Failed to fetch videos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!videoFormData.title.trim()) {
      toast.error('Video title is required')
      return
    }
    
    if (!videoFormData.category_id) {
      toast.error('Please select a category')
      return
    }
    
    if (!videoFormData.file) {
      toast.error('Please select a video file')
      return
    }

    try {
      setIsLoading(true)

      // Upload video file
      const fileExt = videoFormData.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `videos/${fileName}`

      const videoFormDataToSend = new FormData()
      videoFormDataToSend.append('file', videoFormData.file)
      videoFormDataToSend.append('bucket', 'videos')
      videoFormDataToSend.append('path', filePath)

      const videoUploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: videoFormDataToSend,
      })

      const videoUploadResult = await videoUploadResponse.json()
      if (!videoUploadResponse.ok) {
        throw new Error(videoUploadResult.error || 'Failed to upload video')
      }

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = null
      if (videoFormData.thumbnail) {
        const thumbnailExt = videoFormData.thumbnail.name.split('.').pop()
        const thumbnailFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${thumbnailExt}`
        const thumbnailPath = `video-thumbnails/${thumbnailFileName}`

        const thumbnailFormData = new FormData()
        thumbnailFormData.append('file', videoFormData.thumbnail)
        thumbnailFormData.append('bucket', 'video-thumbnails')
        thumbnailFormData.append('path', thumbnailPath)

        const thumbnailUploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: thumbnailFormData,
        })

        const thumbnailUploadResult = await thumbnailUploadResponse.json()
        if (thumbnailUploadResponse.ok) {
          thumbnailUrl = thumbnailUploadResult.publicUrl || thumbnailUploadResult.url
        }
      }

      // Save video metadata
      const videoData = {
        title: videoFormData.title.trim(),
        description: videoFormData.description.trim() || null,
        file_name: videoFormData.file.name,
        file_url: videoUploadResult.publicUrl || videoUploadResult.url,
        file_size: videoFormData.file.size,
        thumbnail_url: thumbnailUrl,
        category_id: videoFormData.category_id,
      }

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save video metadata')
      }

      toast.success('Video uploaded successfully!')
      
      // Reset form
      setVideoFormData({
        title: '',
        description: '',
        category_id: '',
        file: null,
        thumbnail: null,
      })
      setThumbnailPreview(null)
      
      // Refresh video list if on list view
      if (activeView === 'list') {
        fetchVideos()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload video')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return

    try {
      const response = await fetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete video')
      }

      toast.success('Video deleted successfully!')
      setVideos(videos.filter(v => v.id !== videoId))
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete video')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid image type. Allowed: JPG, JPEG, PNG, WEBP, GIF')
        return
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail image size must be less than 5MB')
        return
      }

      setVideoFormData({ ...videoFormData, thumbnail: file })

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    setVideoFormData({ ...videoFormData, category_id: categoryId })
    setIsCategoryOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false)
      }
    }

    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCategoryOpen])

  // Category management functions
  const handleNewCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', description: '' })
    setIsCategoryModalOpen(true)
  }

  const handleCategoryEdit = (category: VideoCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    })
    setIsCategoryModalOpen(true)
    setOpenCategoryDropdownId(null)
  }

  const handleCategoryDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/video-categories?id=${categoryId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category')
      }

      toast.success('Category deleted successfully!')
      setCategories(categories.filter(c => c.id !== categoryId))
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete category')
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      const url = editingCategory
        ? `/api/video-categories?id=${editingCategory.id}`
        : '/api/video-categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryFormData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save category')
      }

      toast.success(editingCategory ? 'Category updated successfully!' : 'Category created successfully!')
      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', description: '' })
      fetchCategories()
    } catch (error: any) {
      console.error('Category save error:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setIsLoading(false)
    }
  }

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
      accessor: 'file_url',
      render: (value: string, row: Video) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenDropdownId(openDropdownId === row.id ? null : row.id)
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Actions"
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {openDropdownId === row.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdownId(null)}
              />
              
              <div 
                className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                ref={(el) => {
                  if (el && openDropdownId === row.id) {
                    const container = el.closest('.relative') as HTMLElement
                    const button = container?.querySelector('button') as HTMLElement
                    if (button) {
                      const rect = button.getBoundingClientRect()
                      el.style.top = `${rect.bottom + 8}px`
                      el.style.right = `${window.innerWidth - rect.right}px`
                    }
                  }
                }}
              >
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Watch Video
                </a>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenDropdownId(null)
                    handleDelete(row.id)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  const categoryColumns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (value: string) => (
        <span className="font-semibold text-slate-800">{value}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (value: string | null) => (
        <span className="text-gray-600">{value || 'No description'}</span>
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: VideoCategory) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenCategoryDropdownId(openCategoryDropdownId === row.id ? null : row.id)
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Actions"
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {openCategoryDropdownId === row.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenCategoryDropdownId(null)}
              />
              
              <div 
                className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
                ref={(el) => {
                  if (el && openCategoryDropdownId === row.id) {
                    const container = el.closest('.relative') as HTMLElement
                    const button = container?.querySelector('button') as HTMLElement
                    if (button) {
                      const rect = button.getBoundingClientRect()
                      el.style.top = `${rect.bottom + 8}px`
                      el.style.right = `${window.innerWidth - rect.right}px`
                    }
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCategoryEdit(row)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenCategoryDropdownId(null)
                    handleCategoryDelete(row.id)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveView('upload')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'upload'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Upload Video
            {activeView === 'upload' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'categories'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Video Categories
            {activeView === 'categories' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeView === 'list'
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
              }
            `}
          >
            Video List
            {activeView === 'list' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-indigo-600 to-blue-600"></span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeView === 'list' ? (
        <div>          
          <div className="overflow-x-auto overflow-y-visible">
            <DataTable
              columns={columns}
              data={videos}
              isLoading={isLoading}
              emptyMessage="No videos uploaded yet"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          {activeView === 'upload' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-6">Upload New Video</h3>
              <form onSubmit={handleVideoUpload} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Video Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={videoFormData.title}
                    onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white border-gray-300 text-black placeholder-gray-400"
                    placeholder="Enter video title"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="relative" ref={categoryDropdownRef}>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => !isLoading && setIsCategoryOpen(!isCategoryOpen)}
                    disabled={isLoading}
                    className={`
                      w-full px-4 py-3 border-2 rounded-lg 
                      focus:outline-none focus:ring-2 focus:ring-black focus:border-black 
                      transition-all bg-white border-gray-300 text-black
                      flex items-center justify-between
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
                      ${!videoFormData.category_id ? 'text-gray-500' : 'text-black'}
                    `}
                  >
                    <span>
                      {videoFormData.category_id 
                        ? categories.find(c => c.id === videoFormData.category_id)?.name || 'Select a category'
                        : 'Select a category'
                      }
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCategoryOpen && !isLoading && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsCategoryOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {categories && categories.length > 0 ? (
                          categories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategorySelect(category.id)}
                              className={`
                                w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors
                                ${videoFormData.category_id === category.id ? 'bg-gray-100 font-semibold' : ''}
                              `}
                            >
                              {category.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            No categories available. Create categories first.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Description
                  </label>
                  <textarea
                    value={videoFormData.description}
                    onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white border-gray-300 text-black placeholder-gray-400"
                    placeholder="Enter video description"
                    rows={4}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Video File <span className="text-red-500">*</span>
                  </label>
                  <FileUpload
                    accept="video/*"
                    maxSize={500}
                    onUpload={async (file) => {
                      setVideoFormData({ ...videoFormData, file })
                    }}
                    label="Upload Video"
                    description="Supported formats: MP4, AVI, MOV, WMV, FLV (Max 500MB)"
                    isLoading={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Thumbnail Image
                  </label>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleThumbnailChange}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white border-gray-300 text-black"
                      disabled={isLoading}
                    />
                    {thumbnailPreview && (
                      <div className="w-32 h-20 border-2 border-gray-300 rounded-lg overflow-hidden">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                >
                  {isLoading ? 'Uploading...' : 'Upload Video'}
                </button>
              </form>
            </div>
          )}

          {activeView === 'categories' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800"></h3>
                <button
                  onClick={handleNewCategory}
                  className="px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Category
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-visible">
                <DataTable
                  columns={categoryColumns}
                  data={categories}
                  isLoading={isLoading}
                  emptyMessage="No categories created yet"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                  setCategoryFormData({ name: '', description: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
                  placeholder="e.g., Tutorial, Documentary, Entertainment"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Description
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-black bg-white"
                  placeholder="Category description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    setEditingCategory(null)
                    setCategoryFormData({ name: '', description: '' })
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
