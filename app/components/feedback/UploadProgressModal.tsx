'use client'

import Modal from './Modal'

interface UploadProgressModalProps {
  isOpen: boolean
  progress: number
  currentStep: string
  fileName?: string
}

export default function UploadProgressModal({
  isOpen,
  progress,
  currentStep,
  fileName,
}: UploadProgressModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Uploading"
      variant="center"
      isDismissable={false}
      showCloseButton={false}
      className="p-6"
    >
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Uploading Video</h3>
        </div>
        
        {fileName && (
          <p className="text-sm text-gray-600 mb-4 truncate font-medium">{fileName}</p>
        )}
        
        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{currentStep || 'Preparing...'}</span>
          <span className="text-sm font-semibold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
            className="bg-linear-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
        </div>
      </div>
    </Modal>
  )
}

