import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { siteConfig } from '@/content/site'
import { DropSocialLanding } from './DropSocialLanding'

const description =
  'DropSocial — Comparte cualquier link del Marketplace de Turpial Sound y gana el 10% de nuestra comisión. Sin tope, sin esfuerzo, sin permiso.'

export const metadata: Metadata = generatePageMetadata({
  title: 'DropSocial — Comparte. Suena. Cobra.',
  description,
  path: '/dropsocial',
})

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${siteConfig.url}/dropsocial#webpage`,
  name: 'DropSocial — Programa de afiliados Turpial Sound',
  description,
  inLanguage: 'es-VE',
  isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
  about: 'Programa de afiliados, comisiones por referido, marketplace musical',
}

export default function DropSocialPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DropSocialLanding />
    </>
  )
}
