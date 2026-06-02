'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { MapEmbed } from '@/components/layout/MapEmbed'
import { FlipCounter } from '@/components/ui/FlipCounter'
import { footerNavItems, ctaNav } from '@/content/navigation'
import { siteConfig } from '@/content/site'
import { Button } from '@/components/ui/Button'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const isBookingWizardRoute = pathname?.startsWith('/reservas') ?? false

  return (
    <footer className="snap-end border-t border-white/[0.04] bg-brand-surface">
      <div className="container-base section-padding-sm">
        <div className="grid gap-12 md:grid-cols-3">

          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="font-display text-lg tracking-widest text-gradient-animated"
            >
              TURPIAL SOUND
            </Link>
            <p className="mt-4 text-sm text-text-secondary">
              Hub premium de ensayo, grabación y producción musical en Caracas.
            </p>
            {/* Animated accent line */}
            <div className="mt-5">
              <span className="accent-line-animated" aria-hidden="true" />
            </div>
            {!isBookingWizardRoute && (
              <div className="mt-6">
                <Button as="link" href={ctaNav.href} variant="primary" size="sm">
                  {ctaNav.label}
                </Button>
              </div>
            )}

            <MapEmbed />
          </div>

          {/* Navigation */}
          <nav aria-label="Navegación del pie de página">
            <p className="mb-4 font-display text-xs tracking-[0.25em] text-text-secondary uppercase">
              Navegación
            </p>
            <ul className="flex flex-col gap-2">
              {footerNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-secondary transition-colors duration-250 hover:text-accent-gold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact — flex column so logo fills remaining space and centers */}
          <div className="flex flex-col">
            <p className="mb-4 font-display text-xs tracking-[0.25em] text-text-secondary uppercase">
              Contacto
            </p>
            <ul className="flex flex-col gap-4 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <MapPin size={14} className="mt-0.5 shrink-0 text-accent-cyan" aria-hidden="true" />
                <span>
                  {siteConfig.address.city}, {siteConfig.address.country}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={14} className="mt-0.5 shrink-0 text-accent-cyan" aria-hidden="true" />
                <a
                  href={`https://wa.me/${siteConfig.phoneWhatsApp.replace(/\D/g, '')}`}
                  className="transition-colors duration-250 hover:text-accent-gold"
                >
                  {siteConfig.phoneDisplay}
                </a>
              </li>
              {siteConfig.email && (
                <li className="flex items-start gap-3">
                  <Mail size={14} className="mt-0.5 shrink-0 text-accent-cyan" aria-hidden="true" />
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="transition-colors duration-250 hover:text-accent-cyan"
                  >
                    {siteConfig.email}
                  </a>
                </li>
              )}
            </ul>

            {siteConfig.socialLinks.instagram && (
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={siteConfig.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Turpial Sound"
                  className="text-text-secondary transition-colors duration-250 hover:text-accent-gold"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                {siteConfig.socialLinks.youtube && (
                  <a
                    href={siteConfig.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube Turpial Sound"
                    className="text-text-secondary transition-colors duration-250 hover:text-accent-gold"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29.94 29.94 0 0 0 1 12a29.94 29.94 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29.94 29.94 0 0 0 23 12a29.94 29.94 0 0 0-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Logo 3D — centrado en el espacio libre entre contacto y bottom bar */}
            <div className="flex flex-1 items-center justify-center pt-6">
              <div className="-translate-x-12 translate-y-[15px]">
                <Image
                  src="/images/logo-footer.png"
                  alt="Logo Turpial Sound"
                  width={368}
                  height={230}
                  loading="lazy"
                  className="h-auto w-[368px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Flip counter */}
        <div className="mt-10 border-t border-brand-border pt-2">
          <FlipCounter />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-brand-border pt-8 sm:flex-row">
          <p className="text-xs text-text-secondary">
            © {currentYear} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <Link
            href="/politica-de-privacidad"
            className="text-xs text-text-secondary transition-colors duration-250 hover:text-text-primary"
          >
            Política de privacidad
          </Link>
        </div>
      </div>
    </footer>
  )
}
