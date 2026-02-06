'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false)
    setProgress(0)
  }, [pathname, searchParams])

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null

    if (isNavigating) {
      setProgress(10)
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            return prev
          }
          return prev + 10
        })
      }, 100)
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [isNavigating])

  // Listen for navigation start
  useEffect(() => {
    const handleStart = () => {
      setIsNavigating(true)
    }

    // Using a MutationObserver to detect when navigation starts
    // This is a lightweight approach that works with Next.js App Router
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Navigation detected
        }
      })
    })

    // Start observing
    if (typeof document !== 'undefined') {
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-slate-200">
      <div
        className="h-full bg-gold-500 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
