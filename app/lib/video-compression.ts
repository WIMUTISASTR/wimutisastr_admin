import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

interface VideoCompressionOptions {
  crf?: number
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium'
  maxWidth?: number
  timeoutMs?: number
  minSavingsRatio?: number
}

export interface VideoCompressionResult {
  buffer: Buffer
  mimeType: string
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  compressed: boolean
  reason?: string
}

function isVideoMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('video/')
}

function safeBasename(fileName: string): string {
  const ext = path.extname(fileName)
  const base = path.basename(fileName, ext)
  const normalized = base.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_')
  return normalized || 'video'
}

function getUniqueTempName(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg binary path is unavailable'))
      return
    }

    const ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      ffmpeg.kill('SIGKILL')
    }, timeoutMs)

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    ffmpeg.on('close', (code) => {
      clearTimeout(timeout)

      if (timedOut) {
        reject(new Error('Video compression timed out'))
        return
      }

      if (code !== 0) {
        reject(new Error(`FFmpeg exited with code ${code}. ${stderr}`.trim()))
        return
      }

      resolve()
    })
  })
}

export function shouldCompressVideo(mimeType: string, bucket: string): boolean {
  return bucket === 'videos' && isVideoMimeType(mimeType)
}

export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<VideoCompressionResult> {
  const {
    crf = 28,
    preset = 'veryfast',
    maxWidth = 1920,
    timeoutMs = 10 * 60 * 1000,
    minSavingsRatio = 0.05,
  } = options

  const originalArrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(originalArrayBuffer)
  const originalSize = originalBuffer.length

  if (!isVideoMimeType(file.type)) {
    return {
      buffer: originalBuffer,
      mimeType: file.type || 'application/octet-stream',
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 0,
      compressed: false,
      reason: 'Not a video mime type',
    }
  }

  if (!ffmpegPath) {
    return {
      buffer: originalBuffer,
      mimeType: file.type || 'application/octet-stream',
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 0,
      compressed: false,
      reason: 'FFmpeg is not available',
    }
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'video-compress-'))
  const tempPrefix = getUniqueTempName(safeBasename(file.name))
  const inputPath = path.join(tempRoot, `${tempPrefix}-input`)
  const outputPath = path.join(tempRoot, `${tempPrefix}-output.mp4`)

  try {
    await fs.writeFile(inputPath, originalBuffer)

    const args = [
      '-y',
      '-i',
      inputPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      preset,
      '-crf',
      String(crf),
      '-vf',
      `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath,
    ]

    await runFfmpeg(args, timeoutMs)

    const optimizedBuffer = await fs.readFile(outputPath)
    const optimizedSize = optimizedBuffer.length
    const savingsRatio = (originalSize - optimizedSize) / originalSize

    if (optimizedSize === 0 || savingsRatio < minSavingsRatio) {
      return {
        buffer: originalBuffer,
        mimeType: file.type || 'application/octet-stream',
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        compressed: false,
        reason: 'Compression not beneficial',
      }
    }

    return {
      buffer: optimizedBuffer,
      mimeType: 'video/mp4',
      originalSize,
      optimizedSize,
      compressionRatio: savingsRatio * 100,
      compressed: true,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown compression error'
    return {
      buffer: originalBuffer,
      mimeType: file.type || 'application/octet-stream',
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 0,
      compressed: false,
      reason,
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}
