'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { PageHeader } from '../../../components/layout'
import { Card, Badge, Button } from '../../../components/ui'
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
      const response = await fetch(`/api/payment-proofs?id=${proofId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment proof')
      }

      setProof(result.data)
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message || 'Failed to load payment proof')
      router.push('/dashboard/payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!proof) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/payment-proofs?id=${proof.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'verified',
          notes: 'Approved by admin',
          membership_starts_at: proof.membership_starts_at || new Date().toISOString(),
          membership_ends_at: proof.membership_ends_at || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve payment proof')
      }

      toast.success('Payment proof approved successfully!')
      router.push('/dashboard/payments')
    } catch (error: any) {
      console.error('Approve error:', error)
      toast.error(error.message || 'Failed to approve payment proof')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!proof) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/payment-proofs?id=${proof.id}`, {
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
    } catch (error: any) {
      console.error('Reject error:', error)
      toast.error(error.message || 'Failed to reject payment proof')
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
        title="Payment Proof Details"
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
                  Payment Status: <Badge
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
                  {proof.status === 'pending' && 'This payment proof is awaiting review'}
                  {proof.status === 'verified' && 'This payment has been approved'}
                  {proof.status === 'rejected' && 'This payment has been rejected'}
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
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="transform-none"
                >
                  Approve
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Proof Image */}
        <Card padding="none" className="overflow-hidden">
          <div className="bg-slate-50 p-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Proof Image</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <img
                src={proof.proof_url}
                alt="Payment proof"
                className="w-full h-auto max-h-[600px] object-contain"
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
          <h3 className="text-lg font-bold text-slate-900 mb-4">User Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
              <p className="text-slate-900 font-medium">{proof.user?.email || 'Unknown'}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Membership Status</label>
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
                <label className="block text-sm font-semibold text-slate-600 mb-1">Membership Approved</label>
                <p className="text-slate-900">{new Date(proof.user.membership_approved_at).toLocaleString()}</p>
              </div>
            )}

            {proof.user?.membership_denied_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Membership Denied</label>
                <p className="text-slate-900">{new Date(proof.user.membership_denied_at).toLocaleString()}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Registered</label>
              <p className="text-slate-900">{proof.user?.registered_at ? new Date(proof.user.registered_at).toLocaleString() : 'Unknown'}</p>
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Payment Reference</label>
              <p className="text-slate-900 font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                {proof.payment_reference}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Plan</label>
              <Badge variant="default" size="lg">{proof.plan_id}</Badge>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Amount</label>
              <p className="text-2xl font-bold text-slate-900">${proof.amount}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Uploaded</label>
              <p className="text-slate-900">
                {new Date(proof.uploaded_at).toLocaleString('en-US', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">File Type</label>
              <p className="text-slate-900">{proof.file_type}</p>
            </div>

            {proof.verified_at && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Verified At</label>
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
                <label className="block text-sm font-semibold text-slate-600 mb-1">Membership Starts</label>
                <p className="text-slate-900">
                  {new Date(proof.membership_starts_at).toLocaleDateString('en-US', {
                    dateStyle: 'long'
                  })}
                </p>
              </div>
            )}

            {proof.membership_ends_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Membership Ends</label>
                <p className="text-slate-900">
                  {new Date(proof.membership_ends_at).toLocaleDateString('en-US', {
                    dateStyle: 'long'
                  })}
                </p>
              </div>
            )}

            {proof.notes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Notes</label>
                <p className="text-slate-900 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                  {proof.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons for Pending Status */}
        {proof.status === 'pending' && (
          <Card padding="md" className="bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Review This Payment</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Approve or reject this payment proof to update the user's membership status
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleReject}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="transform-none"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  className="transform-none"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
