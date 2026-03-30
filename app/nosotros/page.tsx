import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildPersonSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Nosotros — Equipo y trayectoria',
  description:
    'Conoce a Turpial Sound: Frank Lemus y Susej Vera, más de 10 años construyendo el hub premium de grabación y producción musical en Caracas.',
  path: '/nosotros',
})

const team = [
  {
    name: 'Frank Lemus',
    role: '[CLIENT_REQUIRED — cargo oficial]',
    bio: '[CLIENT_REQUIRED — biografía oficial verificable con trayectoria, créditos y logros.]',
    accent: 'gold' as const,
  },
  {
    name: 'Susej Vera',
    role: '[CLIENT_REQUIRED — cargo oficial]',
    bio: '[CLIENT_REQUIRED — biografía oficial verificable con trayectoria, créditos y logros.]',
    accent: 'cyan' as const,
  },
]

export default function NosotrosPage() {
  const frankSchema = buildPersonSchema({
    name: 'Frank Lemus',
    jobTitle: 'Director de Turpial Sound',
    description:
      'Cofundador y director técnico de Turpial Sound. Más de 30 años de experiencia en producción musical en Venezuela.',
    url: siteConfig.url,
  })
  const susejSchema = buildPersonSchema({
    name: 'Susej Vera',
    jobTitle: 'Cofundadora de Turpial Sound',
    description: 'Cofundadora de Turpial Sound. Experiencia en producción musical y gestión de estudio en Caracas.',
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
        accentColor="cyan"
      />

      <StackingSection index={0}>
        <SectionShell>
          <SectionHeading eyebrow="El equipo" heading="Las personas detrás del sonido." accentColor="gold" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
          {team.map((person) => (
            <div
              key={person.name}
              className="rounded-2xl border border-brand-border bg-brand-surface p-8 transition-all duration-350 hover:border-accent-gold/30"
            >
              {/* Avatar placeholder */}
              <div
                className="mb-6 h-20 w-20 rounded-full"
                style={{
                  background:
                    person.accent === 'cyan'
                      ? 'radial-gradient(circle, rgba(0,174,239,0.2) 0%, rgba(0,174,239,0.05) 100%)'
                      : 'radial-gradient(circle, rgba(255,193,7,0.2) 0%, rgba(255,193,7,0.05) 100%)',
                  border: `1px solid ${person.accent === 'cyan' ? 'rgba(0,174,239,0.2)' : 'rgba(255,193,7,0.2)'}`,
                }}
                aria-hidden="true"
              />
              <h2 className="font-display text-lg text-text-primary">{person.name}</h2>
              <p
                className="mt-1 text-sm"
                style={{ color: person.accent === 'cyan' ? '#00AEEF' : '#FFC107' }}
              >
                {person.role}
              </p>
              <p className="mt-4 text-sm text-text-secondary">{person.bio}</p>
            </div>
          ))}
          </div>
        </SectionShell>
      </StackingSection>

      <StackingSection index={1} background="surface">
        <SectionShell background="surface" size="sm">
          <div className="max-w-prose">
            <span className="accent-line-animated" aria-hidden="true" />
            <blockquote className="mt-6 font-display text-display-md text-text-primary">
              &ldquo;[CLIENT_REQUIRED — declaración de marca pendiente de aprobación del cliente.]&rdquo;
            </blockquote>
          </div>
        </SectionShell>
      </StackingSection>

      <StackingSection index={2}>
        <CTASection
          heading="¿Quieres trabajar con nosotros?"
          subheading="Cuéntanos tu proyecto."
        />
      </StackingSection>
    </>
  )
}
