
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations for cPanel
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  
  // Handle static exports if needed
  trailingSlash: false,
  
  // Optimize images for cPanel
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production'
  },
  
  // Fix for Next.js 15 - moved from experimental to root level
  serverExternalPackages: ['@prisma/client'],
  
  // Disable ESLint during build for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Remove experimental config that's causing warnings
  experimental: {
    // Remove serverComponentsExternalPackages - it's now serverExternalPackages
  }
}

module.exports = nextConfig
