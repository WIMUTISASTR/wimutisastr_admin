import { RateLimitError } from './errors'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}, 5 * 60 * 1000)

interface RateLimitConfig {
  interval: number // milliseconds
  maxRequests: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 10,
}

/**
 * Rate limiting middleware
 * @param identifier - Usually IP address or user ID
 * @param config - Rate limit configuration
 * @returns void or throws RateLimitError
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): void {
  const { interval, maxRequests } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()
  const key = identifier

  // Initialize or get current rate limit data
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + interval,
    }
    return
  }

  // Increment counter
  rateLimitStore[key].count++

  // Check if limit exceeded
  if (rateLimitStore[key].count > maxRequests) {
    const resetIn = Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
    throw new RateLimitError(
      `Too many requests. Please try again in ${resetIn} seconds.`
    )
  }
}

/**
 * Get client identifier from request (IP address or forwarded IP)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback to a default identifier
  return 'unknown'
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  AUTH: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  PIN_VERIFICATION: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  API_READ: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  API_WRITE: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
  UPLOAD: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
  },
} as const

