'use client'

/**
 * Client-side PDF compression (in the admin browser) using Ghostscript-WASM.
 *
 * Runs in a classic Web Worker (see public/pdf-compress.worker.js) so the heavy
 * re-encoding never blocks the UI. Only PDFs are compressed; other document types
 * (doc/docx/txt/xls/xlsx) and PDFs that don't shrink fall back to the original file.
 *
 * Note: text-only PDFs barely shrink — meaningful savings come from image/scan-heavy PDFs
 * where Ghostscript downsamples embedded images to ~150 DPI (the /ebook preset).
 */

export interface PdfCompressionClientResult {
  file: File
  originalSize: number
  compressedSize: number
  compressed: boolean
  reason?: string
}

interface CompressOptions {
  onProgress?: (ratio: number) => void
}

// Skip very large PDFs (WASM memory) and tiny ones (not worth it).
export const MAX_CLIENT_PDF_BYTES = 200 * 1024 * 1024 // 200 MB
const MIN_CLIENT_PDF_BYTES = 300 * 1024 // 300 KB
const MIN_SAVINGS_RATIO = 0.05
const WORKER_TIMEOUT_MS = 5 * 60 * 1000

const GS_ARGS = [
  '-sDEVICE=pdfwrite',
  '-dCompatibilityLevel=1.4',
  '-dPDFSETTINGS=/ebook',
  '-dDownsampleColorImages=true',
  '-dColorImageResolution=150',
  '-dDownsampleGrayImages=true',
  '-dGrayImageResolution=150',
  '-dDownsampleMonoImages=true',
  '-dMonoImageResolution=300',
  '-dNOPAUSE',
  '-dQUIET',
  '-dBATCH',
  '-sOutputFile=output.pdf',
  'input.pdf',
]

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function shouldCompressPdf(file: File): boolean {
  const isPdf = getExtension(file.name) === 'pdf' || (file.type || '').toLowerCase() === 'application/pdf'
  return isPdf && file.size >= MIN_CLIENT_PDF_BYTES && file.size <= MAX_CLIENT_PDF_BYTES
}

function runWorker(inputBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/pdf-compress.worker.js')
    const id = Math.random().toString(36).slice(2)

    const cleanup = () => {
      clearTimeout(timer)
      worker.terminate()
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('PDF compression timed out'))
    }, WORKER_TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {}
      if (data.id !== id) return
      cleanup()
      if (data.ok) {
        resolve(data.bytes as ArrayBuffer)
      } else {
        reject(new Error(data.error || 'PDF compression failed'))
      }
    }

    worker.onerror = (event) => {
      cleanup()
      reject(new Error(event.message || 'PDF worker error'))
    }

    worker.postMessage({ id, bytes: inputBuffer, args: GS_ARGS }, [inputBuffer])
  })
}

export async function compressPdfClient(
  file: File,
  options: CompressOptions = {}
): Promise<PdfCompressionClientResult> {
  const { onProgress } = options
  const originalSize = file.size

  const fallback = (reason: string): PdfCompressionClientResult => ({
    file,
    originalSize,
    compressedSize: originalSize,
    compressed: false,
    reason,
  })

  if (!shouldCompressPdf(file)) {
    return fallback(
      file.size > MAX_CLIENT_PDF_BYTES ? 'PDF too large for in-browser compression' : 'Not eligible for compression'
    )
  }

  if (typeof Worker === 'undefined') {
    return fallback('Web Workers unavailable')
  }

  try {
    onProgress?.(0)
    const inputBuffer = await file.arrayBuffer()
    const outputBuffer = await runWorker(inputBuffer)
    onProgress?.(1)

    const compressedSize = outputBuffer.byteLength
    const savings = (originalSize - compressedSize) / originalSize

    if (compressedSize === 0 || savings < MIN_SAVINGS_RATIO) {
      return fallback('Compression not beneficial')
    }

    const baseName = file.name.replace(/\.[^./]+$/, '') || 'document'
    const compressedFile = new File([outputBuffer], `${baseName}.pdf`, { type: 'application/pdf' })

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressed: true,
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown compression error'
    return fallback(reason)
  }
}
