'use client'

import { ReactNode, useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

type ModalVariant = 'center' | 'fullscreen'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode

  variant?: ModalVariant
  className?: string

  /** When false, disables ESC + backdrop click close (useful during saving). */
  isDismissable?: boolean

  showCloseButton?: boolean
  closeButtonAriaLabel?: string
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  return Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
    const style = window.getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  })
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = 'center',
  className = '',
  isDismissable = true,
  showCloseButton = true,
  closeButtonAriaLabel = 'Close',
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null
    return document.body
  }, [])

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // Focus management + ESC + focus trap
  useEffect(() => {
    if (!isOpen) return

    const previousActive = document.activeElement as HTMLElement | null
    const dialogEl = dialogRef.current

    const focusFirst = () => {
      if (!dialogEl) return
      const focusables = getFocusableElements(dialogEl)
      if (focusables.length > 0) focusables[0].focus()
      else dialogEl.focus()
    }

    // Focus after paint
    const t = window.setTimeout(focusFirst, 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (!dialogEl) return

      if (e.key === 'Escape' && isDismissable) {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return
      const focusables = getFocusableElements(dialogEl)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (active === first || active === dialogEl)) {
        e.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus?.()
    }
  }, [isOpen, isDismissable, onClose])

  if (!isOpen || !portalTarget) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDismissable) return
    if (e.target === e.currentTarget) onClose()
  }

  const backdropClasses =
    variant === 'fullscreen'
      ? 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto'
      : 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'

  const panelClasses =
    variant === 'fullscreen'
      ? `min-h-screen flex items-stretch justify-center ${className}`.trim()
      : `bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${className}`.trim()

  const dialogClasses = variant === 'fullscreen' ? 'w-full bg-white shadow-2xl' : ''

  return createPortal(
    <div className={backdropClasses} onClick={handleBackdropClick}>
      <div className={panelClasses} onClick={(e) => e.stopPropagation()}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={dialogClasses}
        >
          {(title || description) && (
            <div
              className={
                variant === 'fullscreen'
                  ? 'sticky top-0 bg-white z-10 p-6 border-b border-slate-200'
                  : 'p-6 pb-4'
              }
            >
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between gap-4">
                  {title ? (
                    <h2 id={titleId} className="text-2xl font-bold text-slate-900 font-heading">
                      {title}
                    </h2>
                  ) : (
                    <div aria-hidden="true" />
                  )}

                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={closeButtonAriaLabel}
                      disabled={!isDismissable}
                      className="text-slate-400 hover:text-slate-700 text-3xl leading-none p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              {description && (
                <p id={descriptionId} className="text-slate-600 mt-2">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    portalTarget
  )
}


