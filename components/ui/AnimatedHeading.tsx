'use client'

import { motion } from 'framer-motion'
interface AnimatedHeadingProps {
  text: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/**
 * Letter-by-letter entrance animation triggered on scroll into view.
 * Left-to-right stagger. Used for section titles requiring extra presence.
 */
export function AnimatedHeading({ text, as = 'h2', className }: AnimatedHeadingProps) {
  const Tag = as
  const chars = text.split('')

  return (
    <Tag aria-label={text} className={className}>
      <motion.span
        className="inline-flex flex-wrap"
        aria-hidden="true"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.028, delayChildren: 0.05 } },
        }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
              },
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  )
}
