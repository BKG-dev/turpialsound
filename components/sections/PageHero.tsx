import { cn } from '@/lib/utils'

interface PageHeroProps {
  eyebrow?: string
  heading: string
  subheading?: string
  children?: React.ReactNode
  className?: string
  size?: 'default' | 'large'
}

export function PageHero({
  eyebrow,
  heading,
  subheading,
  children,
  className,
  size = 'default',
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative border-b border-brand-border bg-brand-surface',
        size === 'large' ? 'section-padding' : 'section-padding-sm',
        className,
      )}
    >
      {/* Subtle background gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,151,58,0.08) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="container-base relative">
        {eyebrow && (
          <div className="mb-4 flex items-center gap-3">
            <span className="accent-line" aria-hidden="true" />
            <span className="text-sm font-medium uppercase tracking-widest text-accent-gold">
              {eyebrow}
            </span>
          </div>
        )}

        <h1
          className={cn(
            'font-display font-bold text-text-primary',
            size === 'large' ? 'text-display-xl' : 'text-display-lg',
          )}
        >
          {heading}
        </h1>

        {subheading && (
          <p className="mt-4 max-w-prose text-body-lg text-text-secondary">{subheading}</p>
        )}

        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  )
}
