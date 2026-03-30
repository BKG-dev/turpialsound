import type { Metadata } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { coreServices, expandedServices } from '@/content/services'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { AnimatedHeading } from '@/components/ui/AnimatedHeading'
import { NuminousServiceCard } from '@/components/ui/NuminousServiceCard'
import { StackingSection } from '@/components/home/StackingSection'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getImageArray, IMAGE_PREFIXES } from '@/lib/imageArrays'

const instalacionesImages = getImageArray(IMAGE_PREFIXES.instalaciones, 3)

export const metadata: Metadata = generatePageMetadata({
  title: 'Servicios de grabación y producción musical',
  description:
    'Todos los servicios de Turpial Sound: ensayo, grabación, producción, mezcla, masterización, podcast, video sessions y arreglos musicales. Caracas.',
  path: '/servicios',
})

/** Map expanded service slugs to icon names (strings safe to pass to Client Components) */
const expandedIcons: Record<string, { iconName: string; glow: 'cyan' | 'gold' }> = {
  'podcast-locucion':     { iconName: 'Mic',     glow: 'cyan' },
  'video-session':        { iconName: 'Video',   glow: 'gold' },
  'mezcla-masterizacion': { iconName: 'Sliders', glow: 'cyan' },
  'arreglos-musicales':   { iconName: 'Music',   glow: 'gold' },
}

export default function ServiciosPage() {
  return (
    <>
      <PageHero
        eyebrow="Servicios"
        heading="Todo lo que necesitas para tu música."
        subheading="Ensayo, grabación, producción completa y servicios especializados. Un solo lugar, un solo estándar."
      />

      {/* ── Core services ─────────────────────────────────────────────── */}
      <StackingSection index={0}>
        <SectionShell>
          <SectionHeading eyebrow="Servicios principales" heading="Las tres puertas de entrada." />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {coreServices.map((service) => (
              <Link
                key={service.id}
                href={service.ctaHref}
                className="btn-gradient-border group rounded-xl border border-transparent bg-brand-surface p-6 transition-all duration-300 hover:bg-brand-surface/80"
              >
                <span className="accent-line-animated" aria-hidden="true" />
                <h2 className="mt-4 font-display text-xl text-text-primary transition-colors group-hover:text-gradient-animated">
                  {service.name}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">{service.description}</p>
                <p className="mt-4 text-xs text-text-muted">{service.priceNote}</p>
              </Link>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── Expanded services ──────────────────────────────────────────── */}
      <StackingSection index={1} background="surface">
        <SectionShell background="surface">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-4">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              Servicios adicionales
            </span>
          </div>

          {/* Letter-by-letter animated heading */}
          <AnimatedHeading
            text="Servicios especializados."
            as="h2"
            className="font-display text-display-md text-text-primary"
          />
          <p className="mt-4 max-w-prose text-body-base text-text-secondary">
            Complementa tu proyecto con servicios que se adaptan a lo que necesitas.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {expandedServices.map((service) => {
              const meta = expandedIcons[service.slug] ?? { iconName: 'Mic', glow: 'cyan' as const }
              return (
                <NuminousServiceCard
                  key={service.id}
                  name={service.name}
                  tagline={service.tagline}
                  href={service.ctaHref}
                  iconName={meta.iconName}
                  glowColor={meta.glow}
                />
              )
            })}
          </div>
        </SectionShell>
      </StackingSection>

      {/* Instalaciones — 3D gallery */}
      <StackingSection index={2}>
        <SectionShell>
          <div className="mb-4 flex items-center gap-4">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              Instalaciones
            </span>
          </div>
          <Mac3DGallery
            images={instalacionesImages}
            title="Instalaciones · Turpial Sound"
          />
        </SectionShell>
      </StackingSection>

      <StackingSection index={3}>
        <CTASection />
      </StackingSection>
    </>
  )
}
