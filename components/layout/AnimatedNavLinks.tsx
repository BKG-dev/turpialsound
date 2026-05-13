import Link from 'next/link'
import { mainNavItems } from '@/content/navigation'

export function AnimatedNavLinks() {
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
      {mainNavItems.map((item) => (
        <div key={item.href} className="group relative">
          <Link
            href={item.href}
            className={[
              'relative block rounded px-2 py-2 text-sm text-text-secondary whitespace-nowrap',
              'transition-colors duration-250 hover:text-text-primary',
              'after:absolute after:bottom-0 after:left-3 after:right-3 after:block after:h-px',
              'after:origin-left after:scale-x-0',
              'after:bg-gradient-to-r after:from-accent-gold after:to-accent-cyan',
              'after:transition-transform after:duration-[300ms] after:ease-out',
              'hover:after:scale-x-100 group-focus-within:after:scale-x-100',
              item.label === 'Marketplace' ? 'nav-glow-marketplace' : '',
            ].join(' ')}
          >
            {item.label}
          </Link>

          {item.children ? (
            <div className="pointer-events-none absolute left-0 top-full z-50 w-56 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="rounded-xl glass-surface py-2 shadow-glow-cyan-sm">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block px-4 py-2.5 text-sm text-text-secondary transition-colors duration-250 hover:text-accent-gold"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  )
}
