import type { Metadata } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { coreServices, expandedServices } from '@/content/services'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'

export const metadata: Metadata = generatePageMetadata({
  title: 'Servicios de grabación y producción musical',
  description:
    'Todos los servicios de Turpial Sound: ensayo, grabación, producción, mezcla, masterización, podcast, video sessions y arreglos musicales. Caracas.',
  path: '/servicios',
})

export default function ServiciosPage() {
  return (
    <>
      <PageHero
        eyebrow="Servicios"
        heading="Todo lo que necesitas para tu música."
        subheading="Ensayo, grabación, producción completa y servicios especializados. Un solo lugar, un solo estándar."
      />

      <SectionShell>
        <SectionHeading eyebrow="Servicios principales" heading="Las tres puertas de entrada." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {coreServices.map((service) => (
            <Link
              key={service.id}
              href={service.ctaHref}
              className="group rounded-xl border border-brand-border bg-brand-surface p-6 transition-all hover:border-accent-gold/40 hover:shadow-glow-sm"
            >
              <span className="accent-line" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-bold text-text-primary transition-colors group-hover:text-accent-gold">
                {service.name}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{service.description}</p>
              <p className="mt-4 text-xs text-text-muted">{service.priceNote}</p>
            </Link>
          ))}
        </div>
      </SectionShell>

      <SectionShell background="surface">
        <SectionHeading
          eyebrow="Servicios adicionales"
          heading="Servicios especializados."
          subheading="Complementa tu proyecto con servicios que se adaptan a lo que necesitas."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {expandedServices.map((service) => (
            <Link
              key={service.id}
              href={service.ctaHref}
              className="group flex items-start justify-between rounded-lg border border-brand-border bg-brand-bg p-5 transition-all hover:border-accent-gold/40"
            >
              <div>
                <h3 className="font-display text-base font-semibold text-text-primary transition-colors group-hover:text-accent-gold">
                  {service.name}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">{service.tagline}</p>
              </div>
              <span
                className="ml-4 shrink-0 text-text-muted transition-colors group-hover:text-accent-gold"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </SectionShell>

      <CTASection />
    </>
  )
}