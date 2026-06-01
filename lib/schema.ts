import { siteConfig } from '@/content/site'
import type { Service } from '@/types'

type ServiceOfferInput = {
  price: number
  priceCurrency?: string
  availability?: string
  description?: string
}

type ServiceSchemaOptions = {
  path?: string
  offer?: ServiceOfferInput
}

type LocalServiceOfferSchemaInput = {
  name: string
  description: string
  path: string
  offer: {
    price: number
    priceCurrency?: string
    availability?: string
    unitText?: string
    description?: string
  }
}

type ReservableProductOfferSchemaInput = {
  name: string
  description: string
  path: string
  imagePath: string
  offer: {
    price: number
    priceCurrency?: string
    availability?: string
  }
}

// JSON-LD schema generators — outputs are injected in Server Components via <script>

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/android-chrome-512x512.png`,
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
    image: `${siteConfig.url}/images/og/default.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      addressCountry: siteConfig.address.countryCode,
    },
    areaServed: {
      '@type': 'City',
      name: siteConfig.address.city,
    },
    sameAs: Object.values(siteConfig.socialLinks).filter(Boolean),
  }
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: 'es-VE',
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  }
}

export function buildServiceSchema(service: Service, options: ServiceSchemaOptions = {}) {
  const path = options.path ?? `/${service.slug}`
  const serviceUrl = `${siteConfig.url}${path}`
  const serviceId = `${serviceUrl}#service`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': serviceId,
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
    url: serviceUrl,
  }

  if (options.offer) {
    schema.offers = {
      '@type': 'Offer',
      price: String(options.offer.price),
      priceCurrency: options.offer.priceCurrency ?? 'USD',
      availability: options.offer.availability ?? 'https://schema.org/InStock',
      url: serviceUrl,
      itemOffered: {
        '@id': serviceId,
      },
      ...(options.offer.description ? { description: options.offer.description } : {}),
    }
  }

  return schema
}

export function buildLocalServiceOfferSchema(input: LocalServiceOfferSchemaInput) {
  const serviceUrl = `${siteConfig.url}${input.path}`
  const serviceId = `${serviceUrl}#service`

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': serviceId,
    name: input.name,
    description: input.description,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: {
      '@type': 'City',
      name: siteConfig.address.city,
    },
    url: serviceUrl,
    offers: {
      '@type': 'Offer',
      price: String(input.offer.price),
      priceCurrency: input.offer.priceCurrency ?? 'USD',
      availability: input.offer.availability ?? 'https://schema.org/InStock',
      url: serviceUrl,
      itemOffered: {
        '@id': serviceId,
      },
      ...(input.offer.unitText
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: String(input.offer.price),
              priceCurrency: input.offer.priceCurrency ?? 'USD',
              unitText: input.offer.unitText,
            },
          }
        : {}),
      ...(input.offer.description ? { description: input.offer.description } : {}),
    },
  }
}

export function buildReservableProductOfferSchema(input: ReservableProductOfferSchemaInput) {
  const productUrl = `${siteConfig.url}${input.path}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: input.name,
    description: input.description,
    image: `${siteConfig.url}${input.imagePath}`,
    brand: {
      '@type': 'Brand',
      name: siteConfig.name,
    },
    offers: {
      '@type': 'Offer',
      price: String(input.offer.price),
      priceCurrency: input.offer.priceCurrency ?? 'USD',
      availability: input.offer.availability ?? 'https://schema.org/InStock',
      url: productUrl,
    },
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
