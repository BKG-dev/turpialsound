'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mainNavItems, ctaNav } from '@/content/navigation'
import { Button } from '@/components/ui/Button'

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors hover:text-text-primary"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        <span className="sr-only">{open ? 'Cerrar' : 'Menú'}</span>

        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 4L16 16M16 4L4 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 6h14M3 10h14M3 14h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-16 z-40 border-b border-brand-border bg-brand-bg px-6 py-6"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col gap-1" aria-label="Menú principal móvil">
            {mainNavItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded px-3 py-3 text-base text-text-secondary transition-colors hover:text-text-primary"
                >
                  {item.label}
                </Link>

                {item.children && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-brand-border pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-2 text-sm text-text-muted transition-colors hover:text-text-secondary"
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
            <Button as="link" href={ctaNav.href} variant="primary" size="md" className="w-full">
              {ctaNav.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}