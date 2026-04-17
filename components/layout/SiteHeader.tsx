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
        'fixed top-3 left-6 right-6 z-50',
        'flex items-stretch h-14',
        'rounded-2xl shadow-glow-cyan-sm',
        'navbar-gradient',
        'border border-white/10',
      ].join(' ')}
    >
      <div className="flex flex-1 min-w-0 items-center gap-2 pl-5 pr-3">
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

      <div className="flex items-center px-4 sm:hidden">
        <MobileMenu hideWhatsAppCta={hideWhatsAppCta} />
      </div>
    </header>
  )
}
