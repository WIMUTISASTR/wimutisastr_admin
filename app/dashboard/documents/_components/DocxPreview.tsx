'use client'

import { useRef, useState, useEffect, memo } from 'react'
import { renderAsync } from 'docx-preview'

interface DocxPreviewProps {
  src: string
}

function DocxPreviewComponent({ src }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const el = containerRef.current
    if (!el || !src) return

    el.innerHTML = ''
    setIsRendering(true)
    setRenderError(null)

    ;(async () => {
      try {
        const res = await fetch(src, { signal: controller.signal })
        if (!res.ok) throw new Error('Failed to load document')
        const buffer = await res.arrayBuffer()
        
        // Check if aborted before rendering
        if (controller.signal.aborted) return
        
        el.innerHTML = ''
        await renderAsync(buffer, el, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
        })
      } catch (e: unknown) {
        // Don't set error state if aborted
        if (controller.signal.aborted) return
        const message = e instanceof Error ? e.message : 'Failed to render document'
        setRenderError(message)
      } finally {
        if (controller.signal.aborted) return
        setIsRendering(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [src])

  return (
    <div className="h-full w-full bg-white overflow-auto">
      {isRendering && (
        <div className="p-4 text-sm text-slate-600">Loading document preview…</div>
      )}
      {renderError && (
        <div className="p-4 text-sm text-red-600">{renderError}</div>
      )}
      <div ref={containerRef} className="p-4" />
    </div>
  )
}

export const DocxPreview = memo(DocxPreviewComponent)
export default DocxPreview
