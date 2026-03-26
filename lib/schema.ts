import { siteConfig } from '@/content/site'
import type { Service } from '@/types'

// JSON-LD schema generators — outputs are injected in Server Components via <script>

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/images/logo.png`, // CLIENT_REQUIRED: logo file
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.phoneWhatsApp,
      contactType: 'customer service',
      availableLanguage: ['Spanish'],
    },
    sameAs: Object.values(siteConfig.socialLinks).filter(Boolean),
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.address.city,
      addressCountry: siteConfig.address.countryCode,
    },
  }
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phoneWhatsApp,
    email: siteConfig.email,
    priceRange: '$$', // SUGGESTED
    currenciesAccepted: 'USD',
    openingHours: 'Mo-Su 08:00-22:00', // CLIENT_REQUIRED: horarios reales
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      addressCountry: siteConfig.address.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      // CLIENT_REQUIRED: coordenadas reales
    },
    sameAs: Object.values(siteConfig.socialLinks).filter(Boolean),
  }
}

export function buildServiceSchema(service: Service) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: {
      '@type': 'City',
      name: siteConfig.address.city,
    },
    url: `${siteConfig.url}/${service.slug}`,
  }
}

export function buildFAQSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildPersonSchema(person: {
  name: string
  jobTitle: string
  description: string
  url?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.jobTitle,
    description: person.description,
    worksFor: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
    url: person.url ?? siteConfig.url,
  }
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
