import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail } from 'lucide-react'
import { MapEmbed } from '@/components/layout/MapEmbed'
import { FlipCounter } from '@/components/ui/FlipCounter'
import { footerNavItems, ctaNav } from '@/content/navigation'
import { siteConfig } from '@/content/site'
import { Button } from '@/components/ui/Button'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

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
            <div className="mt-6">
              <Button as="link" href={ctaNav.href} variant="primary" size="sm">
                {ctaNav.label}
              </Button>
            </div>

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
