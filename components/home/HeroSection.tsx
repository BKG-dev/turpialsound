import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { HeroCinematicLayer } from '@/components/home/HeroCinematicLayer'

interface HeroSectionProps {
  showStudioLink?: boolean
}

export function HeroSection({ showStudioLink = true }: HeroSectionProps) {
  return (
    <section
      className="relative flex min-h-screen min-h-[100dvh] snap-start items-center overflow-hidden -mt-16 pt-0"
      aria-label="Hero principal"
    >
      <Image
        src="/images/artista-hero-1280.webp"
        alt="Turpial Sound estudio en Caracas"
        fill
        sizes="(max-width: 768px) 100vw, 1280px"
        quality={70}
        className="object-cover object-center opacity-55"
      />
      <HeroCinematicLayer />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.42) 0%, rgba(10,10,10,0.38) 45%, rgba(10,10,10,0.7) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 py-32 w-full pl-6 sm:pl-[6.5rem] pr-6">
        <div
          className="max-w-[900px]"
          style={{
            borderRadius: '0.5rem',
            padding: '1rem 2rem 1rem 0',
            marginLeft: '-0.5rem',
          }}
        >
          <div className="mb-8 flex items-center gap-4">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.3em] uppercase text-gradient-animated">
              Caracas, Venezuela · Desde 2015
            </span>
          </div>

          <h1
            className="font-display text-text-primary"
            style={{ lineHeight: 1, letterSpacing: '0.02em', fontSize: 'clamp(3rem, 9vw, 8rem)' }}
          >
            TURPIAL
            <br />
            SOUND
          </h1>

          <p
            className="mt-8 max-w-[580px] text-body-lg"
            style={{
              color: '#F5F5F5',
              fontWeight: 500,
            }}
          >
            Donde el criterio técnico hace la diferencia. Hub premium de ensayo,
            grabación y producción musical.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button as="link" href="/reservas" variant="primary" size="lg">
              Reservar ahora
            </Button>
            <Button as="link" href="/servicios" variant="glow-cyan" size="lg">
              Ver servicios
            </Button>
            {showStudioLink ? (
              <a
                href="#video-estudio"
                className="font-display text-xs tracking-[0.2em] uppercase text-text-secondary transition-opacity hover:opacity-80"
              >
                Ver video del estudio
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
