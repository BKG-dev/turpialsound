import type { Metadata } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { buildLocalBusinessSchema } from '@/lib/schema'
import { coreServices } from '@/content/services'
import { Button } from '@/components/ui/Button'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'

export const metadata: Metadata = generatePageMetadata({
  title: 'Estudio de grabación y producción musical en Caracas',
  description:
    'Turpial Sound — Hub premium de ensayo, grabación y producción musical en Caracas. Más de 10 años trabajando con artistas reconocidos de Venezuela.',
  path: '/',
})

export default function HomePage() {
  const localBusinessSchema = buildLocalBusinessSchema()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <section className="relative flex min-h-[85vh] items-center border-b border-brand-border bg-brand-surface">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,151,58,0.1) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="container-base relative py-24">
          <div className="max-w-[700px]">
            <div className="mb-6 flex items-center gap-3">
              <span className="accent-line" aria-hidden="true" />
              <span className="text-sm font-medium uppercase tracking-widest text-accent-gold">
                Caracas, Venezuela · Desde 2015
              </span>
            </div>

            <h1 className="text-display-xl font-display font-bold text-text-primary">
              Donde el criterio técnico y la trayectoria real hacen la diferencia.
            </h1>

            <p className="mt-6 max-w-prose text-body-lg text-text-secondary">
              Hub premium de ensayo, grabación y producción musical. El mismo espacio donde
              grabaron Oscar D&apos;León, Domingo Quiñones y Dimensión Latina.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button as="link" href="/contacto" variant="primary" size="lg">
                Reservar por WhatsApp
              </Button>

              <Button as="link" href="/salas-de-ensayo" variant="secondary" size="lg">
                Ver servicios
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SectionShell>
        <SectionHeading
          eyebrow="Servicios principales"
          heading="Tres entradas. Un solo estándar."
          subheading="Ensayo, grabación o producción completa. Cada servicio está diseñado para que tu música llegue más lejos."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
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

              <p className="mt-2 text-sm text-text-secondary">{service.tagline}</p>

              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent-gold">
                Ver más
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8h10m-4-4 4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </SectionShell>

      <SectionShell background="surface" size="sm">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
            Artistas que han grabado aquí
          </p>

          <p className="text-body-lg font-display font-semibold text-text-secondary">
            Oscar D&apos;León · Domingo Quiñones · Dimensión Latina
          </p>

          <Link
            href="/artistas"
            className="text-sm text-accent-gold transition-opacity hover:opacity-70"
          >
            Ver trayectoria completa →
          </Link>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Por qué Turpial Sound"
          heading="Infraestructura real. Criterio técnico. Trayectoria verificable."
          align="center"
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Espacio profesional',
              body: 'Salas tratadas acústicamente y estudio con equipamiento de referencia.',
            },
            {
              title: 'Criterio técnico',
              body: '30 años de experiencia acumulada. No solo un espacio — un equipo que sabe escuchar.',
            },
            {
              title: 'Hub completo',
              body: 'De ensayo a masterización en un solo lugar. Sin saltar de proveedor.',
            },
            {
              title: 'Referente en Caracas',
              body: 'El estudio donde trabajan artistas reconocidos de Venezuela y la región.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-brand-border bg-brand-surface p-6"
            >
              <h3 className="font-display text-base font-semibold text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <CTASection
        heading="¿Tienes un proyecto en mente?"
        subheading="Cuéntanos qué necesitas. Revisamos disponibilidad y armamos una propuesta."
        secondaryCTA={{ label: 'Ver todos los servicios', href: '/servicios' }}
      />
    </>
  )
}