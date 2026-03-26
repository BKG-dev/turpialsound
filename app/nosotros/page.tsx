import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildPersonSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Nosotros — Equipo y trayectoria',
  description:
    'Conoce a Turpial Sound: Frank Lemus y Susej Vera, más de 10 años construyendo el hub premium de grabación y producción musical en Caracas.',
  path: '/nosotros',
})

export default function NosotrosPage() {
  // CLIENT_REQUIRED: bios completas verificadas antes de publicar
  const frankSchema = buildPersonSchema({
    name: 'Frank Lemus',
    jobTitle: 'Director de Turpial Sound', // CLIENT_REQUIRED: cargo oficial
    description: 'Cofundador y director técnico de Turpial Sound. Más de 30 años de experiencia en producción musical en Venezuela.', // SUGGESTED
    url: siteConfig.url,
  })
  const susejSchema = buildPersonSchema({
    name: 'Susej Vera',
    jobTitle: 'Director de Turpial Sound', // CLIENT_REQUIRED: cargo oficial
    description: 'Cofundadora de Turpial Sound. Experiencia en producción musical y gestión de estudio en Caracas.', // SUGGESTED
    url: siteConfig.url,
  })
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Nosotros', url: `${siteConfig.url}/nosotros` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(frankSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(susejSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Nosotros"
        heading="Turpial Sound desde 2015."
        subheading="Construimos el hub de referencia para ensayo, grabación y producción musical en Caracas. No desde la teoría, sino desde el trabajo real con artistas reconocidos."
      />

      <SectionShell>
        <SectionHeading eyebrow="El equipo" heading="Las personas detrás del sonido." />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {[
            {
              name: 'Frank Lemus',
              role: 'CLIENT_REQUIRED — cargo oficial',
              bio: 'CLIENT_REQUIRED — biografía oficial verificable con trayectoria, créditos y logros.',
            },
            {
              name: 'Susej Vera',
              role: 'CLIENT_REQUIRED — cargo oficial',
              bio: 'CLIENT_REQUIRED — biografía oficial verificable con trayectoria, créditos y logros.',
            },
          ].map((person) => (
            <div
              key={person.name}
              className="rounded-xl border border-brand-border bg-brand-surface p-8"
            >
              {/* CLIENT_REQUIRED: foto oficial */}
              <div className="mb-6 h-20 w-20 rounded-full bg-brand-muted" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-text-primary">{person.name}</h2>
              <p className="mt-1 text-sm font-medium text-accent-gold">{person.role}</p>
              <p className="mt-4 text-sm text-text-secondary">{person.bio}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell background="surface" size="sm">
        <div className="max-w-prose">
          <span className="accent-line" aria-hidden="true" />
          <blockquote className="mt-6 text-display-md font-display font-bold text-text-primary">
            {/* CLIENT_REQUIRED: quote real del equipo o declaración de marca */}
            &ldquo;PLACEHOLDER — declaración de marca pendiente de aprobación del cliente.&rdquo;
          </blockquote>
        </div>
      </SectionShell>

      <CTASection
        heading="¿Quieres trabajar con nosotros?"
        subheading="Cuéntanos tu proyecto."
      />
    </>
  )
}
