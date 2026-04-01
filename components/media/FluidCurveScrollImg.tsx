'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, useTransform, useSpring, type MotionValue } from 'framer-motion'
import { bellOverRange } from '@/lib/bell'

interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

interface FluidCurveScrollImgProps {
  scrollProgress: MotionValue<number>
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
  /** 0–100: fade-in length at the flat edge (top/bottom). Default 22 */
  vertFade?: number
  /**
   * 0–1: exponent applied to the cosine bump.
   * 1 = plain cosine (wider, gentler sides)
   * 2 = squared cosine (flatter at edges, concentrated peak) — default
   * 3+ = even flatter extremes, sharper peak
   */
  bumpExponent?: number
  /**
   * 0–1: depth of the wave peak relative to canvas height.
   * Higher = deeper belly. Default 0.92. Keep above fadeOutStop.
   */
  peakDepthRatio?: number
  /**
   * 0–1: fraction of canvas height at which the outer fade starts.
   * Must be < peakDepthRatio. Default 0.52.
   */
  fadeBodyEnd?: number
  /**
   * 0–1: fraction at which outer fade reaches transparent.
   * Must be < peakDepthRatio. Default 0.76.
   */
  fadeOutStop?: number
  // kept for API compat, ignored
  imageSrc?: string
  flipY?: boolean
  edgeFade?: number
}

// ---------------------------------------------------------------------------
// Canvas wave draw
// ---------------------------------------------------------------------------
// Shape: LENS — zero height at horizontal extremes, peak at centre.
//   Uses squared-cosine bump: y = peakDepth · ((1-cos(t·2π))/2)²
//   → tangent is horizontal AND second-derivative is zero at extremes
//     (much flatter than plain cosine).
//
// Fades:
//   • Outer curved edge — feathered via blurred path mask (destination-in)
//   • Flat straight edge (top/bottom) — linear gradient (destination-in)
// ---------------------------------------------------------------------------

function buildLensPath(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  direction: 'down' | 'up',
  peakDepth: number,
  bumpExp: number,
) {
  const steps = Math.min(300, Math.ceil(W / 2))
  ctx.beginPath()

  if (direction === 'down') {
    ctx.moveTo(0, 0)
    ctx.lineTo(W, 0)
    // Trace outer curve right → left
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const c = (1 - Math.cos(t * 2 * Math.PI)) / 2
      ctx.lineTo(t * W, peakDepth * Math.pow(c, bumpExp))
    }
  } else {
    ctx.moveTo(0, H)
    ctx.lineTo(W, H)
    // Trace outer curve right → left (rising from bottom)
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const c = (1 - Math.cos(t * 2 * Math.PI)) / 2
      ctx.lineTo(t * W, H - peakDepth * Math.pow(c, bumpExp))
    }
  }

  ctx.closePath()
}

