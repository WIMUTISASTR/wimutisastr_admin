'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PINInput, { PINInputRef } from '@/app/components/auth/PINInput'
import AuthCard from '@/app/components/auth/AuthCard'
import { Button } from '@/app/components/ui'
import { notify } from '@/lib/utils/notify'

export default function PINPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pinInputRef = useRef<PINInputRef>(null)
  const router = useRouter()

  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const response = await fetch('/api/auth/verify-pin', { method: 'GET' })
        if (response.ok) {
          router.push('/login')
        }
      } catch {
        // stay on PIN page
      }
    }
    checkPinStatus()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pin = pinInputRef.current?.getValue() || ''

    if (pin.length !== 6) {
      const message = 'សូមបញ្ចូល PIN ចំនួន ៦ ខ្ទង់'
      setError(message)
      notify.error(message)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push('/login')
      } else {
        const message = 'PIN មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។'
        setError(message)
        notify.error(message)
        pinInputRef.current?.reset()
        setIsLoading(false)
      }
    } catch {
      const message = 'មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។'
      setError(message)
      notify.error(message)
      pinInputRef.current?.reset()
      setIsLoading(false)
    }
  }

  return (
    <AuthCard footer={<p className="text-xs text-slate-500">សម្រាប់បុគ្គលិកដែលមានសិទ្ធិប៉ុណ្ណោះ</p>}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-4 text-center">
            បញ្ចូល PIN ចំនួន ៦ ខ្ទង់
          </p>
          <PINInput ref={pinInputRef} error={error} disabled={isLoading} />
        </div>

        <Button type="submit" variant="accent" disabled={isLoading} isLoading={isLoading} fullWidth>
          បន្ត
        </Button>
      </form>
    </AuthCard>
  )
}
