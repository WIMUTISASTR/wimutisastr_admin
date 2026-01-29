'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout'
import { Card, Button, UIIcons } from '../../../../components/ui'
import { ThumbnailUpload } from '../../../../components/forms'
import { apiFetch } from '../../../shared/api'
import { useSubscriptionPlans, SubscriptionPlan } from '../../../shared/hooks/useSubscriptionPlans'
import { toast } from 'react-toastify'

export default function EditSubscriptionPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string
  const { updatePlan } = useSubscriptionPlans()
  
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '30',
    currency: 'USD',
    is_active: true,
    features: [''],
    sort_order: 0,
  })
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null)
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null)

  // Fetch plan data
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setIsLoading(true)
        const response = await apiFetch(`/api/subscription-plans?id=${planId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch subscription plan')
        }

        const planData = result.data
        setPlan(planData)
        setFormData({
          name: planData.name,
          description: planData.description || '',
          price: planData.price.toString(),
          duration_days: planData.duration_days.toString(),
          currency: planData.currency,
          is_active: planData.is_active,
          features: planData.features.length > 0 ? planData.features : [''],
          sort_order: planData.sort_order,
        })
        setQrCodePreview(planData.qr_code_url)
      } catch (error: any) {
        console.error('Fetch error:', error)
        toast.error(error.message || 'Failed to load subscription plan')
        router.push('/dashboard/subscriptions')
      } finally {
        setIsLoading(false)
      }
    }

    if (planId) {
      fetchPlan()
    }
  }, [planId, router])

  const handleQrCodeUpload = (file: File) => {
    setQrCodeFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setQrCodePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleQrCodeRemove = () => {
    setQrCodeFile(null)
    setQrCodePreview(plan?.qr_code_url || null)
  }

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features]
    newFeatures[index] = value
    setFormData(prev => ({ ...prev, features: newFeatures }))
  }

  const handleAddFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }))
  }

  const handleRemoveFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, features: newFeatures.length > 0 ? newFeatures : [''] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Plan name is required')
      return
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Valid price is required')
      return
    }

    setIsSaving(true)
    try {
      let qrCodeUrl = plan?.qr_code_url || null

      // Upload QR code if a new file is provided
      if (qrCodeFile) {
        const qrFormData = new FormData()
        qrFormData.append('file', qrCodeFile)
        qrFormData.append('bucket', 'documents')
        // `path` is treated as a server-side hint only; the server generates a safe unique key.
        qrFormData.append('path', `qr-codes/${qrCodeFile.name}`)

        const uploadResponse = await apiFetch('/api/storage/upload', {
          method: 'POST',
          body: qrFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResponse.ok) {
          qrCodeUrl = uploadResult.data?.publicUrl || uploadResult.data?.url
        }
      }

      const planData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        currency: formData.currency,
        qr_code_url: qrCodeUrl,
        is_active: formData.is_active,
        features: formData.features.filter(f => f.trim() !== ''),
        sort_order: formData.sort_order,
      }

      const success = await updatePlan(planId, planData)

      if (success) {
        router.push('/dashboard/subscriptions')
      }
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !plan) {
    return (
      <>
        <PageHeader
          title="Edit Subscription Plan"
          showBackButton
          backHref="/dashboard/subscriptions"
        />
        <div className="max-w-4xl mx-auto mt-6">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-10 bg-slate-200 rounded w-full"></div>
                  <div className="h-10 bg-slate-200 rounded w-full"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Edit Subscription Plan"
        showBackButton
        backHref="/dashboard/subscriptions"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="e.g., Monthly Plan, Yearly Plan"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="Describe what's included in this plan"
                    rows={3}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </Card>

            {/* Pricing */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    placeholder="3.00"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Duration
                  </label>
                  <select
                    value={formData.duration_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    disabled={isSaving}
                  >
                    <option value="7">1 Week</option>
                    <option value="30">1 Month</option>
                    <option value="90">3 Months</option>
                    <option value="180">6 Months</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                    disabled={isSaving}
                  >
                    <option value="USD">USD</option>
                    <option value="KHR">KHR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Features */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Features</h3>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                      placeholder="Feature description"
                      disabled={isSaving}
                    />
                    {formData.features.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveFeature(index)}
                        disabled={isSaving}
                        className="transform-none"
                      >
                        <UIIcons.Delete className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddFeature}
                  disabled={isSaving}
                  className="transform-none"
                >
                  <UIIcons.Plus className="w-4 h-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </Card>

            {/* QR Code */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Payment QR Code</h3>
              <ThumbnailUpload
                onUpload={handleQrCodeUpload}
                preview={qrCodePreview}
                maxSize={5}
                isLoading={isSaving}
                onRemove={handleQrCodeRemove}
              />
            </Card>

            {/* Settings */}
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Settings</h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isSaving}
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-slate-900">
                  Active (visible to users)
                </label>
              </div>
            </Card>

            {/* Submit Buttons */}
            <Card padding="md">
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/dashboard/subscriptions')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="submit"
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  Update Plan
                </Button>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
