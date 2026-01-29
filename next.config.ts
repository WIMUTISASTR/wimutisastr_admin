import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  /* config options here */
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Avoid unsafe-* in production.
              isDevelopment
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              // Allow http: in development, only https: in production
              isDevelopment ? "img-src 'self' data: http: https: blob:" : "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // Include wss for Supabase realtime if enabled.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com",
              // Allow http: in development for media as well
              isDevelopment ? "media-src 'self' http: https: blob:" : "media-src 'self' https: blob:",
              "frame-ancestors 'self'",
            ].join('; ')
          }
        ].concat(
          isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []
        ),
      },
    ]
  },

  // Compress responses
  compress: true,

  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
