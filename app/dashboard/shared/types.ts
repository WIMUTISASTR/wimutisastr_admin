// Book-related types
export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  title: string
  author: string
  year: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  cover_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

// Video-related types
export interface VideoCategory {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  title: string
  description: string
  file_name: string
  file_url: string
  file_size: number
  thumbnail_url: string | null
  uploaded_at: string
  category_id?: string | null
  category?: { id: string; name: string } | null
}

// User-related types
export interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

