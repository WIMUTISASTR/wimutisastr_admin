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
              // Avoid unsafe-* in production. blob: + wasm-unsafe-eval are required for
              // client-side media compression (ffmpeg.wasm / ghostscript.wasm).
              isDevelopment
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live"
                : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://vercel.live",
              // Web Workers (ffmpeg.wasm internal worker + PDF compression worker).
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              // Allow http: in development, only https: in production
              isDevelopment ? "img-src 'self' data: http: https: blob:" : "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // Include wss for Supabase realtime if enabled. blob: is required by
              // ffmpeg.wasm, which fetches its core/wasm through blob: URLs.
              "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com https://vercel.live wss://vercel.live",
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
