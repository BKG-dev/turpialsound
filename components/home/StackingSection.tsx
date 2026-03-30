'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { bellOverRange } from '@/lib/bell'

interface StackingSectionProps {
  children: React.ReactNode
  index: number
  background?: 'default' | 'surface'
  className?: string
  /** Optional wave PNG/WebP (transparent bg) rendered at the top edge of the section */
  waveSrc?: string
}

export function StackingSection({
  children,
  index,
  background = 'default',
  className,
  waveSrc,
}: StackingSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const smooth = useSpring(scrollYProgress, { stiffness: 50, damping: 10, mass: 0.2 })

  // Scale: blooms from 0.94 → 1 as section enters center
  const scale = useTransform(smooth, (t) => {
    const bell = bellOverRange(t, 0, 0.45, 0.9, 1.8, 1.0)
    return 0.94 + 0.06 * bell
  })

  // Y: slides up 50px as it enters
  const y = useTransform(smooth, (t) => {
    const bell = bellOverRange(t, 0, 0.4, 0.8, 1.6, 1.0)
    return (1 - bell) * 50
  })

  const bg =
    background === 'surface'
      ? 'bg-brand-surface'
      : 'bg-brand-bg'

  return (
    <motion.div
      ref={ref}
      style={{
        scale,
        y,
        zIndex: index + 1,
        willChange: 'transform',
      }}
      className={cn(
        'relative rounded-t-3xl -mt-px',
        bg,
        className,
      )}
    >
      {/* Top edge depth line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)',
        }}
        aria-hidden="true"
      />

      {/* Optional wave transition asset — sits at top, full width, ~90px tall */}
      {waveSrc && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[90px]"
          aria-hidden="true"
        >
          <Image
            src={waveSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-fill"
            priority={false}
          />
        </div>
      )}

      {children}
    </motion.div>
  )
}
