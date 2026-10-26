import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module. Keep it external so Next does not try to
  // bundle it; on Vercel the storage layer falls back to the in-memory driver.
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
}

export default nextConfig
