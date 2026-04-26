'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { LogoGlb } from '@/components/media/LogoGlb'

const BRAND_CHARS = 'TURPIAL SOUND'.split('')

export function AnimatedLogo() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Link href="/" aria-label="Turpial Sound — Inicio" className="flex min-w-0 items-center gap-1.5 sm:gap-2">

      {/* Logo 3D — mismo elemento que el footer, tamaño navbar */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
      >
        <LogoGlb width={44} height={38} interactive={false} />
      </motion.div>

      {/* Per-letter stagger */}
      <span
        aria-hidden="true"
        className="font-display flex min-w-0 select-none overflow-hidden whitespace-nowrap text-[0.7rem] tracking-[0.08em] text-gradient-animated sm:text-lg sm:tracking-widest"
      >
        {BRAND_CHARS.map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 14 }}
            animate={mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 }}
            transition={{
              delay: 0.25 + i * 0.032,
              duration: 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </span>
    </Link>
  )
}
