'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUploadQueue } from '@/app/contexts/UploadQueueContext'

function formatSpeed(bytesPerSec?: number): string | null {
  if (!bytesPerSec || bytesPerSec <= 0) return null
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  return `${Math.round(bytesPerSec)} B/s`
}

function mediaTypeLabel(mediaType: 'video' | 'document') {
  return mediaType === 'document' ? 'ឯកសារ' : 'វីដេអូ'
}

function statusLabel(status: string) {
  switch (status) {
    case 'uploading':
      return 'កំពុងផ្ទុក'
    case 'saving':
      return 'កំពុងរក្សាទុក'
    case 'completed':
      return 'រួចរាល់'
    case 'error':
      return 'បរាជ័យ'
    default:
      return status
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'error':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'saving':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    default:
      return 'bg-navy-50 text-navy-700 border-navy-200'
  }
}

export default function UploadQueueDropdown() {
  const { jobs, activeCount, panelOpen, setPanelOpen, togglePanel, dismissJob, clearCompleted } =
    useUploadQueue()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [panelOpen, setPanelOpen])

  const hasCompleted = jobs.some((j) => j.status === 'completed')

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
        aria-expanded={panelOpen}
        aria-haspopup="true"
        aria-label="មើលវឌ្ឍនភាពការផ្ទុក"
      >
        <svg className="h-5 w-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span className="hidden sm:inline">ការផ្ទុក</span>
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-label="វឌ្ឍនភាពផ្ទុក"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">វឌ្ឍនភាពផ្ទុក</p>
              <p className="text-xs text-slate-500">
                {activeCount > 0 ? `${activeCount} កំពុងដំណើរការ` : 'គ្មានការផ្ទុកកំពុងដំណើរការ'}
              </p>
            </div>
            {hasCompleted && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs font-medium text-navy-600 hover:text-navy-800"
              >
                លុបរួចរាល់
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,20rem)] overflow-y-auto p-2">
            {jobs.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">មិនទាន់មានការផ្ទុក</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{job.label}</p>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {mediaTypeLabel(job.mediaType)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{job.fileName}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(job.status)}`}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </div>

                    {(job.status === 'uploading' || job.status === 'saving') && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-slate-600">
                          <span className="truncate pr-2">{job.step}</span>
                          <span className="flex shrink-0 items-center gap-2 tabular-nums font-medium">
                            {formatSpeed(job.bytesPerSec) && (
                              <span className="text-navy-600">{formatSpeed(job.bytesPerSec)}</span>
                            )}
                            <span>{Math.round(job.progress)}%</span>
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-200"
                          role="progressbar"
                          aria-valuenow={Math.round(job.progress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-linear-to-r from-navy-600 to-navy-500 transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {job.status === 'error' && job.error && (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {job.error}
                      </p>
                    )}

                    {(job.status === 'completed' || job.status === 'error') && (
                      <button
                        type="button"
                        onClick={() => dismissJob(job.id)}
                        className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        លុបចេញ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 border-t border-slate-100 px-3 py-2">
            <Link
              href="/dashboard/videos/upload"
              onClick={() => setPanelOpen(false)}
              className="rounded-lg px-2 py-2 text-center text-xs font-medium text-navy-700 hover:bg-navy-50"
            >
              + វីដេអូ
            </Link>
            <Link
              href="/dashboard/documents/upload"
              onClick={() => setPanelOpen(false)}
              className="rounded-lg px-2 py-2 text-center text-xs font-medium text-navy-700 hover:bg-navy-50"
            >
              + ឯកសារ
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
