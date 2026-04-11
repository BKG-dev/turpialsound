import type { Metadata } from 'next'
import { siteConfig } from '@/content/site'

interface PageMetadataOptions {
  title: string
  description: string
  path: string
  ogImagePath?: string
  noIndex?: boolean
}

export function generatePageMetadata({
  title,
  description,
  path,
  ogImagePath,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const url = `${siteConfig.url}${path}`
  const ogImage = ogImagePath
    ? `${siteConfig.url}${ogImagePath}`
    : `${siteConfig.url}/images/og/default.jpg`

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} — ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  }
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    siteName: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
