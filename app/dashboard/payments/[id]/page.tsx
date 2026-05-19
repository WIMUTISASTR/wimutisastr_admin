'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { PageHeader } from '../../../components/layout'
import Image from 'next/image'
import { Card, Badge, Button } from '../../../components/ui'
import { apiFetch } from '../../shared/api'
import { PaymentProof } from '../../shared/types'
import { formatFileSize } from '../../shared/utils'

export default function PaymentProofDetailPage() {
  const router = useRouter()
  const params = useParams()
  const proofId = params.id as string

  const [proof, setProof] = useState<PaymentProof | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchProof()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofId])

  const fetchProof = async () => {
    try {
      setIsLoading(true)
      const response = await apiFetch(`/api/payment-proofs?id=${proofId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment proof')
      }

      setProof(result.data)
    } catch (error: unknown) {
      console.error('Fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to load payment proof'
      toast.error(message)
      router.push('/dashboard/payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!proof) return

    setIsProcessing(true)
    try {
      const response = await apiFetch(`/api/payment-proofs?id=${proof.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'verified',
          notes: 'Approved by admin',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve payment proof')
      }

      toast.success('Payment proof approved successfully!')
      router.push('/dashboard/payments')
    } catch (error: unknown) {
      console.error('Approve error:', error)
      const message = error instanceof Error ? error.message : 'Failed to approve payment proof'
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!proof) return

    setIsProcessing(true)
    try {
      const response = await apiFetch(`/api/payment-proofs?id=${proof.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          notes: 'Rejected by admin',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject payment proof')
      }

      toast.success('Payment proof rejected successfully!')
      router.push('/dashboard/payments')
    } catch (error: unknown) {
      console.error('Reject error:', error)
      const message = error instanceof Error ? error.message : 'Failed to reject payment proof'
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading || !proof) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="លម្អិតភស្តុតាងការបង់ប្រាក់"
        showBackButton
        backHref="/dashboard/payments"
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Status Banner */}
        <Card padding="md" className={`
          ${proof.status === 'pending' ? 'bg-linear-to-r from-yellow-50 to-yellow-100 border-yellow-200' : ''}
          ${proof.status === 'verified' ? 'bg-linear-to-r from-green-50 to-green-100 border-green-200' : ''}
          ${proof.status === 'rejected' ? 'bg-linear-to-r from-red-50 to-red-100 border-red-200' : ''}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                h-12 w-12 rounded-full flex items-center justify-center
                ${proof.status === 'pending' ? 'bg-yellow-200' : ''}
                ${proof.status === 'verified' ? 'bg-green-200' : ''}
                ${proof.status === 'rejected' ? 'bg-red-200' : ''}
              `}>
                {proof.status === 'pending' && (
                  <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {proof.status === 'verified' && (
                  <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {proof.status === 'rejected' && (
                  <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ស្ថានភាពការបង់ប្រាក់: <Badge
                    variant={
                      proof.status === 'pending' ? 'warning' :
                      proof.status === 'verified' ? 'success' : 'error'
                    }
                    size="lg"
                  >
                    {proof.status}
                  </Badge>
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {proof.status === 'pending' && 'ភស្តុតាងការបង់ប្រាក់នេះកំពុងរង់ចាំការត្រួតពិនិត្យ'}
                  {proof.status === 'verified' && 'ការបង់ប្រាក់នេះត្រូវបានអនុម័ត'}
                  {proof.status === 'rejected' && 'ការបង់ប្រាក់នេះត្រូវបានបដិសេធ'}
                </p>
              </div>
            </div>

            {proof.status === 'pending' && (
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleReject}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="transform-none"
                >
                  បដិសេធ
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="transform-none"
                >
                  អនុម័ត
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Proof Image */}
        <Card padding="none" className="overflow-hidden">
          <div className="bg-slate-50 p-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">រូបភាពភស្តុតាងការបង់ប្រាក់</h3>
            <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-white h-[600px]">
              <Image
                src={proof.proof_url}
                alt="Payment proof"
                fill
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{proof.file_name} • {formatFileSize(parseInt(proof.file_size))}</span>
            </div>
          </div>
        </Card>

        {/* User Information */}
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">ព័ត៌មានអ្នកប្រើ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">អ៊ីមែល</label>
              <p className="text-slate-900 font-medium">{proof.user?.email || 'Unknown'}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">ស្ថានភាពសមាជិក</label>
              <div className="flex items-center gap-2">
                <Badge variant={
                  proof.user?.membership_status === 'approved' ? 'success' :
                  proof.user?.membership_status === 'denied' ? 'error' :
                  'warning'
                }>
                  {proof.user?.membership_status || 'pending'}
                </Badge>
              </div>
            </div>

            {proof.user?.membership_approved_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">សមាជិកភាពបានអនុម័ត</label>
                <p className="text-slate-900">{new Date(proof.user.membership_approved_at).toLocaleString()}</p>
              </div>
            )}

            {proof.user?.membership_denied_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">សមាជិកភាពបានបដិសេធ</label>
                <p className="text-slate-900">{new Date(proof.user.membership_denied_at).toLocaleString()}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">ថ្ងៃចុះឈ្មោះ</label>
              <p className="text-slate-900">{proof.user?.registered_at ? new Date(proof.user.registered_at).toLocaleString() : 'Unknown'}</p>
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">ព័ត៌មានការបង់ប្រាក់</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">លេខយោងការបង់ប្រាក់</label>
              <p className="text-slate-900 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                {proof.payment_reference}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">គម្រោងជាវ</label>
              {proof.subscription_plan ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="font-bold text-slate-900 text-lg">{proof.subscription_plan.name}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    ${proof.subscription_plan.price} {proof.subscription_plan.currency} · {proof.subscription_plan.duration_days} ថ្ងៃ
                  </div>
                </div>
              ) : (
                <Badge variant="default" size="lg">{proof.plan_id}</Badge>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">ចំនួនទឹកប្រាក់</label>
              <p className="text-2xl font-bold text-slate-900">${proof.amount}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">ថ្ងៃបញ្ចូល</label>
              <p className="text-slate-900">
                {new Date(proof.uploaded_at).toLocaleString('en-US', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">ប្រភេទឯកសារ</label>
              <p className="text-slate-900">{proof.file_type}</p>
            </div>

            {proof.verified_at && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-1">ថ្ងៃផ្ទៀងផ្ទាត់</label>
                <p className="text-slate-900">
                  {new Date(proof.verified_at).toLocaleString('en-US', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            )}

            {proof.membership_starts_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">ចាប់ផ្តើមសមាជិកភាព</label>
                <p className="text-slate-900">
                  {new Date(proof.membership_starts_at).toLocaleDateString('en-US', {
                    dateStyle: 'long'
                  })}
                </p>
              </div>
            )}

            {proof.membership_ends_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">អស់សុពលភាពសមាជិក</label>
                <p className="text-slate-900">
                  {new Date(proof.membership_ends_at).toLocaleDateString('en-US', {
                    dateStyle: 'long'
                  })}
                </p>
              </div>
            )}

            {proof.notes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-1">កំណត់ចំណាំ</label>
                <p className="text-slate-900 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                  {proof.notes}
                </p>
              </div>
            )}
          </div>
        </Card>      
      </div>
    </>
  )
}
