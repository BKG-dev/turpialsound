'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { mainNavItems } from '@/content/navigation'

export function AnimatedNavLinks() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearClose() {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  function openDropdown(href: string) {
    clearClose()
    setOpenMenu(href)
  }

  function scheduleClose() {
    clearClose()
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null)
      closeTimeoutRef.current = null
    }, 180)
  }

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegacion principal">
      {mainNavItems.map((item, i) => (
        <motion.div
          key={item.href}
          className="relative"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.55 + i * 0.07,
            duration: 0.42,
            ease: [0.16, 1, 0.3, 1],
          }}
          onMouseEnter={() => (item.children ? openDropdown(item.href) : undefined)}
          onMouseLeave={() => (item.children ? scheduleClose() : undefined)}
        >
          <Link
            href={item.href}
            className={[
              'relative block rounded px-2 py-2 text-sm text-text-secondary whitespace-nowrap',
              'transition-colors duration-250 hover:text-text-primary',
              'after:absolute after:bottom-0 after:left-3 after:right-3 after:block after:h-px',
              'after:origin-left after:scale-x-0',
              'after:bg-gradient-to-r after:from-accent-gold after:to-accent-cyan',
              'after:transition-transform after:duration-[300ms] after:ease-out',
              'hover:after:scale-x-100',
              item.label === 'Marketplace' ? 'nav-glow-marketplace' : '',
            ].join(' ')}
          >
            {item.label}
          </Link>

          {item.children && openMenu === item.href && (
            <div
              className="absolute left-0 top-full z-50 w-56 pt-2"
              onMouseEnter={() => openDropdown(item.href)}
              onMouseLeave={() => scheduleClose()}
            >
              <div className="animate-slide-down rounded-xl glass-surface py-2 shadow-glow-cyan-sm">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block px-4 py-2.5 text-sm text-text-secondary transition-colors duration-250 hover:text-accent-gold"
                    onClick={() => setOpenMenu(null)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </nav>
  )
}
