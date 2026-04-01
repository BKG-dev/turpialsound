'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { bellOverRange } from '@/lib/bell'
import { FluidCurveScrollImg } from '@/components/media/FluidCurveScrollImg'
import { BokehCanvas } from '@/components/effects/BokehCanvas'

const EPSILON = 0.0005

interface StackingSectionProps {
  children: React.ReactNode
  index: number
  background?: 'default' | 'surface'
  className?: string
  /** Enables bidirectional scroll-driven wave transitions */
  waves?: boolean
}

export function StackingSection({
  children,
  index,
  background = 'default',
  className,
  waves = false,
}: StackingSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const smooth = useSpring(scrollYProgress, { stiffness: 50, damping: 10, mass: 0.2 })

  const scale = useTransform(smooth, (t) => {
    const bell = bellOverRange(t, 0, 0.45, 0.9, 1.8, 1.0)
    return 0.94 + 0.06 * bell
  })

  const y = useTransform(smooth, (t) => {
    const bell = bellOverRange(t, 0, 0.4, 0.8, 1.6, 1.0)
    return (1 - bell) * 50
  })

  // Scroll direction detection
  const [scrollDir, setScrollDir] = useState<'down' | 'up'>('down')
  const prevProgress = useRef(0)

  useEffect(() => {
    if (!waves) return
    const unsub = scrollYProgress.on('change', (v) => {
      const delta = v - prevProgress.current
      if (Math.abs(delta) > EPSILON) setScrollDir(delta > 0 ? 'down' : 'up')
      prevProgress.current = v
    })
    return () => unsub()
  }, [scrollYProgress, waves])

  const bg = background === 'surface' ? 'bg-brand-surface' : 'bg-brand-bg'

  return (
    <motion.div
      ref={ref}
      style={{ scale, y, zIndex: index + 1, willChange: 'transform' }}
      className={cn('relative rounded-t-3xl -mt-px', bg, className)}
    >
      {/* Bokeh particle layer — below wave and content */}
      <BokehCanvas />

      {/* Top edge depth line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)',
        }}
        aria-hidden="true"
      />

      {/* Wave top — blooms when scrolling down */}
      {waves && (
        <FluidCurveScrollImg
          scrollProgress={scrollYProgress}
          direction="down"
          curveHeightVh={55}
          maxScaleY={1.4}
          edgeBleedVW={6}
          fade
          enabled={scrollDir === 'down'}
          vertFade={22}
        />
      )}

      {/* Wave bottom — blooms when scrolling up */}
      {waves && (
        <FluidCurveScrollImg
          scrollProgress={scrollYProgress}
          direction="up"
          curveHeightVh={55}
          maxScaleY={1.4}
          edgeBleedVW={6}
          fade
          enabled={scrollDir === 'up'}
          vertFade={22}
        />
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
