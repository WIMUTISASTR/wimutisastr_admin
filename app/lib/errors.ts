import { NextResponse } from 'next/server'

// Custom error types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

// Error response handler
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  }

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { message?: string; code?: string; details?: string }
    
    // Don't expose internal database details in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'An error occurred while processing your request',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      {
        error: supabaseError.message || 'Database error',
        code: supabaseError.code || 'DATABASE_ERROR',
      },
      { status: 500 }
    )
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Internal server error'
  
  // Don't expose internal error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : message

  return NextResponse.json(
    {
      error: errorMessage,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

// Success response helper
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

