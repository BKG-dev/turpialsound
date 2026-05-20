'use client'

import { useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: 'gold' | 'cyan'
  tiltEnabled?: boolean
}

export function TiltCard({
  children,
  className,
  glowColor = 'cyan',
  tiltEnabled = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 280,
    damping: 28,
  })
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [6, -6]), {
    stiffness: 280,
    damping: 28,
  })

  // Reactive halo — follows the cursor inside the card
  const haloX = useTransform(rawX, [-0.5, 0.5], [0, 100])
  const haloY = useTransform(rawY, [-0.5, 0.5], [0, 100])

  const glowRgba =
    glowColor === 'cyan'
      ? 'rgba(0, 174, 239, 0.22)'
      : 'rgba(255, 193, 7, 0.22)'

  const haloBackground = useMotionTemplate`radial-gradient(220px circle at ${haloX}% ${haloY}%, ${glowRgba}, transparent 70%)`

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tiltEnabled || !ref.current) return
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    rawX.set((e.clientX - (left + width / 2)) / width)
    rawY.set((e.clientY - (top + height / 2)) / height)
  }

  function onMouseLeave() {
    rawX.set(0)
    rawY.set(0)
    setHovered(false)
  }

  if (!tiltEnabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={cn('relative', className)}
    >
      {/* Reactive halo */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: haloBackground,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
        aria-hidden="true"
      />
      {children}
    </motion.div>
  )
}
