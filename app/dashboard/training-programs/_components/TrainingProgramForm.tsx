'use client'

import { useState } from 'react'
import { Card, Button } from '../../../components/ui'
import { ThumbnailUpload } from '../../../components/forms'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../../shared/api'
import type { TrainingProgramInput, TrainingProgramType } from '../../shared/hooks/useTrainingPrograms'
import { PROGRAM_TYPE_OPTIONS } from './trainingProgramUtils'

export type TrainingProgramFormState = {
  title: string
  program_type: TrainingProgramType
  description: string
  event_start_at: string
  event_end_at: string
  location: string
  instructor: string
  highlights: string[]
  cta_label: string
  cta_url: string
  is_published: boolean
  sort_order: number
}

interface TrainingProgramFormProps {
  initial: TrainingProgramFormState
  existingCoverUrl?: string | null
  isSaving: boolean
  submitLabel: string
  onSubmit: (payload: TrainingProgramInput) => Promise<void>
  onCancel: () => void
}

export default function TrainingProgramForm({
  initial,
  existingCoverUrl = null,
  isSaving,
  submitLabel,
  onSubmit,
  onCancel,
}: TrainingProgramFormProps) {
  const [formData, setFormData] = useState<TrainingProgramFormState>(initial)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(existingCoverUrl)

  const handleCoverUpload = (file: File) => {
    setCoverFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCoverRemove = () => {
    setCoverFile(null)
    setCoverPreview(null)
  }

  const handleHighlightChange = (index: number, value: string) => {
    const next = [...formData.highlights]
    next[index] = value
    setFormData((prev) => ({ ...prev, highlights: next }))
  }

  const handleAddHighlight = () => {
    setFormData((prev) => ({ ...prev, highlights: [...prev.highlights, ''] }))
  }

  const handleRemoveHighlight = (index: number) => {
    const next = formData.highlights.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, highlights: next.length > 0 ? next : [''] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      notify.error('ឈ្មោះវគ្គត្រូវការ')
      return
    }

    let coverUrl = existingCoverUrl ?? null

    if (coverFile) {
      const coverFormData = new FormData()
      coverFormData.append('file', coverFile)
      coverFormData.append('bucket', 'documents')
      coverFormData.append('path', `covers/training-programs/${coverFile.name}`)

      const uploadResponse = await apiFetch('/api/storage/upload', {
        method: 'POST',
        body: coverFormData,
      })
      const uploadResult = await uploadResponse.json()
      if (!uploadResponse.ok) {
        notify.error(uploadResult.error || 'ផ្ទុករូបតំណាងមិនជោគជ័យ')
        return
      }
      coverUrl = uploadResult.data?.publicUrl || uploadResult.data?.url || coverUrl
    } else if (!coverPreview) {
      coverUrl = null
    }

    await onSubmit({
      title: formData.title.trim(),
      program_type: formData.program_type,
      description: formData.description.trim() || null,
      cover_url: coverUrl,
      event_start_at: formData.event_start_at.trim()
        ? new Date(formData.event_start_at).toISOString()
        : null,
      event_end_at: formData.event_end_at.trim()
        ? new Date(formData.event_end_at).toISOString()
        : null,
      location: formData.location.trim() || null,
      instructor: formData.instructor.trim() || null,
      highlights: formData.highlights.filter((h) => h.trim() !== ''),
      cta_label: formData.cta_label.trim() || 'សួរព័ត៌មាន',
      cta_url: formData.cta_url.trim() || '/contact',
      is_published: formData.is_published,
      sort_order: formData.sort_order,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">ព័ត៌មានទូទៅ</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                ឈ្មោះវគ្គ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                placeholder="ឧ. វគ្គបណ្តុះបណ្តាលច្បាប់ពាណិជ្ជកម្ម"
                required
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">ប្រភេទ</label>
                <select
                  value={formData.program_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      program_type: e.target.value as TrainingProgramType,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                  disabled={isSaving}
                >
                  {PROGRAM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">លំដាប់បង្ហាញ</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">ការពិពណ៌នា</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                placeholder="ពិពណ៌នាអំពីវគ្គ គោលបំណង និងអ្នកចូលរួម..."
                disabled={isSaving}
              />
            </div>

            <div>
              <p className="block text-sm font-semibold text-slate-900 mb-2">រូបតំណាង</p>
              <ThumbnailUpload
                preview={coverPreview}
                onUpload={handleCoverUpload}
                onRemove={handleCoverRemove}
                isLoading={isSaving}
              />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">កាលបរិច្ឆេទ និងទីតាំង</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">ចាប់ផ្តើម</label>
              <input
                type="datetime-local"
                value={formData.event_start_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, event_start_at: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">បញ្ចប់</label>
              <input
                type="datetime-local"
                value={formData.event_end_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, event_end_at: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">ទីតាំង</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                placeholder="ឧ. ការិយាល័យ WIMUTISASTR"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">អ្នកដឹកនាំ / វុទ្ធីជន</label>
              <input
                type="text"
                value={formData.instructor}
                onChange={(e) => setFormData((prev) => ({ ...prev, instructor: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                disabled={isSaving}
              />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">ចំណុចសំខាន់</h3>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddHighlight} disabled={isSaving}>
              + បន្ថែម
            </Button>
          </div>
          <div className="space-y-3">
            {formData.highlights.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                  placeholder="ឧ. ការណែនាំជាក់លាក់ពីអ្នកជំនាញ"
                  disabled={isSaving}
                />
                {formData.highlights.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveHighlight(index)}
                    disabled={isSaving}
                  >
                    លុប
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">ប៊ូតុង និងការបង្ហាញ</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">អត្ថបទប៊ូតុង</label>
                <input
                  type="text"
                  value={formData.cta_label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cta_label: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">តំណភ្ជាប់</label>
                <input
                  type="text"
                  value={formData.cta_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cta_url: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                  placeholder="/contact"
                  disabled={isSaving}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300"
                disabled={isSaving}
              />
              <span className="text-sm font-medium text-slate-900">បង្ហាញនៅគេហទំព័រ (វគ្គបណ្តុះបណ្តាល)</span>
            </label>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            បោះបង់
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'កំពុងរក្សាទុក…' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}
