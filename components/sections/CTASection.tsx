import type { Route } from 'next'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { ctaNav } from '@/content/navigation'
import { cn } from '@/lib/utils'

interface CTASectionProps {
  heading?: string
  subheading?: string
  ctaLabel?: string
  ctaHref?: Route
  secondaryCTA?: { label: string; href: Route }
  className?: string
  variant?: 'default' | 'accent'
  /** Optional right-edge image with dissolve fade. Shows a side-by-side layout. */
  imageSrc?: string
}

export function CTASection({
  heading = '¿Listo para empezar?',
  subheading = 'Contáctanos para revisar disponibilidad y recibir una propuesta a medida.',
  ctaLabel,
  ctaHref,
  secondaryCTA,
  className,
  variant = 'default',
  imageSrc,
}: CTASectionProps) {
  const hasSideImage = Boolean(imageSrc)

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        hasSideImage ? 'py-16 sm:py-24 flex items-center' : 'section-padding-sm',
        hasSideImage
          ? 'bg-transparent'
          : variant === 'accent'
            ? 'bg-brand-surface'
            : 'border-t border-brand-border bg-brand-bg',
        className,
      )}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: hasSideImage
            ? 'radial-gradient(ellipse 50% 70% at 20% 50%, rgba(255,193,7,0.06) 0%, transparent 65%)'
            : 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,193,7,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Consola image — absolutely positioned, bleeds to right edge with dissolve */}
      {hasSideImage && imageSrc && (
        <div
          className="pointer-events-none select-none absolute inset-y-0 right-0 w-[58%]"
          aria-hidden="true"
        >
          <div
            className="relative h-full w-full"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, black 55%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, black 55%)',
            }}
          >
            <Image
              src={imageSrc}
              alt=""
              fill
              className="object-cover object-center"
              sizes="58vw"
              priority={false}
            />
            {/* Extra inner vignette for depth */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(10,10,10,0.25) 0%, transparent 40%, rgba(10,10,10,0.35) 100%)',
              }}
            />
          </div>
        </div>
      )}

      <div className={cn('container-base relative w-full', !hasSideImage && 'text-center')}>
        {hasSideImage ? (
          /* Side-by-side: text+buttons take the left half */
          <div className="max-w-lg">
            <h2 className="font-display text-display-lg text-text-primary leading-[1.1]">
              {heading}
            </h2>
            {subheading && (
              <p className="mt-5 text-body-base text-text-secondary">{subheading}</p>
            )}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button as="link" href={ctaHref ?? ctaNav.href} variant="primary" size="lg">
                {ctaLabel ?? ctaNav.label}
              </Button>
              {secondaryCTA && (
                <Button as="link" href={secondaryCTA.href} variant="glow-cyan" size="lg">
                  {secondaryCTA.label}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Original centered layout */
          <>
            <h2 className="font-display text-display-md text-text-primary">{heading}</h2>
            {subheading && (
              <p className="mx-auto mt-4 max-w-narrow text-body-base text-text-secondary">
                {subheading}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button as="link" href={ctaHref ?? ctaNav.href} variant="primary" size="lg">
                {ctaLabel ?? ctaNav.label}
              </Button>
              {secondaryCTA && (
                <Button as="link" href={secondaryCTA.href} variant="glow-cyan" size="lg">
                  {secondaryCTA.label}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
