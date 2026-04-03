'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BokehCanvas } from '@/components/effects/BokehCanvas'

interface PageHeroProps {
  eyebrow?: string
  heading: string
  subheading?: string
  children?: React.ReactNode
  className?: string
  size?: 'default' | 'large'
  accentColor?: 'gold' | 'cyan'
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
}

export function PageHero({
  eyebrow,
  heading,
  subheading,
  children,
  className,
  size = 'default',
  accentColor = 'gold',
}: PageHeroProps) {
  const isCyan = accentColor === 'cyan'

  return (
    <section
      className={cn(
        'relative overflow-hidden border-b border-brand-border bg-brand-surface',
        size === 'large' ? 'section-padding' : 'section-padding-sm',
        className,
      )}
    >
      <BokehCanvas />

      {/* Dual-tone background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isCyan
            ? 'radial-gradient(ellipse 70% 50% at 0% 50%, rgba(0,174,239,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(255,193,7,0.05) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 70% 50% at 0% 50%, rgba(255,193,7,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(0,174,239,0.05) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <motion.div
        className="container-base relative"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {eyebrow && (
          <motion.div className="mb-5 flex items-center gap-4" variants={itemVariants}>
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              {eyebrow}
            </span>
          </motion.div>
        )}

        <motion.h1
          className={cn(
            'font-display text-text-primary',
            size === 'large' ? 'text-display-xl' : 'text-display-lg',
          )}
          variants={itemVariants}
        >
          {heading}
        </motion.h1>

        {subheading && (
          <motion.p
            className="mt-5 max-w-prose text-body-lg text-text-secondary"
            variants={itemVariants}
          >
            {subheading}
          </motion.p>
        )}

        {children && (
          <motion.div className="mt-8" variants={itemVariants}>
            {children}
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
