import type { Metadata } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { coreServices, expandedServices } from '@/content/services'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { AnimatedHeading } from '@/components/ui/AnimatedHeading'
import { NuminousServiceCard } from '@/components/ui/NuminousServiceCard'
import { StackingSection } from '@/components/home/StackingSection'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const instalacionesImages = getPublicImages('instalaciones')

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
      {/* ── HERO NUMINOSO ─────────────────────────────────────────────── */}
      <NuminousHero
        imageSrc="/images/instalaciones.jpg"
        eyebrow="Servicios"
        heading="Excelencia Técnica en Cada Etapa."
        subheading="Grabación, mezcla, masterización, producción integral y servicios especializados. Todo bajo un mismo techo y un solo estándar de industria. Porque tu música merece el mejor camino posible."
        ctaLabel="Reservar ahora"
        ctaHref="/reservas"
      />

      {/* ── SECCIÓN UNIFICADA: Servicios principales + Galería 3D ──────── */}
      <StackingSection index={0} waves>
        <SectionShell background="none" size="sm">
          {/* Encabezado — título actualizado */}
          <SectionHeading eyebrow="Servicios principales" heading="Del ensayo al máster." />

          {/* 3 tarjetas de servicios core */}
          <div className="mt-10 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
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

          {/* Galería 3D de instalaciones — separada con espacio generoso */}
          <div className="mt-8 w-full max-w-5xl mx-auto">
            <div className="mb-4 flex items-center gap-4">
              <span className="accent-line-animated" aria-hidden="true" />
              <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                Instalaciones
              </span>
            </div>
            <Mac3DGallery
              images={instalacionesImages}
              title="Instalaciones · Turpial Sound"
              compact
            />
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── Expanded services ──────────────────────────────────────────── */}
      <StackingSection index={1} background="surface" waves>
        <SectionShell background="none">
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

      {/* CTA — panoramic strip with instalaciones3.jpg */}
      <StackingSection index={2}>
        <CTASection
          heading="¿Por dónde empezamos?"
          subheading="Ya sea que necesites grabar, producir o ensayar, tenemos el espacio y el equipo para llevarte al siguiente nivel."
          ctaLabel="Consultar disponibilidad"
          ctaHref="/reservas"
          imageSrc="/images/instalaciones3.jpg"
        />
      </StackingSection>
    </>
  )
}
