/**
 * File validation utilities using magic bytes (file signatures)
 * This provides more secure validation than relying on file extensions alone.
 */

// Magic byte signatures for common file types
const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  // Documents
  pdf: [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  doc: [{ bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }], // MS Compound Document
  docx: [{ bytes: [0x50, 0x4B, 0x03, 0x04] }], // ZIP (Office Open XML)
  xlsx: [{ bytes: [0x50, 0x4B, 0x03, 0x04] }], // ZIP (Office Open XML)
  xls: [{ bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }], // MS Compound Document
  epub: [{ bytes: [0x50, 0x4B, 0x03, 0x04] }], // ZIP (EPUB is ZIP-based)
  
  // Images
  jpg: [{ bytes: [0xFF, 0xD8, 0xFF] }],
  jpeg: [{ bytes: [0xFF, 0xD8, 0xFF] }],
  png: [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  gif: [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  webp: [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF at start
    // Also check for WEBP at offset 8, but simplified here
  ],
  
  // Videos
  mp4: [
    { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] }, // ftyp at offset 4
    { bytes: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70] },
    { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] },
  ],
  webm: [{ bytes: [0x1A, 0x45, 0xDF, 0xA3] }], // EBML header (also used by MKV)
  mov: [
    { bytes: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74] }, // ftyp qt
  ],
  avi: [{ bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF (also need AVI check)
}

// Categories for validation
const FILE_CATEGORIES = {
  document: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'epub', 'mobi'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  video: ['mp4', 'webm', 'mov', 'avi', 'flv', 'wmv'],
} as const

type FileCategory = keyof typeof FILE_CATEGORIES

/**
 * Validate file content by checking magic bytes
 * @param file - File or ArrayBuffer to validate
 * @param expectedType - Expected file extension (without dot)
 * @returns Promise<boolean> - True if valid
 */
export async function validateFileMagicBytes(
  file: File | ArrayBuffer,
  expectedType: string
): Promise<boolean> {
  const type = expectedType.toLowerCase().replace(/^\./, '')
  const signatures = FILE_SIGNATURES[type]
  
  // If no signature defined, fall back to extension check only
  // (e.g., txt, mobi don't have reliable magic bytes)
  if (!signatures) {
    return true
  }
  
  // Read first 16 bytes for signature checking
  let buffer: ArrayBuffer
  if (file instanceof File) {
    buffer = await file.slice(0, 16).arrayBuffer()
  } else {
    buffer = file.slice(0, 16)
  }
  
  const bytes = new Uint8Array(buffer)
  
  // Check against all valid signatures for this type
  return signatures.some(sig => {
    const offset = sig.offset ?? 0
    return sig.bytes.every((byte, index) => bytes[offset + index] === byte)
  })
}

/**
 * Validate file by category (document, image, video)
 * @param file - File to validate
 * @param category - Category to validate against
 * @returns Promise<{ valid: boolean; detectedType?: string }>
 */
export async function validateFileCategory(
  file: File,
  category: FileCategory
): Promise<{ valid: boolean; detectedType?: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const allowedTypes = FILE_CATEGORIES[category] as readonly string[]
  
  // First check extension
  if (!allowedTypes.includes(extension)) {
    return { valid: false }
  }
  
  // Then validate magic bytes
  const isValid = await validateFileMagicBytes(file, extension)
  
  return {
    valid: isValid,
    detectedType: isValid ? extension : undefined,
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, '')
  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    epub: 'application/epub+zip',
    mobi: 'application/x-mobipocket-ebook',
    
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

export function validateMimeType(file: File, expectedExtension: string): boolean {
  const ext = expectedExtension.toLowerCase().replace(/^\./, '')
  const expectedMime = getMimeType(ext)

  if (file.type === expectedMime) return true

  if (ext === 'jpg' || ext === 'jpeg') {
    return file.type === 'image/jpeg' || file.type === 'image/jpg'
  }

  if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
    return file.type.includes('document') || 
           file.type.includes('spreadsheet') || 
           file.type.includes('msword') ||
           file.type === 'application/octet-stream'
  }
  
  return false
}
