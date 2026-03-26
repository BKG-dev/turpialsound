import Link from 'next/link'
import { mainNavItems, ctaNav } from '@/content/navigation'
import { Button } from '@/components/ui/Button'
import { MobileMenu } from '@/components/layout/MobileMenu'

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-sm">
      <div className="container-base flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-text-primary transition-colors hover:text-accent-gold"
          aria-label="Turpial Sound — Inicio"
        >
          Turpial Sound
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {mainNavItems.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className="rounded px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="absolute left-0 top-full mt-1 hidden w-56 rounded-lg border border-brand-border bg-brand-surface py-2 shadow-xl group-hover:block">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* CTA + Mobile trigger */}
        <div className="flex items-center gap-3">
          <Button as="link" href={ctaNav.href} variant="primary" size="sm" className="hidden sm:inline-flex">
            {ctaNav.label}
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
