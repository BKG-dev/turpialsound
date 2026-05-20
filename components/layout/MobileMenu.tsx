'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { mainNavItems, ctaNav } from '@/content/navigation'
import { Button } from '@/components/ui/Button'

interface MobileMenuProps {
  hideWhatsAppCta?: boolean
}

export function MobileMenu({ hideWhatsAppCta = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      {/* Hamburger / Close button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors duration-250 hover:text-text-primary"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <span className="sr-only">{open ? 'Cerrar' : 'Menú'}</span>

        {open ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}
      </button>

      {/* Slide-down panel */}
      {open && (
        <div
          id="mobile-nav"
          className="animate-slide-down fixed inset-x-0 top-16 z-40 glass-surface border-b border-white/[0.06] px-6 py-6"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col gap-1" aria-label="Menú principal móvil">
            {mainNavItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded px-3 py-3 text-base text-text-secondary transition-colors duration-250 active:text-text-primary"
                >
                  {item.label}
                </Link>

                {item.children && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-brand-border pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-2 text-sm text-text-muted transition-colors duration-250 active:text-accent-cyan"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {!hideWhatsAppCta && (
            <div className="mt-6 border-t border-brand-border pt-6">
              <Button as="link" href={ctaNav.href} variant="primary" size="md" className="w-full">
                {ctaNav.label}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
