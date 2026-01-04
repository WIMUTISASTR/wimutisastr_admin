/**
 * Client-Side Image Compression
 * 
 * Compresses images in the browser before upload to save bandwidth
 * and storage space. Works with modern browsers using Canvas API.
 */

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
}

interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

/**
 * Compress an image file using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    mimeType = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          
          if (width > height) {
            width = maxWidth
            height = width / aspectRatio
          } else {
            height = maxHeight
            width = height * aspectRatio
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            // Create new File object
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'), // Change extension to jpg
              { type: mimeType }
            )
            
            const originalSize = file.size
            const compressedSize = compressedFile.size
            const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100
            
            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              compressionRatio
            })
          },
          mimeType,
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Compress a thumbnail image (aggressive compression)
 */
export async function compressThumbnail(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.75,
    mimeType: 'image/jpeg'
  })
}

/**
 * Compress a cover image (balanced quality)
 */
export async function compressCoverImage(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.85,
    mimeType: 'image/jpeg'
  })
}

/**
 * Check if file needs compression
 */
export function shouldCompressImage(file: File): boolean {
  const compressibleTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
  
  // Compress if file is over 500KB and is a compressible type
  return file.size > 500 * 1024 && compressibleTypes.includes(file.type)
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Calculate compression savings
 */
export function calculateSavings(originalSize: number, compressedSize: number) {
  const saved = originalSize - compressedSize
  const percentage = (saved / originalSize) * 100
  
  return {
    saved,
    savedFormatted: formatFileSize(saved),
    percentage: percentage.toFixed(1)
  }
}

