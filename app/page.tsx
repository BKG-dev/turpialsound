import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Ear, Layers, Award } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { generatePageMetadata } from '@/lib/metadata'
import { buildLocalBusinessSchema } from '@/lib/schema'
import { coreServices } from '@/content/services'
import { Button } from '@/components/ui/Button'
import { StatsBar } from '@/components/ui/StatsBar'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { CinematicVideo } from '@/components/media/CinematicVideo'
import { SocialVideoPlayer } from '@/components/media/SocialVideoPlayer'
import { HeroSection } from '@/components/home/HeroSection'
import { StackingSection } from '@/components/home/StackingSection'
import { ServiceGallery } from '@/components/home/ServiceGallery'

export const metadata: Metadata = generatePageMetadata({
  title: 'Estudio de grabación y producción musical en Caracas',
  description:
    'Turpial Sound — Hub premium de ensayo, grabación y producción musical en Caracas. Más de 10 años trabajando con artistas reconocidos de Venezuela.',
  path: '/',
})

const whyItems: Array<{ Icon: LucideIcon; title: string; body: string; accent: 'gold' | 'cyan' }> = [
  {
    Icon: Building2,
    title: 'Espacio profesional',
    body: 'Salas tratadas acústicamente y estudio con equipamiento de referencia.',
    accent: 'gold',
  },
  {
    Icon: Ear,
    title: 'Criterio técnico',
    body: '30 años de experiencia acumulada. No solo un espacio — un equipo que sabe escuchar.',
    accent: 'cyan',
  },
  {
    Icon: Layers,
    title: 'Hub completo',
    body: 'De ensayo a masterización en un solo lugar. Sin saltar de proveedor.',
    accent: 'gold',
  },
  {
    Icon: Award,
    title: 'Referente en Caracas',
    body: 'El estudio donde trabajan artistas reconocidos de Venezuela y la región.',
    accent: 'cyan',
  },
]

export default function HomePage() {
  const localBusinessSchema = buildLocalBusinessSchema()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      {/* ── HERO — cinematic, full-screen ─────────────────────────────── */}
      <HeroSection
        videoSrc="/video/turpial-sound-studio.webm"
        audioSrc="/audio/turpial-sound-ambient.mp3"
      />

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <StatsBar />

      {/* ── SOCIAL VIDEO — RRSS vertical, stacking 0 ──────────────────── */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Text */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="accent-line-animated" aria-hidden="true" />
                <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                  En vivo y en estudio
                </span>
              </div>
              <h2 className="font-display text-display-md text-text-primary">
                El sonido que suena diferente.
              </h2>
              <p className="mt-5 text-body-base text-text-secondary">
                No solo producimos — documentamos el proceso. Cada sesión es una historia.
              </p>
            </div>
            {/* Vertical video */}
            <div className="flex justify-center lg:justify-end">
              <SocialVideoPlayer
                src="/video/videoRRSS.webm"
                fallback="/video/videoRRSS.mp4"
                label="Turpial Sound — Video RRSS"
              />
            </div>
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── SERVICES GALLERY — stacking section 1 ─────────────────────── */}
      <StackingSection index={1} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Servicios principales"
            heading="Tres entradas. Un solo estándar."
            subheading="Ensayo, grabación o producción completa. Cada servicio está diseñado para que tu música llegue más lejos."
          />
          <div className="mt-12">
            <ServiceGallery />
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {coreServices.map((service) => (
              <Button key={service.id} as="link" href={service.ctaHref} variant="secondary" size="sm">
                {service.name} →
              </Button>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── VIDEO / EL ESTUDIO — stacking section 2 ──────────────────── */}
      <StackingSection index={2} background="surface" waves>
        <SectionShell background="none">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="accent-line-animated" aria-hidden="true" />
                <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                  El estudio
                </span>
              </div>
              <h2 className="font-display text-display-md text-text-primary">
                Un espacio construido para el sonido.
              </h2>
              <p className="mt-5 text-body-base text-text-secondary">
                Tratamiento acústico profesional, consola de referencia y 30 años de criterio
                técnico. No solo un espacio — un equipo que sabe escuchar.
              </p>
              <div className="mt-8">
                <Button as="link" href="/nosotros" variant="secondary" size="md">
                  Conocer el equipo
                </Button>
              </div>
            </div>
            <CinematicVideo src="/video/turpial-sound-studio.webm" label="Turpial Sound · Caracas" />
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── AUTHORITY BAND — stacking section 3 ─────────────────────── */}
      <StackingSection index={3}>
        <div className="border-y border-brand-border bg-brand-bg py-10">
          <div className="container-base">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="font-display text-xs tracking-[0.3em] text-text-muted uppercase">
                Artistas que han grabado aquí
              </p>
              <p className="font-display text-lg text-text-secondary">
                Oscar D&apos;León · Domingo Quiñones · Dimensión Latina
              </p>
              <Link
                href="/artistas"
                className="font-display text-xs tracking-widest text-accent-cyan uppercase transition-opacity hover:opacity-70"
              >
                Ver trayectoria completa →
              </Link>
            </div>
          </div>
        </div>
      </StackingSection>

      {/* ── WHY US — stacking section 4 ──────────────────────────────── */}
      <StackingSection index={4} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Por qué Turpial Sound"
            heading="Infraestructura real. Criterio técnico. Trayectoria verificable."
            align="center"
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-brand-border bg-brand-surface p-6 transition-all duration-350 hover:border-accent-cyan/30"
              >
                <item.Icon
                  size={20}
                  className="mb-4"
                  style={{ color: item.accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                  aria-hidden="true"
                />
                <h3 className="font-display text-sm text-text-primary">{item.title}</h3>
                <p className="mt-3 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── CTA — stacking section 5 ─────────────────────────────────── */}
      <StackingSection index={5}>
        <CTASection
          heading="¿Tienes un proyecto en mente?"
          subheading="Cuéntanos qué necesitas. Revisamos disponibilidad y armamos una propuesta."
          secondaryCTA={{ label: 'Ver todos los servicios', href: '/servicios' }}
        />
      </StackingSection>
    </>
  )
}
