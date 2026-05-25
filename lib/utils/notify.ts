import { toast, type Id, type ToastOptions } from 'react-toastify'
import { translateToastMessage } from '@/lib/utils/translateToastMessage'

/**
 * App-wide toast helpers (react-toastify). Use these instead of importing `toast` directly
 * so defaults and Khmer translations stay consistent.
 */
export const notify = {
  success(message: string, options?: ToastOptions): Id {
    return toast.success(translateToastMessage(message), { autoClose: 3200, ...options })
  },

  error(message: string, options?: ToastOptions): Id {
    return toast.error(translateToastMessage(message), { autoClose: 5500, ...options })
  },

  info(message: string, options?: ToastOptions): Id {
    return toast.info(translateToastMessage(message), { autoClose: 4200, ...options })
  },

  warning(message: string, options?: ToastOptions): Id {
    return toast.warning(translateToastMessage(message), { autoClose: 4500, ...options })
  },

  dismiss: toast.dismiss,
  isActive: toast.isActive,
}
