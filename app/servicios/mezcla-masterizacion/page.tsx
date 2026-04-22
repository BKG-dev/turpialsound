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
  title: 'Mezcla y masterización en Caracas',
  description:
    'Mezcla y masterización profesional en Caracas. Para proyectos grabados en Turpial Sound o en cualquier otro estudio. Entrega para streaming y físico.',
  path: '/servicios/mezcla-masterizacion',
})

export default function MezclaMasterizacionPage() {
  const service = getServiceBySlug('mezcla-masterizacion')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Servicios', url: `${siteConfig.url}/servicios` },
    { name: 'Mezcla y masterización', url: `${siteConfig.url}/servicios/mezcla-masterizacion` },
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
        eyebrow="Mezcla y masterización"
        heading="El sonido final que tu producción merece."
        subheading="Mezcla y masterización como servicio independiente. Para material grabado aquí o en cualquier otro estudio."
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

      <CTASection heading="¿Listo para el sonido final?" />
    </>
  )
}
