import { ctaNav, ctaWaHref } from '@/content/navigation'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { AnimatedLogo } from '@/components/layout/AnimatedLogo'
import { AnimatedNavLinks } from '@/components/layout/AnimatedNavLinks'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  return (
    /*
     * Pill navbar:
     *  • right-6  → borde derecho alineado con el AudioVisualizerPlasma (right-6)
     *  • left-6   → simétrico, deja margen visual a ambos lados
     *  • rounded-2xl en todos los extremos del pill
     *  • El CTA "Reservar" es la tapa derecha del pill: rounded-r-2xl, h-full
     */
    <header
      className={[
        'fixed top-2 left-3 right-3 z-[60] sm:top-3 sm:left-6 sm:right-6',
        'flex h-12 items-stretch sm:h-14',
        'rounded-2xl shadow-glow-cyan-sm',
        'navbar-gradient',
        'border border-white/10',
      ].join(' ')}
    >
      {/* ── Left + centre — logo y nav links ────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-2 pr-1 sm:gap-2 sm:pl-5 sm:pr-3">
        <AnimatedLogo />
        <AnimatedNavLinks />
      </div>

      {/* ── Right cap — CTA como tapa del pill ──────────────────────── */}
      {/*
       * El botón ocupa h-full, sus esquinas derechas repiten el radio del pill
       * (rounded-r-2xl = 28px). Las izquierdas son más suaves (rounded-l-xl = 20px)
       * para una transición orgánica desde el interior del pill.
       * twMerge en Button garantiza que estas clases prevalezcan sobre size="sm".
       */}
      <a
        href={ctaWaHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'btn-silky-primary font-semibold transition-all duration-250 hover:brightness-110',
          'inline-flex items-center justify-center gap-2 font-medium leading-none text-sm',
          'hidden sm:inline-flex',
          'self-stretch py-0 px-6',
          'rounded-l-xl rounded-r-2xl',
          'whitespace-nowrap',
        )}
      >
        {ctaNav.label}
      </a>

      {/* Mobile trigger — visible solo en < sm */}
      <div className="flex shrink-0 items-center px-2 sm:hidden">
        <MobileMenu />
      </div>
    </header>
  )
}
