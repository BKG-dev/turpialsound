import Link from 'next/link'
import type { Route } from 'next'

const marketplaceFooterLinks: { label: string; href: Route<string> }[] = [
  { label: 'Categorias', href: '/marketplace' },
  { label: 'Vender en Turpial Market', href: '/marketplace?sell=true' as Route },
  { label: 'Como comprar', href: '/marketplace' },
  { label: 'Como vender', href: '/marketplace' },
  { label: 'Drop Social — Referidos', href: '/marketplace?tab=referrals' as Route },
  { label: 'Ayuda / Soporte', href: '/contacto' },
  { label: 'Terminos y condiciones', href: '/politica-de-privacidad' },
]

export function MarketplaceFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="snap-end border-t" style={{ borderColor: 'var(--mp-border)', background: 'var(--mp-panel-soft)' }}>
      <div className="container-base section-padding-sm">
        <div className="grid gap-12 md:grid-cols-3">

          {/* Brand column */}
          <div>
            <Link
              href="/marketplace"
              className="font-semibold text-base tracking-wide text-[#00aeef]"
              style={{ fontFamily: 'var(--font-michroma), sans-serif' }}
            >
              TURPIAL MARKET
            </Link>
            <p className="mt-4 text-sm" style={{ color: 'var(--mp-text-muted)' }}>
              El marketplace musical de Venezuela. Compra y vende instrumentos, equipos de audio
              y servicios musicales de forma segura.
            </p>
            <div className="mt-5">
              <span className="accent-line-animated" aria-hidden="true" />
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Navegacion del marketplace">
            <p className="mb-4 text-xs tracking-[0.25em] uppercase" style={{ color: 'var(--mp-text-faint)' }}>
              Marketplace
            </p>
            <ul className="flex flex-col gap-2">
              {marketplaceFooterLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-250 hover:text-[#00aeef]"
                    style={{ color: 'var(--mp-text-muted)' }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Platform links */}
          <div className="flex flex-col">
            <p className="mb-4 text-xs tracking-[0.25em] uppercase" style={{ color: 'var(--mp-text-faint)' }}>
              Turpial Sound
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-250 hover:text-[#00aeef]"
                  style={{ color: 'var(--mp-text-muted)' }}
                >
                  Turpial Zone — Home
                </Link>
              </li>
              <li>
                <Link
                  href="/salas-de-ensayo"
                  className="transition-colors duration-250 hover:text-[#00aeef]"
                  style={{ color: 'var(--mp-text-muted)' }}
                >
                  Salas de ensayo
                </Link>
              </li>
              <li>
                <Link
                  href="/estudio-de-grabacion"
                  className="transition-colors duration-250 hover:text-[#00aeef]"
                  style={{ color: 'var(--mp-text-muted)' }}
                >
                  Estudio de grabacion
                </Link>
              </li>
              <li>
                <Link
                  href="/nosotros"
                  className="transition-colors duration-250 hover:text-[#00aeef]"
                  style={{ color: 'var(--mp-text-muted)' }}
                >
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 mt-10 sm:flex-row"
          style={{ borderColor: 'var(--mp-border)' }}>
          <p className="text-xs" style={{ color: 'var(--mp-text-faint)' }}>
            Turpial Market Beta — {currentYear} Turpial Sound. Todos los derechos reservados.
          </p>
          <Link
            href="/politica-de-privacidad"
            className="text-xs transition-colors duration-250 hover:text-[#00aeef]"
            style={{ color: 'var(--mp-text-faint)' }}
          >
            Politica de privacidad
          </Link>
        </div>
      </div>
    </footer>
  )
}
