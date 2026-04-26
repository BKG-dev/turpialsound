'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { mainNavItems, ctaNav, ctaWaHref } from '@/content/navigation'

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative z-[70] lg:hidden">
      {/* Hamburger / Close button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-250 hover:text-text-primary"
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
          className="animate-slide-down fixed left-3 right-3 top-[4.25rem] z-[70] max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-2xl border border-white/[0.08] px-4 py-5 shadow-2xl sm:left-6 sm:right-6"
          style={{
            background: 'rgba(8,8,8,0.98)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.85)',
          }}
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

          <div className="mt-6 border-t border-brand-border pt-6">
            <a
              href={ctaWaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-silky-primary font-semibold transition-all duration-250 hover:brightness-110 inline-flex items-center justify-center gap-2 font-medium leading-none text-base px-6 py-3 rounded w-full"
            >
              {ctaNav.label}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
