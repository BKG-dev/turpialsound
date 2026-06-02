import type { Route } from 'next'

export interface Service {
  id: string
  slug: string
  name: string
  shortName: string
  tagline: string
  description: string
  features: string[]
  priceNote: string
  ctaLabel: string
  ctaHref: Route
  category: 'core' | 'expanded'
  tier: 'money' | 'satellite'
}

export interface Artist {
  id: string
  name: string
  genre?: string
  description?: string
  verified: boolean
  imageUrl?: string
  // CLIENT_REQUIRED: full artist list with authorization for public use
}

export interface Testimonial {
  id: string
  author: string
  role?: string
  company?: string
  quote: string
  service?: string
  verified: boolean
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  relatedServiceSlug?: string
}

export interface NavItem {
  label: string
  href: Route
  children?: NavItem[]
}

export interface SiteConfig {
  name: string
  tagline: string
  description: string
  url: string
  locale: string
  ogLocale?: string
  phoneWhatsApp: string
  phoneDisplay: string
  email: string
  address: {
    street: string
    city: string
    country: string
    countryCode: string
  }
  socialLinks: {
    instagram?: string
    youtube?: string
    spotify?: string
    facebook?: string
  }
}
