'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { Button } from '../../../components/ui'
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

export default function BookUploadForm({ onUpload, isLoading = false, categories = [] }: BookUploadFormProps) {
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
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get main categories (categories without parent_id)
  const mainCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent_id)
  }, [categories])

  // Get subcategories for selected main category
  const availableSubcategories = useMemo(() => {
    if (!selectedMainCategoryId) return []
    return categories.filter(cat => cat.parent_id === selectedMainCategoryId)
  }, [categories, selectedMainCategoryId])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }, [])

  const handleMainCategoryChange = useCallback((mainCategoryId: string) => {
    setSelectedMainCategoryId(mainCategoryId)
    // Reset subcategory selection when main category changes
    setFormData(prev => ({ ...prev, category_id: null }))
    setError('')
  }, [])

  const handleSubcategoryChange = useCallback((subcategoryId: string) => {
    setFormData(prev => ({ ...prev, category_id: subcategoryId || null }))
    setError('')
  }, [])

  // (Category dropdown removed in favor of a simple <select> for consistency)

  const handleFile = useCallback((selectedFile: File) => {
    setError('')
    
    // Check file size
    if (selectedFile.size > FILE_SIZE_LIMITS.BOOK_FILE) {
      setError(`ទំហំឯកសារត្រូវតែតិចជាង ${formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}`)
      return
    }

    // Check file type - allow both regular and edit document types
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ext) {
      setError('ឈ្មោះឯកសារមិនត្រឹមត្រូវ')
      return
    }
    const fileExt = `.${ext}` as
      | (typeof ALLOWED_FILE_TYPES.BOOK_DOCUMENTS)[number]
      | (typeof ALLOWED_FILE_TYPES.BOOK_DOCUMENTS_EDIT)[number]
    const allowedTypes = [...new Set([...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS, ...ALLOWED_FILE_TYPES.BOOK_DOCUMENTS_EDIT])]
    if (!allowedTypes.includes(fileExt)) {
      setError(`ប្រភេទឯកសារមិនត្រឹមត្រូវ។ ប្រភេទដែលអនុញ្ញាត: ${allowedTypes.join(', ').replace(/\./g, '').toUpperCase()}`)
      return
    }

    setFormData(prev => ({ ...prev, file: selectedFile }))
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      if (e.target.id === 'book-file' || !e.target.id) {
        // Handle book file upload
        handleFile(e.target.files[0])
      }
    }
  }, [handleFile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.title.trim()) {
      setError('ចំណងជើងឯកសារត្រូវតែបំពេញ')
      return
    }
    if (!formData.author.trim()) {
      setError('អ្នកនិពន្ធត្រូវតែបំពេញ')
      return
    }
    if (!formData.year.trim()) {
      setError('ឆ្នាំត្រូវតែបំពេញ')
      return
    }
    if (!formData.file) {
      setError('សូមជ្រើសឯកសារ')
      return
    }
    // Determine final category_id: use subcategory if selected, otherwise use main category
    const finalCategoryId = formData.category_id || selectedMainCategoryId

    if (!finalCategoryId) {
      setError('សូមជ្រើសប្រភេទ')
      return
    }
    if (!formData.access_level) {
      setError('សូមជ្រើសកម្រិតការចូលប្រើ')
      return
    }

    try {
      // Use subcategory if selected, otherwise use main category
      const finalCategoryId = formData.category_id || selectedMainCategoryId
      await onUpload({
        ...formData,
        category_id: finalCategoryId || null,
      })
      // Reset form after successful upload
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ការផ្ទុកបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត។'
      setError(message)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="bg-slate-50">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">ផ្ទុកឯកសារ</h3>
          <p className="text-sm text-slate-600 mt-1">បំពេញព័ត៌មានលម្អិត និងផ្ទុកឯកសារ</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">ព័ត៌មានលម្អិត</h4>
            <p className="text-sm text-slate-600 mt-1">ព័ត៌មានឯកសារ</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
      <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
          ចំណងជើងឯកសារ <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="បញ្ចូលចំណងជើងឯកសារ"
          disabled={isLoading}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <label htmlFor="author" className="block text-sm font-semibold text-slate-900 mb-2">
            អ្នកនិពន្ធ <span className="text-red-500">*</span>
          </label>
          <input
            id="author"
            name="author"
            type="text"
            value={formData.author}
            onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="បញ្ចូលឈ្មោះអ្នកនិពន្ធ"
            disabled={isLoading}
            required
          />
        </div>

        <div>
                  <label htmlFor="year" className="block text-sm font-semibold text-slate-900 mb-2">
            ឆ្នាំ <span className="text-red-500">*</span>
          </label>
          <input
            id="year"
            name="year"
            type="number"
            value={formData.year}
            onChange={handleInputChange}
            min="1000"
            max={new Date().getFullYear()}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="e.g., 2024"
            disabled={isLoading}
            required
          />
        </div>
      </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  ប្រភេទ <span className="text-red-500">*</span>
        </label>
                <select
                  value={selectedMainCategoryId}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          disabled={isLoading}
                  required
                >
                  <option value="">ជ្រើសប្រភេទចម្បង</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMainCategoryId && availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    ប្រភេទរង (ស្រេចចិត្ត)
                  </label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  >
                    <option value="">គ្មាន (ប្រើប្រភេទចម្បង)</option>
                    {availableSubcategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    ស្រេចចិត្ត: ជ្រើសប្រភេទរងដើម្បីរៀបចំបន្ថែម
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="access_level" className="block text-sm font-semibold text-slate-900 mb-2">
                  កម្រិតការចូលប្រើ <span className="text-red-500">*</span>
                </label>
                <select
                  id="access_level"
                  name="access_level"
                  value={formData.access_level}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={isLoading}
                  required
                >
                  <option value="members">សមាជិកប៉ុណ្ណោះ</option>
                  <option value="free">ឥតគិតថ្លៃ</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  ជ្រើសថានរណាអាចចូលប្រើឯកសារនេះ
                </p>
              </div>

      <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
          ការពិពណ៌នា
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="ការពិពណ៌នា (ស្រេចចិត្ត)"
          disabled={isLoading}
        />
      </div>
            </div>
          </div>

          {/* Files */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900">ឯកសារ</h4>
            <p className="text-sm text-slate-600 mt-1">អូសទម្លាក់ ឬចុចដើម្បីជ្រើស</p>

            <div className="mt-5 space-y-5">
              {/* Book file */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`
                  rounded-xl border-2 border-dashed p-6 text-center transition-colors
                  ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-slate-50'}
            ${error ? 'border-red-300' : ''}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input
            ref={fileInputRef}
            id="book-file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.epub,.mobi"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
          
                {!formData.file ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900">ផ្ទុកឯកសាររបស់អ្នក</div>
                    <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                      </svg>
                    </div>
                    <div className="text-base font-semibold text-slate-900">ផ្ទុកឯកសារ</div>
                    <div className="text-sm text-slate-500">អូសទម្លាក់ឯកសារទីនេះ</div>
                    <div className="text-xs text-slate-400">
                      ប្រភេទគាំទ្រ: PDF, DOC, DOCX, TXT, XLS, XLSX, EPUB, MOBI។ អតិបរមា {formatFileSize(FILE_SIZE_LIMITS.BOOK_FILE)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 truncate">{formData.file.name}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(formData.file.size)}</div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="transform-none"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        disabled={isLoading}
                      >
                        ផ្លាស់ប្តូរ
                      </Button>
                      <Button
                type="button"
                        variant="ghost"
                        size="sm"
                        className="transform-none text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFormData(prev => ({ ...prev, file: null }))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                disabled={isLoading}
              >
                        យកចេញ
                      </Button>
          </div>
        </div>
                )}
              </div>
            </div>
          </div>
      </div>

      {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
              variant="submit"
        type="submit"
              disabled={isLoading || !formData.title || !formData.author || !formData.year || !formData.file || !selectedMainCategoryId}
        isLoading={isLoading}
              >
              បញ្ជូន
      </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

