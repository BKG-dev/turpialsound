/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  async redirects() {
    return [
      {
        source: '/sala-de-ensayo-caracas',
        destination: '/salas-de-ensayo',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
