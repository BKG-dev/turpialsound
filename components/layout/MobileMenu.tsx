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
    <div className="relative z-[70] lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-250 hover:text-text-primary"
        aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <span className="sr-only">{open ? 'Cerrar' : 'Menu'}</span>

        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="animate-slide-down fixed left-3 right-3 top-[4.25rem] z-[70] max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-2xl border border-white/[0.08] px-4 py-5 shadow-2xl sm:left-6 sm:right-6"
          style={{
            background: 'rgba(8,8,8,0.98)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.85)',
          }}
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col gap-1" aria-label="Menu principal movil">
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
