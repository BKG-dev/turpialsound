import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Ear, Layers, Award } from 'lucide-react'
import { PricingPreview } from '@/components/home/PricingPreview'
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
import { InstalacionesSection } from '@/components/home/InstalacionesSection'

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
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            {/* Text — left */}
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <span className="accent-line-animated" aria-hidden="true" />
                <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                  En vivo y en estudio
                </span>
              </div>
              <h2 className="font-display text-text-primary" style={{ fontSize: 'clamp(1.8rem, 3.6vw, 3.12rem)', lineHeight: 1.1, letterSpacing: '0.01em' }}>
                El Espacio Que Tu Música Merece!!!{' '}
                <span className="text-gradient-animated">El Sonido De Tus Sueños!!!</span>
              </h2>
              <p className="mt-5 text-text-secondary" style={{ fontSize: '1.2em', lineHeight: 1.6 }}>
                No solo producimos — documentamos el proceso. Cada sesión es una historia.
              </p>
            </div>
            {/* Vertical video — right, shifted left by half width, size +15% */}
            <div className="shrink-0" style={{ width: '16.1rem', transform: 'translateX(-50%)' }}>
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
            align="center"
          />
          <div className="mt-12 w-full">
            <ServiceGallery />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
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
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_2fr]">
            {/* Text — left */}
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
            {/* Video — right, immersive */}
            <div className="w-full">
              <CinematicVideo src="/video/turpial-sound-studio.webm" label="Turpial Sound · Caracas" />
            </div>
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── ARTISTAS DE ÉLITE — stacking section 3 ─────────────────────── */}
      <StackingSection index={3} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Trayectoria verificable"
            heading="Artistas de élite que hemos atendido"
            subheading="Oscar D'León · Domingo Quiñones · Dimensión Latina · Frank Quintero"
            align="center"
          />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-[1400px] mx-auto">
            {[
              { src: '/images/odl_800.jpg', name: 'Oscar D\'León' },
              { src: '/images/dq_800.jpg',  name: 'Domingo Quiñones' },
              { src: '/images/dl_800.jpg',  name: 'Dimensión Latina' },
              { src: '/images/FQ.JPG',      name: 'Frank Quintero' },
            ].map(({ src, name }) => (
              <div
                key={name}
                className="card-premium-wrapper group rounded-2xl bg-brand-surface"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl">
                  <Image
                    src={src}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 via-transparent to-transparent" />
                </div>
                <div className="px-5 py-5 text-center">
                  <p className="font-display text-sm font-semibold text-text-primary">{name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/artistas"
              className="font-display text-xs tracking-widest text-accent-cyan uppercase transition-opacity hover:opacity-70"
            >
              Ver trayectoria completa →
            </Link>
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── WHY US — stacking section 4 ──────────────────────────────── */}
      <StackingSection index={4} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Por qué Turpial Sound"
            heading="Infraestructura real. Criterio técnico. Trayectoria verificable."
            align="center"
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-[1400px] mx-auto">
            {whyItems.map((item) => (
              <div
                key={item.title}
                className={`card-premium-wrapper${item.accent === 'gold' ? ' card-premium-wrapper--gold' : ''} flex flex-col items-center justify-center text-center rounded-2xl bg-brand-surface p-8 min-h-[320px]`}
              >
                <item.Icon
                  size={32}
                  className="mb-6"
                  style={{ color: item.accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                  aria-hidden="true"
                />
                <h3 className="font-display text-base text-text-primary">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── PRICING PREVIEW — stacking section 5 ─────────────────────── */}
      <StackingSection index={5} waves>
        <SectionShell background="none">
          <PricingPreview />
        </SectionShell>
      </StackingSection>

      {/* ── NUESTRAS INSTALACIONES — stacking section 6 ─────────────── */}
      <StackingSection index={6} background="surface" waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Nuestras instalaciones"
            heading="Un entorno diseñado para crear sin límites."
            subheading="Porque el ambiente también forma parte del sonido. Turpial Sound combina infraestructura profesional con una estética que inspira — en la zona más accesible de Caracas."
            align="center"
          />
          <InstalacionesSection />
        </SectionShell>
      </StackingSection>

      {/* ── CTA — stacking section 7 ─────────────────────────────────── */}
      <StackingSection index={7}>
        <CTASection
          heading="¿Tienes un proyecto en mente?"
          subheading="Cuéntanos qué necesitas. Revisamos disponibilidad y armamos una propuesta."
          secondaryCTA={{ label: 'Ver todos los servicios', href: '/servicios' }}
          imageSrc="/images/consola.jpg"
        />
      </StackingSection>
    </>
  )
}
