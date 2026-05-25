'use client'

import Modal from './Modal'

interface UploadProgressModalProps {
  isOpen: boolean
  progress: number
  currentStep: string
  fileName?: string
  /** Custom title for the upload modal. Defaults to "Uploading File" */
  title?: string
}

export default function UploadProgressModal({
  isOpen,
  progress,
  currentStep,
  fileName,
  title = 'កំពុងបញ្ចូលឯកសារ',
}: UploadProgressModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="កំពុងបញ្ចូល"
      variant="center"
      isDismissable={false}
      showCloseButton={false}
      className="p-6"
    >
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 border border-navy-100">
            <svg
              className="animate-spin h-5 w-5 text-navy-600 motion-reduce:animate-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 font-heading">{title}</h3>
        </div>

        {fileName && (
          <p className="text-sm text-slate-600 mb-4 truncate font-medium rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
            {fileName}
          </p>
        )}

        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">{currentStep || 'កំពុងរៀបចំ...'}</span>
            <span className="text-sm font-semibold text-navy-700 tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div
            className="w-full bg-slate-200 rounded-full h-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-linear-to-r from-navy-600 to-navy-500 h-3 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
    </Modal>
  )
}

