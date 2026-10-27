import type { NextConfig } from 'next'

/**
 * Security headers. The app has no accounts and stores no personal data, but
 * it renders third-party URLs and embeds map tiles, so the policy is written
 * to contain those rather than left to defaults.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Nothing here needs a camera, a microphone or a location.
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next's hydration bootstrap is inline. A nonce-based policy is the
      // stricter option and the right follow-up if this goes beyond a demo.
      "script-src 'self' 'unsafe-inline'",
      // Tailwind and Leaflet both inject style attributes.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // OpenStreetMap raster tiles and Unsplash imagery.
      "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://images.unsplash.com",
      // Only the sources the research layer actually calls.
      "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://overpass-api.de https://date.nager.at https://api.tavily.com https://api.openai.com https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // There is a stray lockfile in the home directory above this project, which
  // Next otherwise infers as the workspace root and traces files from.
  outputFileTracingRoot: import.meta.dirname,
  // better-sqlite3 is a native module and must not be bundled; the storage
  // layer falls back to the in-memory driver on serverless hosts anyway.
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
