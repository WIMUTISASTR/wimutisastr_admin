'use client'

/**
 * Client-side video compression (in the admin browser) using ffmpeg.wasm.
 *
 * Runs the single-threaded @ffmpeg/core (no SharedArrayBuffer / COOP-COEP required) and
 * loads the core from same-origin /public assets copied at build time (see scripts/copy-wasm.mjs).
 *
 * ffmpeg.wasm holds the entire input + output in WASM memory, so very large files are
 * skipped (they would crash the tab) and uploaded as-is. Every failure path falls back to
 * the original file so an upload is never blocked by compression.
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg'

export interface VideoCompressionClientResult {
  file: File
  originalSize: number
  compressedSize: number
  compressed: boolean
  reason?: string
}

interface CompressOptions {
  onProgress?: (ratio: number) => void
}

// Files above this size are NOT compressed in the browser (WASM memory ceiling) — uploaded as-is.
export const MAX_CLIENT_COMPRESS_BYTES = 300 * 1024 * 1024 // 300 MB
// Tiny clips aren't worth the ~31 MB core download + transcode time.
const MIN_CLIENT_COMPRESS_BYTES = 2 * 1024 * 1024 // 2 MB
// Keep the compressed result only if it saves at least this fraction.
const MIN_SAVINGS_RATIO = 0.05

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v']
const FFMPEG_CORE_BASE = '/ffmpeg'

let ffmpegPromise: Promise<FFmpeg> | null = null

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function shouldCompressVideoClient(file: File): boolean {
  const ext = getExtension(file.name)
  const looksLikeVideo = (file.type || '').toLowerCase().startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)
  return (
    looksLikeVideo &&
    file.size >= MIN_CLIENT_COMPRESS_BYTES &&
    file.size <= MAX_CLIENT_COMPRESS_BYTES
  )
}

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise

  ffmpegPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])

    const ffmpeg = new FFmpeg()
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    return ffmpeg
  })()

  try {
    return await ffmpegPromise
  } catch (err) {
    // Allow a later retry if the core failed to load.
    ffmpegPromise = null
    throw err
  }
}

export async function compressVideoClient(
  file: File,
  options: CompressOptions = {}
): Promise<VideoCompressionClientResult> {
  const { onProgress } = options
  const originalSize = file.size

  const fallback = (reason: string): VideoCompressionClientResult => ({
    file,
    originalSize,
    compressedSize: originalSize,
    compressed: false,
    reason,
  })

  if (!shouldCompressVideoClient(file)) {
    return fallback(
      file.size > MAX_CLIENT_COMPRESS_BYTES
        ? 'File too large for in-browser compression'
        : 'Not eligible for compression'
    )
  }

  let ffmpeg: FFmpeg
  try {
    ffmpeg = await loadFfmpeg()
  } catch {
    return fallback('FFmpeg failed to load')
  }

  const { fetchFile } = await import('@ffmpeg/util')

  const ext = getExtension(file.name) || 'mp4'
  const inputName = `input.${ext}`
  const outputName = 'output.mp4'

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.min(1, Math.max(0, progress)))
  }

  try {
    ffmpeg.on('progress', onFfmpegProgress)
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const exitCode = await ffmpeg.exec([
      '-i', inputName,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-vf', "scale='min(1280,iw)':-2:force_original_aspect_ratio=decrease",
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputName,
    ])

    if (exitCode !== 0) {
      return fallback(`FFmpeg exited with code ${exitCode}`)
    }

    const data = (await ffmpeg.readFile(outputName)) as Uint8Array
    const compressedSize = data.byteLength
    const savings = (originalSize - compressedSize) / originalSize

    if (compressedSize === 0 || savings < MIN_SAVINGS_RATIO) {
      return fallback('Compression not beneficial')
    }

    const baseName = file.name.replace(/\.[^./]+$/, '') || 'video'
    const buffer = data.slice().buffer
    const compressedFile = new File([buffer], `${baseName}.mp4`, { type: 'video/mp4' })

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressed: true,
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown compression error'
    return fallback(reason)
  } finally {
    ffmpeg.off('progress', onFfmpegProgress)
    try {
      await ffmpeg.deleteFile(inputName)
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(outputName)
    } catch {
      /* ignore */
    }
  }
}
