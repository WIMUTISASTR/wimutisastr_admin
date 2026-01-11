import { z } from 'zod'

// Auth validations
export const pinSchema = z.object({
  pin: z.string()
    .length(6, 'PIN must be exactly 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers')
})

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
})

// Video validations
export const createVideoSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  presented_by: z.string()
    .max(100, 'Presented by must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  file_name: z.string().min(1, 'File name is required'),
  file_url: z.string().url('Invalid file URL'),
  file_size: z.number().positive('File size must be positive').optional(),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional().nullable(),
  category_id: z.string().uuid('Invalid category ID'),
})

export const updateVideoSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  presented_by: z.string()
    .max(100, 'Presented by must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  file_name: z.string().min(1).optional(),
  file_url: z.string().url().optional(),
  file_size: z.number().positive().optional(),
  thumbnail_url: z.string().url().optional().nullable(),
  category_id: z.string().uuid('Invalid category ID'),
})

// Book validations
export const createBookSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  year: z.coerce.number()
    .int('Year must be a whole number')
    .min(1000, 'Year must be a valid 4-digit year')
    .max(9999, 'Year must be a valid 4-digit year'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  author: z.string()
    .max(100, 'Author name must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  file_name: z.string().min(1, 'File name is required'),
  file_url: z.string().url('Invalid file URL'),
  file_size: z.number().positive('File size must be positive').optional(),
  cover_url: z.string().url('Invalid cover URL').optional().nullable(),
  category_id: z.string().uuid('Invalid category ID'),
})

export const updateBookSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  year: z.coerce.number()
    .int('Year must be a whole number')
    .min(1000, 'Year must be a valid 4-digit year')
    .max(9999, 'Year must be a valid 4-digit year')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
  author: z.string()
    .max(100, 'Author name must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  file_name: z.string().min(1).optional(),
  file_url: z.string().url().optional(),
  file_size: z.number().positive().optional(),
  cover_url: z.string().url().optional().nullable(),
  category_id: z.string().uuid('Invalid category ID'),
})

// Category validations
export const createCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  cover_url: z.string().url('Invalid cover URL').optional().nullable(),
  parent_id: z.string().uuid('Invalid parent category ID').optional().nullable(),
})

export const updateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  parent_id: z.string().uuid('Invalid parent category ID').optional().nullable(),
  cover_url: z.string().url('Invalid cover URL').optional().nullable(),
})

// Upload validations
export const uploadSchema = z.object({
  bucket: z.enum(['documents', 'books', 'videos', 'video-thumbnails', 'covers', 'video-category-covers']),
  path: z.string().min(1, 'Path is required'),
  category_id: z.string().uuid().optional().nullable(),
  category_name: z.string().max(100).optional().nullable(),
})

// Helper function to validate and return formatted errors
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

