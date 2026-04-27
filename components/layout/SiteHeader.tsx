'use client'

import { usePathname } from 'next/navigation'
import { ctaNav } from '@/content/navigation'
import { Button } from '@/components/ui/Button'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { AnimatedLogo } from '@/components/layout/AnimatedLogo'
import { AnimatedNavLinks } from '@/components/layout/AnimatedNavLinks'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const hideWhatsAppCta = pathname === '/reservas'

  return (
    <header
      className={[
        'fixed top-2 left-3 right-3 z-[60] sm:top-3 sm:left-6 sm:right-6',
        'flex h-12 items-stretch sm:h-14',
        'rounded-2xl shadow-glow-cyan-sm',
        'navbar-gradient',
        'border border-white/10',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-2 pr-1 sm:gap-2 sm:pl-5 sm:pr-3">
        <AnimatedLogo />
        <AnimatedNavLinks />
      </div>

      {!hideWhatsAppCta && (
        <Button
          as="link"
          href={ctaNav.href}
          variant="primary"
          size="sm"
          className={cn(
            'hidden sm:inline-flex items-center',
            'self-stretch px-6 py-0',
            'rounded-l-xl rounded-r-2xl',
            'whitespace-nowrap',
          )}
        >
          {ctaNav.label}
        </Button>
      )}

      <div className="flex shrink-0 items-center px-2 sm:hidden">
        <MobileMenu hideWhatsAppCta={hideWhatsAppCta} />
      </div>
    </header>
  )
}
