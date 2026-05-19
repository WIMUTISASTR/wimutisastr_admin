'use client'

import Modal from './Modal'
import { Button } from '../ui'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  itemName?: string
  isLoading?: boolean
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'បញ្ជាក់ការលុប',
  message = 'តើអ្នកប្រាកដថាចង់លុបធាតុនេះទេ?',
  itemName,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="center"
      isDismissable={!isLoading}
      className="p-0"
    >
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
        <p className="text-slate-600 text-center">{message}</p>
          
          {itemName && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">ធាតុដែលត្រូវលុប:</p>
              <p className="font-semibold text-slate-800">{itemName}</p>
            </div>
          )}
          
        <p className="text-sm text-red-600 text-center mt-4 font-medium">សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។</p>
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading} fullWidth>
            បោះបង់
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading} fullWidth>
                លុប
        </Button>
      </div>
    </Modal>
  )
}

