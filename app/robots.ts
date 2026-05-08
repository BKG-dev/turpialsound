import type { MetadataRoute } from 'next'
import { siteConfig } from '@/content/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/ops',
        '/api',
        '/payment-proofs',
        '/marketplace/admin',
        '/marketplace/dashboard',
        '/_next/',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
