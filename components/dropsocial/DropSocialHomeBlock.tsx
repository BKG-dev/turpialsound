import Link from 'next/link'
import { Gift, Zap, Eye, DollarSign } from 'lucide-react'

type Variant = 'turpial' | 'marketplace'

interface DropSocialHomeBlockProps {
  variant?: Variant
  ctaLabel?: string
}

const COPY = {
  eyebrow: 'DropSocial',
  heading: 'Comparte cualquier link del Marketplace. Cobra el 10%.',
  sub: 'La red social te dio likes. Nosotros te damos el 10% de nuestra comisión por cada venta que traigan tus links. Sin tope. Sin esfuerzo. Sin permiso.',
  perks: [
    { Icon: Zap, label: 'Sin límite de links' },
    { Icon: Eye, label: 'Panel transparente' },
    { Icon: DollarSign, label: 'Sin tope de ganancia' },
  ],
}

export function DropSocialHomeBlock({
  variant = 'turpial',
  ctaLabel,
}: DropSocialHomeBlockProps) {
  const cta = ctaLabel ?? (variant === 'marketplace' ? 'Quiero mi link' : 'Empezar a ganar')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
      {/* gradient firma DropSocial — cyan → gold */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 0% 50%, rgba(0,174,239,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 70% at 100% 50%, rgba(255,193,7,0.10) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-px -right-px top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(0,174,239,0.5) 35%, rgba(255,193,7,0.6) 65%, transparent 100%)',
        }}
      />

      <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
              }}
            >
              <Gift size={16} className="text-brand-bg" />
            </span>
            <span
              className="font-display text-xs uppercase"
              style={{
                letterSpacing: '0.25em',
                background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {COPY.eyebrow}
            </span>
          </div>

          <h2
            className="font-display text-text-primary"
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              lineHeight: 1.15,
              letterSpacing: '0.01em',
            }}
          >
            {COPY.heading}
          </h2>

          <p className="mt-4 max-w-prose text-body-base text-text-secondary">{COPY.sub}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {COPY.perks.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest text-text-muted"
                >
                  <Icon size={14} className="text-accent-gold" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/dropsocial"
              className="btn-silky-primary inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold leading-none transition-all duration-250 hover:brightness-110"
            >
              {cta} →
            </Link>
            <Link
              href="/dropsocial"
              className="font-display text-xs uppercase tracking-widest text-accent-cyan transition-opacity hover:opacity-70"
            >
              ver cómo funciona →
            </Link>
          </div>
        </div>

        {/* Visual: motto en gigante */}
        <div className="relative hidden lg:flex lg:items-center lg:justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,193,7,0.10) 0%, transparent 60%)',
            }}
          />
          <div className="relative text-center">
            <p
              className="font-display text-text-primary"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                letterSpacing: '0.06em',
                lineHeight: 1.4,
              }}
            >
              comparte.
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #00AEEF 0%, #FFC107 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                suena.
              </span>
              <br />
              <span className="text-accent-gold">cobra.</span>
            </p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-text-muted">
              10% de nuestra comisión · sin tope
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
