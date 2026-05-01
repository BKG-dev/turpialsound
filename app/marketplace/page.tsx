import type { Metadata } from 'next'
import { siteConfig } from '@/content/site'
import { generatePageMetadata } from '@/lib/metadata'
import MarketplacePageClient from './MarketplacePageClient'

const marketplaceUrl = `${siteConfig.url}/marketplace`
const marketplaceDescription =
  'Marketplace musical de Turpial Sound para comprar y vender instrumentos, equipos de audio, accesorios y servicios musicales en Venezuela con revision del equipo y operacion protegida.'

export const metadata: Metadata = generatePageMetadata({
  title: 'Marketplace musical en Venezuela',
  description: marketplaceDescription,
  path: '/marketplace',
})

const marketplaceJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${marketplaceUrl}#collection`,
      url: marketplaceUrl,
      name: 'Marketplace musical de Turpial Sound',
      description: marketplaceDescription,
      inLanguage: 'es-VE',
      isPartOf: {
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.url,
      },
      about: [
        'instrumentos musicales',
        'equipos de audio',
        'accesorios musicales',
        'servicios para musicos',
        'productores musicales',
        'estudios de grabacion',
      ],
      audience: {
        '@type': 'Audience',
        audienceType: 'Musicos, productores, estudios, vendedores y compradores de equipos musicales en Venezuela',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${marketplaceUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Inicio',
          item: siteConfig.url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Marketplace',
          item: marketplaceUrl,
        },
      ],
    },
  ],
}

export default function MarketplacePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd) }}
      />
      <MarketplacePageClient />
    </>
  )
}