function drawWave(
  canvas: HTMLCanvasElement,
  direction: 'down' | 'up',
  vertFadeRatio: number,
  bumpExp: number,
  peakDepthRatio: number,
  fadeBodyEnd: number,
  fadeOutStop: number,
) {
  const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (cssW === 0 || cssH === 0) return

  canvas.width  = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(dpr, dpr)

  const W = cssW
  const H = cssH

  const peakDepth = H * peakDepthRatio

  ctx.clearRect(0, 0, W, H)

  // ── 1. Draw colours clipped to wave path ──────────────────────────────────
  ctx.save()
  buildLensPath(ctx, W, H, direction, peakDepth, bumpExp)
  ctx.clip()

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  // Reference positions for glows
  const peak   = direction === 'down' ? peakDepth * 0.80 : H - peakDepth * 0.80
  const corner = direction === 'down' ? peakDepth * 0.38 : H - peakDepth * 0.38

  // Cyan — centre belly
  const cyan = ctx.createRadialGradient(W * 0.5, peak, 0, W * 0.5, peak, W * 0.42)
  cyan.addColorStop(0,   'rgba(41,188,255,0.46)')
  cyan.addColorStop(0.3, 'rgba(0,174,239,0.28)')
  cyan.addColorStop(1,   'rgba(0,174,239,0)')
  ctx.fillStyle = cyan
  ctx.fillRect(0, 0, W, H)

  // Deep blue arc
  const deep = ctx.createRadialGradient(W * 0.5, peak, 0, W * 0.5, peak, W * 0.56)
  deep.addColorStop(0, 'rgba(0,80,200,0.44)')
  deep.addColorStop(1, 'rgba(0,80,200,0)')
  ctx.fillStyle = deep
  ctx.fillRect(0, 0, W, H)

  // Gold — left shoulder
  const gL = ctx.createRadialGradient(W * 0.18, corner, 0, W * 0.18, corner, W * 0.19)
  gL.addColorStop(0,   'rgba(255,213,79,0.38)')
  gL.addColorStop(0.5, 'rgba(255,193,7,0.54)')
  gL.addColorStop(1,   'rgba(255,193,7,0)')
  ctx.fillStyle = gL
  ctx.fillRect(0, 0, W, H)

  // Gold — right shoulder
  const gR = ctx.createRadialGradient(W * 0.82, corner, 0, W * 0.82, corner, W * 0.19)
  gR.addColorStop(0,   'rgba(255,213,79,0.38)')
  gR.addColorStop(0.5, 'rgba(255,193,7,0.54)')
  gR.addColorStop(1,   'rgba(255,193,7,0)')
  ctx.fillStyle = gR
  ctx.fillRect(0, 0, W, H)

  ctx.restore()

  // ── 2. Per-pixel alpha mask: follows the exact curve boundary ─────────────
  //
  //  For every column x we compute where the outer curve is, then fade
  //  EACH pixel individually:
  //    • flat edge fade-in  : 0 → 1 over vertFadeRatio of the outer height
  //    • opaque body        : from vertFade to fadeBodyEnd of the outer height
  //    • outer edge fade-out: fadeBodyEnd → 0 at the exact outer boundary
  //
  //  This gives a smooth dissolve that tracks the cosine curve shape perfectly.

  const cW   = canvas.width   // physical pixels (after dpr scale)
  const cH   = canvas.height
  const img  = ctx.getImageData(0, 0, cW, cH)
  const data = img.data

  for (let cx = 0; cx < cW; cx++) {
    // Cosine-bump height at this column (in physical pixels)
    const t    = cx / cW
    const c    = (1 - Math.cos(t * 2 * Math.PI)) / 2
    const bump = Math.pow(c, bumpExp)
    const outerPx = bump * peakDepthRatio * cH  // outer boundary in physical px from flat edge

    // Fade zones in physical pixels from the flat edge
    const fadeInEnd  = vertFadeRatio * outerPx          // end of flat-edge fade-in
    const fadeOutStart = fadeBodyEnd * outerPx           // start of outer-edge fade-out

    for (let cy = 0; cy < cH; cy++) {
      // Distance from the flat edge (direction-aware)
      const dist = direction === 'down' ? cy : (cH - 1 - cy)

      let alpha = 1.0

      // Flat-edge fade-in (transparent → opaque)
      if (dist < fadeInEnd) {
        alpha = fadeInEnd > 0 ? dist / fadeInEnd : 1
      }

      // Outer-edge fade-out (opaque → transparent following the curve)
      if (dist >= fadeOutStart) {
        const range = Math.max(1, outerPx - fadeOutStart)
        alpha *= Math.max(0, 1 - (dist - fadeOutStart) / range)
      }

      // Beyond the outer boundary → fully transparent
      if (dist >= outerPx) alpha = 0

      const idx = (cy * cW + cx) * 4
      data[idx + 3] = Math.round(data[idx + 3] * alpha)
    }
  }

  ctx.putImageData(img, 0, 0)
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

export function FluidCurveScrollImg({
  scrollProgress,
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
  vertFade       = 22,
  bumpExponent   = 2,
  peakDepthRatio = 0.92,
  fadeBodyEnd    = 0.52,
  fadeOutStop    = 0.76,
}: FluidCurveScrollImgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const smooth = useSpring(scrollProgress, spring)

  const gate = useSpring(enabled ? 1 : 0, gateSpring)
  useEffect(() => { gate.set(enabled ? 1 : 0) }, [enabled, gate])

  const scaleY = useTransform([smooth, gate] as MotionValue[], ([t, g]: number[]) => {
    const [start, peak, end] = inputRange
    const bell = bellOverRange(t, start, peak, end, sharpness, peakGain)
    return minScaleY + (maxScaleY - minScaleY) * bell * g
  })

  const opacityValue = useTransform([smooth, gate] as MotionValue[], ([t, g]: number[]) => {
    const [start, peak, end] = inputRange
    return bellOverRange(t, start, peak, end, 1.0, 1.0) * g
  })
  const opacity = fade ? opacityValue : undefined

  const vFadeRatio = Math.max(0, Math.min(1, vertFade / 100))

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawWave(canvas, direction, vFadeRatio, bumpExponent, peakDepthRatio, fadeBodyEnd, fadeOutStop)
  }, [direction, vFadeRatio, bumpExponent, peakDepthRatio, fadeBodyEnd, fadeOutStop])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    redraw()
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  const originY = direction === 'up' ? '100%' : '0%'
  const bleed   = Math.max(0, edgeBleedVW)
  const width   = `calc(100vw + ${bleed * 2}vw)`

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
        top:    direction === 'down' ? 0 : 'auto',
        bottom: direction === 'up'   ? 0 : 'auto',
        opacity,
        willChange: 'transform, opacity',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </motion.div>
  )
}
