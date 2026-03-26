import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Salas de ensayo en Caracas',
  description:
    'Salas de ensayo profesionales en Caracas. Tratamiento acústico, equipamiento incluido y disponibilidad flexible. Turpial Sound.',
  path: '/salas-de-ensayo',
})

export default function SalasDeEnsayoPage() {
  const service = getServiceBySlug('salas-de-ensayo')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Salas de ensayo', url: `${siteConfig.url}/salas-de-ensayo` },
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
        eyebrow="Salas de ensayo"
        heading="El espacio para preparar tu sonido."
        subheading="Salas tratadas acústicamente con equipamiento real. Para bandas y proyectos que necesitan trabajar en serio."
      >
        <Button as="link" href="/contacto" variant="primary" size="lg">
          Consultar disponibilidad
        </Button>
      </PageHero>

      {/* Features — CLIENT_REQUIRED: especificaciones reales */}
      <SectionShell>
        <SectionHeading
          eyebrow="Lo que incluye"
          heading="Equipamiento y espacio diseñados para rendir."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Tratamiento acústico profesional',
            'Amplificadores de referencia', // CLIENT_REQUIRED
            'Batería acústica completa', // CLIENT_REQUIRED
            'Sistema PA y monitoreo',     // CLIENT_REQUIRED
            'Disponibilidad flexible',
            'Ingreso con instrumento propio',
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-surface p-4"
            >
              <span className="mt-0.5 text-accent-gold" aria-hidden="true">✓</span>
              <span className="text-sm text-text-secondary">{feature}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Internal links to related services */}
      <SectionShell background="surface" size="sm">
        <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
          También puede interesarte
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
            Estudio de grabación
          </Button>
          <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
            Producción musical
          </Button>
        </div>
      </SectionShell>

      <CTASection
        heading="¿Cuándo quieres ensayar?"
        subheading="Revisa disponibilidad y reserva tu sala."
      />
    </>
  )
}
