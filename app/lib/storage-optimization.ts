/**
 * Storage Optimization Utilities
 * 
 * Handles image compression, video optimization metadata,
 * and file size reduction before uploading to R2 storage.
 */

interface OptimizationResult {
  buffer: Buffer
  mimeType: string
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}

interface ImageOptimizationOptions {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * Optimize images using browser-compatible compression
 * This is a placeholder for sharp integration
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult> {
  const {
    quality = 85,
    maxWidth = 2000,
    maxHeight = 2000,
    format = 'jpeg'
  } = options

  const arrayBuffer = await file.arrayBuffer()
  const originalSize = arrayBuffer.byteLength

  // For now, return the original buffer
  // TODO: Integrate sharp for server-side image optimization
  const buffer = Buffer.from(arrayBuffer)

  return {
    buffer,
    mimeType: format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp',
    originalSize,
    optimizedSize: buffer.length,
    compressionRatio: ((originalSize - buffer.length) / originalSize) * 100
  }
}

/**
 * Optimize thumbnails (aggressive compression for small file sizes)
 */
export async function optimizeThumbnail(file: File): Promise<OptimizationResult> {
  return optimizeImage(file, {
    quality: 75,
    maxWidth: 800,
    maxHeight: 800,
    format: 'jpeg'
  })
}

/**
 * Optimize cover images (balance between quality and file size)
 */
export async function optimizeCoverImage(file: File): Promise<OptimizationResult> {
  return optimizeImage(file, {
    quality: 85,
    maxWidth: 1200,
    maxHeight: 1600,
    format: 'jpeg'
  })
}

/**
 * Check if file is an image that should be optimized
 */
export function shouldOptimizeImage(mimeType: string): boolean {
  const optimizableTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
  return optimizableTypes.includes(mimeType.toLowerCase())
}

/**
 * Get recommended video codec and settings based on file size
 */
export function getVideoOptimizationRecommendations(fileSize: number) {
  const sizeInMB = fileSize / (1024 * 1024)
  
  if (sizeInMB > 500) {
    return {
      shouldOptimize: true,
      recommendation: 'Consider compressing video to reduce file size',
      targetBitrate: '2000k',
      codec: 'h264',
      estimatedReduction: '30-50%'
    }
  } else if (sizeInMB > 200) {
    return {
      shouldOptimize: true,
      recommendation: 'Video is large but acceptable. Optional compression recommended',
      targetBitrate: '3000k',
      codec: 'h264',
      estimatedReduction: '20-30%'
    }
  }
  
  return {
    shouldOptimize: false,
    recommendation: 'Video size is optimal',
    targetBitrate: 'N/A',
    codec: 'N/A',
    estimatedReduction: 'N/A'
  }
}

/**
 * Calculate optimal chunk size for streaming uploads
 */
export function getOptimalChunkSize(fileSize: number): number {
  if (fileSize > 500 * 1024 * 1024) { // > 500MB
    return 10 * 1024 * 1024 // 10MB chunks
  } else if (fileSize > 100 * 1024 * 1024) { // > 100MB
    return 5 * 1024 * 1024 // 5MB chunks
  } else {
    return 2 * 1024 * 1024 // 2MB chunks
  }
}

/**
 * Validate and sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
    .replace(/_{2,}/g, '_') // Remove duplicate underscores
    .toLowerCase()
}

/**
 * Generate optimized file path with category organization
 */
export function generateOptimizedPath(
  originalPath: string,
  categorySlug?: string,
  isOptimized: boolean = false
): string {
  const parts = originalPath.split('/')
  const fileName = parts[parts.length - 1]
  
  if (isOptimized) {
    const [name, ext] = fileName.split('.')
    const optimizedName = `${name}_optimized.${ext}`
    parts[parts.length - 1] = optimizedName
  }
  
  if (categorySlug) {
    return `${categorySlug}/${parts.join('/')}`
  }
  
  return parts.join('/')
}

