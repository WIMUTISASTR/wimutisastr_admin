import { useState, useEffect, useRef } from 'react'

interface UseDropdownReturn {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
  dropdownRef: React.RefObject<HTMLDivElement>
}

/**
 * Custom hook to manage dropdown open/close state with click-outside detection
 */
export function useDropdown(): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return {
    isOpen,
    toggle: () => setIsOpen(prev => !prev),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    dropdownRef,
  }
}

