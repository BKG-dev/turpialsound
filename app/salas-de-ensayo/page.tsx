import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { Check } from 'lucide-react'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Salas de ensayo en Caracas',
  description:
    'Salas de ensayo profesionales en Caracas. Tratamiento acústico, equipamiento incluido y disponibilidad flexible. Turpial Sound.',
  path: '/salas-de-ensayo',
})

const features = [
  'Tratamiento acústico profesional',
  'Amplificadores de referencia',
  'Batería acústica completa',
  'Sistema PA y monitoreo',
  'Disponibilidad flexible',
  'Ingreso con instrumento propio',
]

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
        accentColor="gold"
      >
        <Button as="link" href="/contacto" variant="primary" size="lg">
          Consultar disponibilidad
        </Button>
      </PageHero>

      {/* Features */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Lo que incluye"
            heading="Equipamiento y espacio diseñados para rendir."
            accentColor="gold"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-4 rounded-xl border border-brand-border bg-brand-surface p-5 transition-all duration-250 hover:border-accent-gold/30"
              >
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-accent-gold"
                  aria-hidden="true"
                />
                <span className="text-sm text-text-secondary">{feature}</span>
              </div>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* Related services */}
      <StackingSection index={1} background="surface" waves>
        <SectionShell background="none" size="sm">
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
            <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
              Producción musical
            </Button>
          </div>
        </SectionShell>
      </StackingSection>

      <StackingSection index={2}>
        <CTASection
          heading="¿Cuándo quieres ensayar?"
          subheading="Revisa disponibilidad y reserva tu sala."
        />
      </StackingSection>
    </>
  )
}
