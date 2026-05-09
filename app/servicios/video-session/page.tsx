import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { PageHero } from '@/components/sections/PageHero'
import { CTASection } from '@/components/sections/CTASection'
import { SectionShell } from '@/components/sections/SectionShell'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Video sessions en estudio — Caracas',
  description:
    'Captura tu sesión de grabación en video. Producción audiovisual en el estudio de Turpial Sound, Caracas.',
  path: '/servicios/video-session',
})

export default function VideoSessionPage() {
  const service = getServiceBySlug('video-session')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Servicios', url: `${siteConfig.url}/servicios` },
    { name: 'Video sessions', url: `${siteConfig.url}/servicios/video-session` },
  ])

  return (
    <>
      {serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Video sessions"
        heading="Tu música, capturada en el entorno donde nació."
        subheading="Producción audiovisual dentro del estudio. Contenido auténtico para artistas que quieren mostrar su proceso."
      >
        <Button as="link" href="/reservas" variant="primary" size="lg">
          Cotizar video session
        </Button>
      </PageHero>

      <SectionShell size="sm">
        <div className="flex items-center gap-4">
          <span className="accent-line-animated" aria-hidden="true" />
          <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
            También puede interesarte
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
            Estudio de grabación
          </Button>
          <Button as="link" href="/servicios/podcast-locucion" variant="secondary" size="sm">
            Podcast y locución
          </Button>
        </div>
      </SectionShell>

      <CTASection heading="¿Quieres capturar tu próxima sesión?" />
    </>
  )
}
