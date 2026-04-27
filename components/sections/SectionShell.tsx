'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SectionShellProps {
  children: React.ReactNode
  className?: string
  id?: string
  background?: 'default' | 'surface' | 'none'
  size?: 'default' | 'sm'
  align?: 'left' | 'right'
}

export function SectionShell({
  children,
  className,
  id,
  background = 'default',
  size = 'default',
  align = 'left',
}: SectionShellProps) {
  const bgClass = {
    default: 'bg-brand-bg',
    surface: 'bg-brand-surface',
    none: '',
  }[background]

  const paddingClass = size === 'sm' ? 'section-padding-sm' : 'section-padding'
  const containerClass = align === 'right' ? 'container-base container-base--right' : 'container-base'

  return (
    <section id={id} className={cn(bgClass, paddingClass, className)}>
      <div className={containerClass}>{children}</div>
    </section>
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  heading: string
  subheading?: string
  align?: 'left' | 'center' | 'right'
  accentColor?: 'gold' | 'cyan'
  className?: string
}

export function SectionHeading({
  eyebrow,
  heading,
  subheading,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      className={cn(
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
    >
      {eyebrow && (
        <motion.div
          className={cn(
            'mb-4 flex items-center gap-4',
            align === 'center' && 'justify-center',
            align === 'right' && 'justify-end flex-row-reverse',
          )}
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }}
        >
          <span className="accent-line-animated" aria-hidden="true" />
          <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
            {eyebrow}
          </span>
        </motion.div>
      )}
      <motion.h2
        className="font-display text-display-md text-text-primary"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
      >
        {heading}
      </motion.h2>
      {subheading && (
        <motion.p
          className={cn(
            'mt-4 max-w-prose text-body-base',
            align === 'center' && 'mx-auto',
            align === 'right' && 'ml-auto',
          )}
          style={{ color: '#d0d0d0', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }}
        >
          {subheading}
        </motion.p>
      )}
    </motion.div>
  )
}
