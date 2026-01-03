// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  BOOK_FILE: 50 * 1024 * 1024, // 50MB
  BOOK_FILE_EDIT: 500 * 1024 * 1024, // 500MB
  COVER_IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO_FILE: 500 * 1024 * 1024, // 500MB
  THUMBNAIL_IMAGE: 5 * 1024 * 1024, // 5MB
} as const

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  BOOK_DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'],
  BOOK_DOCUMENTS_EDIT: ['.pdf', '.doc', '.docx', '.epub', '.mobi', '.txt'],
  IMAGES: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  VIDEOS: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
} as const

