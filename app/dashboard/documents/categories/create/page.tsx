'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../../../shared/api'
import { PageHeader } from '../../../../components/layout'
import { Card, Button } from '../../../../components/ui'

export default function CreateCategoryPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' })

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      notify.error('ឈ្មោះប្រភេទត្រូវតែបំពេញ')
      return
    }

    setIsSaving(true)

    try {
      // Create category (flat, without subcategories/covers)
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'មិនអាចបង្កើតប្រភេទបានទេ')
      }

      notify.success('ប្រភេទត្រូវបានបង្កើតដោយជោគជ័យ!')
      router.push('/dashboard/documents/categories')
    } catch (error: unknown) {
      console.error('Submit error:', error)
      const message = error instanceof Error ? error.message : 'មិនអាចបង្កើតប្រភេទបានទេ'
      notify.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="បង្កើតប្រភេទ"
        showBackButton
        backHref="/dashboard/documents/categories"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <form onSubmit={handleCategorySubmit}>
          <div className="space-y-6">
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">ប្រភេទ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    ឈ្មោះប្រភេទ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="ឧ. ច្បាប់, សេដ្ឋកិច្ច, ប្រវត្តិសាស្ត្រ"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    ការពិពណ៌នា
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="ការពិពណ៌នា (ស្រេចចិត្ត)"
                    rows={3}
                    disabled={isSaving}
                  />
                </div>

              </div>
            </Card>

            {/* Submit Buttons */}
            <Card padding="md">
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/dashboard/documents/categories')}
                  disabled={isSaving}
                >
                  បោះបង់
                </Button>
                <Button
                  type="submit"
                  variant="submit"
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  បង្កើតប្រភេទ
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
