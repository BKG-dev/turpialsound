import type { Route } from 'next'
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
}

export function CTASection({
  heading = '¿Listo para empezar?',
  subheading = 'Contáctanos para revisar disponibilidad y recibir una propuesta a medida.',
  ctaLabel,
  ctaHref,
  secondaryCTA,
  className,
  variant = 'default',
}: CTASectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden section-padding-sm',
        variant === 'accent' ? 'bg-brand-surface' : 'border-t border-brand-border bg-brand-bg',
        className,
      )}
    >
      {/* Subtle glow on CTA sections */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,193,7,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="container-base relative text-center">
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
      </div>
    </section>
  )
}
