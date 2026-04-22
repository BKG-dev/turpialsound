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
  title: 'Arreglos musicales en Caracas',
  description:
    'Arreglos musicales profesionales en Caracas. Orquestación, arreglos para banda y producción electrónica. Turpial Sound.',
  path: '/servicios/arreglos-musicales',
})

export default function ArreglosMusicalesPage() {
  const service = getServiceBySlug('arreglos-musicales')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Servicios', url: `${siteConfig.url}/servicios` },
    { name: 'Arreglos musicales', url: `${siteConfig.url}/servicios/arreglos-musicales` },
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
        eyebrow="Arreglos musicales"
        heading="Estructura y criterio para tu música."
        subheading="Arreglos completos o parciales para proyectos que necesitan dirección musical profesional."
      >
        <Button as="link" href="/reservas" variant="primary" size="lg">
          Reserva ahora
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
          <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
            Producción musical
          </Button>
          <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
            Estudio de grabación
          </Button>
        </div>
      </SectionShell>

      <CTASection heading="¿Tu proyecto necesita arreglos?" />
    </>
  )
}
