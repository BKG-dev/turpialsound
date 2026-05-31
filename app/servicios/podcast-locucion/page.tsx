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
  title: 'Grabación de podcast y locución en Caracas',
  description:
    'Cabina profesional para podcast y locución en Caracas. Sonido limpio, post-producción y entrega lista para distribución. Turpial Sound.',
  path: '/servicios/podcast-locucion',
})

export default function PodcastLocucionPage() {
  const service = getServiceBySlug('podcast-locucion')
  const serviceSchema = service ? buildServiceSchema(service, { path: '/servicios/podcast-locucion' }) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Servicios', url: `${siteConfig.url}/servicios` },
    { name: 'Podcast y locución', url: `${siteConfig.url}/servicios/podcast-locucion` },
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
        eyebrow="Podcast y locución"
        heading="Sonido limpio para contenido que se escucha profesional."
        subheading="Cabina tratada, operación técnica y entrega lista para Spotify, YouTube o cualquier plataforma."
      >
        <Button as="link" href="/reservas" variant="primary" size="lg">
          Cotizar sesión
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
          <Button as="link" href="/servicios/video-session" variant="secondary" size="sm">
            Video sessions
          </Button>
        </div>
      </SectionShell>

      <CTASection heading="¿Cuándo grabamos tu podcast?" />
    </>
  )
}
