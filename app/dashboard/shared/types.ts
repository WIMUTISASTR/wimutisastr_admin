// Book-related types
export interface Category {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
  subcategories?: Category[] // Optional array for hierarchical display
  parent?: { id: string; name: string } | null // Optional parent category reference
}

export interface Book {
  id: string
  title: string
  author: string
  year: number
  description: string
  file_name: string
  file_url: string
  file_size: number
  cover_url: string | null
  access_level?: 'free' | 'members'
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
  presented_by?: string | null
  description: string
  file_name: string
  file_url: string
  file_size: number
  thumbnail_url: string | null
  access_level?: 'free' | 'members'
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
  email_confirmed_at: string | null
  phone?: string | null
  user_metadata?: any
  membership_status?: 'pending' | 'approved' | 'denied'
  membership_approved_at?: string | null
  membership_denied_at?: string | null
  membership_notes?: string | null
  membership_ends_at?: string | null
}

// Payment Proof types
export interface PaymentProof {
  id: string
  user_id: string
  payment_reference: string
  plan_id: string // Legacy field - kept for backward compatibility
  subscription_plan_id: string | null // New UUID foreign key to subscription_plans
  amount: string
  proof_url: string
  file_name: string
  file_size: string
  file_type: string
  status: 'pending' | 'verified' | 'rejected'
  uploaded_at: string
  verified_at: string | null
  verified_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  membership_starts_at: string | null
  membership_ends_at: string | null
  // Joined user data (from auth.users + user_profiles)
  user?: {
    email: string
    membership_status: 'pending' | 'approved' | 'denied'
    membership_approved_at: string | null
    membership_denied_at: string | null
    registered_at: string | null
  } | null
  // Joined subscription plan data
  subscription_plan?: {
    id: string
    name: string
    price: number
    duration_days: number
    currency: string
  } | null
}
