'use client'

import { useEffect } from 'react'
import { motion, useTransform, useSpring, type MotionValue } from 'framer-motion'
import { bellOverRange } from '@/lib/bell'

interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

interface FluidCurveScrollImgProps {
  scrollProgress: MotionValue<number>
  imageSrc: string
  direction?: 'down' | 'up'
  inputRange?: [number, number, number]
  minScaleY?: number
  maxScaleY?: number
  sharpness?: number
  peakGain?: number
  curveHeightVh?: number
  edgeBleedVW?: number
  yOffsetPx?: number
  spring?: SpringConfig
  fade?: boolean
  enabled?: boolean
  gateSpring?: SpringConfig
  flipY?: boolean
}

export function FluidCurveScrollImg({
  scrollProgress,
  imageSrc,
  direction = 'down',
  inputRange = [0, 0.5, 1],
  minScaleY = 0.0001,
  maxScaleY = 1.62,
  sharpness = 2.4,
  peakGain = 1.28,
  curveHeightVh = 50,
  edgeBleedVW = 8,
  yOffsetPx = 0,
  spring = { stiffness: 50, damping: 10, mass: 0.2 },
  fade = false,
  enabled = true,
  gateSpring = { stiffness: 200, damping: 32, mass: 0.6 },
  flipY = false,
}: FluidCurveScrollImgProps) {
  const smooth = useSpring(scrollProgress, spring)

  // Gate: animates enabled on/off without hard cuts
  const gate = useSpring(enabled ? 1 : 0, gateSpring)
  useEffect(() => {
    gate.set(enabled ? 1 : 0)
  }, [enabled, gate])

  const scaleY = useTransform([smooth, gate] as MotionValue[], ([t, g]: number[]) => {
    const [start, peak, end] = inputRange
    const bell = bellOverRange(t, start, peak, end, sharpness, peakGain)
    return minScaleY + (maxScaleY - minScaleY) * bell * g
  })

  const opacity = fade
    ? useTransform([smooth, gate] as MotionValue[], ([t, g]: number[]) => {
        const [start, peak, end] = inputRange
        return bellOverRange(t, start, peak, end, 1.0, 1.0) * g
      })
    : undefined

  const originY = direction === 'up' ? '100%' : '0%'
  const bleed = Math.max(0, edgeBleedVW)
  const width = `calc(100vw + ${bleed * 2}vw)`

  const transform = useTransform(
    scaleY,
    (s) => `translateX(-50%) translateY(${yOffsetPx}px) scaleY(${s})`,
  )

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none select-none z-0"
      style={{
        left: '50%',
        width,
        height: `${curveHeightVh}vh`,
        transformOrigin: `50% ${originY}`,
        transform,
        top: direction === 'down' ? 0 : 'auto',
        bottom: direction === 'up' ? 0 : 'auto',
        opacity,
        willChange: 'transform, opacity',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="w-full h-full object-fill pointer-events-none select-none"
        style={flipY ? { transform: 'scaleY(-1)' } : undefined}
        decoding="async"
        loading="lazy"
      />
    </motion.div>
  )
}
