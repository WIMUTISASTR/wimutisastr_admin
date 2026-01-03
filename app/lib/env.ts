/**
 * Environment variable validation
 * This file validates that all required environment variables are present
 * Run this on application startup to fail fast if configuration is missing
 */

interface EnvVar {
  key: string
  required: boolean
  description: string
  clientSide?: boolean
}

const ENV_VARS: EnvVar[] = [
  // Authentication
  {
    key: 'ADMIN_PIN',
    required: true,
    description: '6-digit PIN for admin access',
  },
  {
    key: 'NEXT_PUBLIC_ADMIN_EMAIL',
    required: true,
    description: 'Admin email address',
    clientSide: true,
  },

  // Supabase
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    clientSide: true,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    required: true,
    description: 'Supabase anon/public key',
    clientSide: true,
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side only)',
  },

  // Cloudflare R2
  {
    key: 'R2_ACCOUNT_ID',
    required: true,
    description: 'Cloudflare R2 account ID',
  },
  {
    key: 'R2_ACCESS_KEY_ID',
    required: true,
    description: 'R2 access key ID',
  },
  {
    key: 'R2_SECRET_ACCESS_KEY',
    required: true,
    description: 'R2 secret access key',
  },
  {
    key: 'R2_BUCKET_NAME',
    required: false,
    description: 'R2 bucket name for books (defaults to "books")',
  },
  {
    key: 'R2_VIDEO_BUCKET_NAME',
    required: false,
    description: 'R2 bucket name for videos (defaults to "videos")',
  },

  // Optional
  {
    key: 'R2_PUBLIC_URL',
    required: false,
    description: 'Public URL for R2 book bucket (if using custom domain)',
  },
  {
    key: 'R2_VIDEO_PUBLIC_URL',
    required: false,
    description: 'Public URL for R2 video bucket (if using custom domain)',
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Application URL (defaults to current origin)',
    clientSide: true,
  },
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate environment variables
 * @param throwOnError - Whether to throw an error if validation fails
 * @returns ValidationResult
 */
export function validateEnv(throwOnError: boolean = true): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check Node environment
  const nodeEnv = process.env.NODE_ENV
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set, defaulting to "development"')
  }

  // Validate each environment variable
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key]

    if (!value && envVar.required) {
      errors.push(`Missing required environment variable: ${envVar.key}`)
      errors.push(`  Description: ${envVar.description}`)
    }

    // Check for placeholder values
    if (value && (
      value === 'your_service_role_key_here' ||
      value === 'your_anon_key_here' ||
      value === 'your_account_id_here' ||
      value === 'your_access_key_id_here' ||
      value === 'your_secret_access_key_here'
    )) {
      errors.push(`Environment variable ${envVar.key} contains a placeholder value`)
      errors.push(`  Please update it with your actual value`)
    }

    // Validate specific formats
    if (value) {
      switch (envVar.key) {
        case 'ADMIN_PIN':
          if (!/^\d{6}$/.test(value)) {
            errors.push(`ADMIN_PIN must be exactly 6 digits, got: ${value.length} characters`)
          }
          break

        case 'NEXT_PUBLIC_ADMIN_EMAIL':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`NEXT_PUBLIC_ADMIN_EMAIL must be a valid email address`)
          }
          break

        case 'NEXT_PUBLIC_SUPABASE_URL':
        case 'R2_PUBLIC_URL':
        case 'R2_VIDEO_PUBLIC_URL':
        case 'NEXT_PUBLIC_APP_URL':
          if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
            warnings.push(`${envVar.key} should start with http:// or https://`)
          }
          break
      }
    }
  }

  // Production-specific checks
  if (nodeEnv === 'production') {
    // Ensure secure URLs in production
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL
    if (publicUrl && publicUrl.startsWith('http://')) {
      warnings.push('NEXT_PUBLIC_APP_URL should use HTTPS in production')
    }

    // Warn about short PINs in production (though 6 digits is standard)
    const pin = process.env.ADMIN_PIN
    if (pin && pin === '123456') {
      errors.push('ADMIN_PIN appears to be a default/test value - change it for production!')
    }
  }

  const result: ValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
  }

  // Log results
  if (errors.length > 0) {
    console.error('❌ Environment variable validation failed:')
    errors.forEach(error => console.error(`  ${error}`))
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:')
    warnings.forEach(warning => console.warn(`  ${warning}`))
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment variables validated successfully')
  }

  // Throw error if requested and validation failed
  if (throwOnError && !result.valid) {
    throw new Error(
      `Environment variable validation failed. Please check your .env.local file.\n` +
      `See .env.example for required variables.`
    )
  }

  return result
}

// Auto-validate on import (only in Node.js environment)
if (typeof window === 'undefined') {
  // Only validate in development to avoid breaking builds
  // In production, let individual components handle missing vars gracefully
  if (process.env.NODE_ENV === 'development') {
    validateEnv(true)
  }
}

