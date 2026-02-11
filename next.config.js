/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // SEO Optimization
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'x-robots-tag',
            value: 'all'
          },
          {
            key: 'x-dns-prefetch-control',
            value: 'on'
          }
        ]
      }
    ]
  },
  
  // Image optimization for SEO
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'risingnetwork.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'risingnetwork.in',
        pathname: '/**',
      }
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  poweredByHeader: false,
}

module.exports = nextConfig
