import Link from 'next/link'
import { footerNavItems, ctaNav } from '@/content/navigation'
import { siteConfig } from '@/content/site'
import { Button } from '@/components/ui/Button'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-brand-border bg-brand-surface">
      <div className="container-base section-padding-sm">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="font-display text-xl font-bold tracking-tight text-text-primary"
            >
              Turpial Sound
            </Link>
            <p className="mt-4 text-sm text-text-muted">
              Hub premium de ensayo, grabación y producción musical en Caracas.{/* SUGGESTED */}
            </p>
            <div className="mt-6">
              <Button as="link" href={ctaNav.href} variant="primary" size="sm">
                {ctaNav.label}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Navegación del pie de página">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Navegación
            </p>
            <ul className="flex flex-col gap-2">
              {footerNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Contacto
            </p>
            <ul className="flex flex-col gap-3 text-sm text-text-secondary">
              <li>
                <span className="block text-text-muted">Ciudad</span>
                {siteConfig.address.city}, {siteConfig.address.country}
              </li>
              <li>
                <span className="block text-text-muted">WhatsApp</span>
                <a
                  href={`https://wa.me/${siteConfig.phoneWhatsApp.replace(/\D/g, '')}`}
                  className="transition-colors hover:text-accent-gold"
                >
                  {siteConfig.phoneDisplay}
                </a>
              </li>
              {siteConfig.email && (
                <li>
                  <span className="block text-text-muted">Email</span>
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="transition-colors hover:text-accent-gold"
                  >
                    {siteConfig.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-brand-border pt-8 sm:flex-row">
          <p className="text-xs text-text-muted">
            © {currentYear} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <Link
            href="/politica-de-privacidad"
            className="text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            Política de privacidad
          </Link>
        </div>
      </div>
    </footer>
  )
}
