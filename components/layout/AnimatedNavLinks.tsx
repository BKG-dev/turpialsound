'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { mainNavItems } from '@/content/navigation'

/**
 * AnimatedNavLinks — staggered entrance + hover underline gradient.
 *
 * The underline is an ::after pseudo-element that scales from 0 → 1 on hover.
 * It uses the cyan-gold palette gradient from the design system.
 * after:content-[''] is implicit in Tailwind v3 via --tw-content:''.
 */
export function AnimatedNavLinks() {
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
      {mainNavItems.map((item, i) => (
        <motion.div
          key={item.href}
          className="group relative"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.55 + i * 0.07,
            duration: 0.42,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Link
            href={item.href}
            className={[
              /* base */
              'relative block rounded px-2 py-2 text-sm text-text-secondary whitespace-nowrap',
              'transition-colors duration-250 hover:text-text-primary',
              /* underline pseudo-element — gold→cyan gradient, scale-x on hover */
              'after:absolute after:bottom-0 after:left-3 after:right-3 after:block after:h-px',
              'after:origin-left after:scale-x-0',
              'after:bg-gradient-to-r after:from-accent-gold after:to-accent-cyan',
              'after:transition-transform after:duration-[300ms] after:ease-out',
              'hover:after:scale-x-100',
              /* neon override for Marketplace */
              item.label === 'Marketplace' ? 'nav-glow-marketplace' : '',
            ].join(' ')}
          >
            {item.label}
          </Link>

          {item.children && (
            <div className="absolute left-0 top-full mt-2 hidden w-56 animate-slide-down rounded-xl glass-surface py-2 shadow-glow-cyan-sm group-hover:block">
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
          )}
        </motion.div>
      ))}
    </nav>
  )
}
