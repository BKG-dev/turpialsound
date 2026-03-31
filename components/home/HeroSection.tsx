'use client'

import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ParticleCanvas } from '@/components/fx/ParticleCanvas'
import { AudioVisualizerWaterfall3D } from '@/components/media/AudioVisualizerWaterfall3D'

const LINE1 = 'TURPIAL'
const LINE2 = 'SOUND'

/**
 * Per-character transition for LINE1 (TURPIAL).
 * Right-to-left stagger: 'L' enters first, 'T' enters last.
 */
function line1Transition(charIndex: number) {
  const fromRight = LINE1.length - 1 - charIndex
  const delay = fromRight * 0.065
  const duration = Math.max(0.14, 0.44 - fromRight * 0.02)
  return { delay, duration, ease: [0.16, 1, 0.3, 1] as const }
}

/**
 * Per-character transition for LINE2 (SOUND).
 * Starts after LINE1 settles (~0.48s), then same right-to-left stagger.
 */
function line2Transition(charIndex: number) {
  const fromRight = LINE2.length - 1 - charIndex
  const delay = 0.48 + fromRight * 0.065
  const duration = Math.max(0.14, 0.44 - fromRight * 0.02)
  return { delay, duration, ease: [0.16, 1, 0.3, 1] as const }
}

interface HeroSectionProps {
  videoSrc?: string
  audioSrc?: string
}

export function HeroSection({
  videoSrc,
  audioSrc = '/audio/turpial-sound-ambient.mp3',
}: HeroSectionProps) {
  const headingControls = useAnimation()

  /**
   * TAREA 3 — Opacity loop:
   * After entrance (~1.9s), wrapper fades 0.8 → 0.2 → 0.8 on a 4s+4s cycle.
   * Maximum opacity in loop = 0.8 (80%). First-load entry reaches 100%.
   */
  useEffect(() => {
    let cancelled = false

    async function runLoop() {
      // Wait for full entrance to settle
      await new Promise<void>((resolve) => setTimeout(resolve, 1_900))
      while (!cancelled) {
        // Fade out → 5% over 4s
        await headingControls.start({
          opacity: 0.05,
          transition: { duration: 4, ease: 'easeInOut' },
        })
        if (cancelled) break
        // HOLD at 5% for 15s
        await new Promise<void>((resolve) => setTimeout(resolve, 15_000))
        if (cancelled) break
        // Fade in → 80% over 4s
        await headingControls.start({
          opacity: 0.8,
          transition: { duration: 4, ease: 'easeInOut' },
        })
        if (cancelled) break
      }
    }

    runLoop().catch(() => {})

    return () => {
      cancelled = true
      headingControls.stop()
    }
  }, [headingControls])

  return (
    <section
      className="relative flex min-h-screen min-h-[100dvh] items-center overflow-hidden -mt-16 pt-0"
      aria-label="Hero principal"
    >
      {/* ── Video background ───────────────────────────────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        className="absolute inset-0 h-full w-full object-cover object-center opacity-60"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        preload="none"
      >
        {videoSrc && (
          <source
            src={videoSrc}
            type={videoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4'}
          />
        )}
      </video>

      {/* ── Dark overlay gradient ──────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'linear-gradient(to bottom, rgba(10,10,10,0.32) 0%, rgba(10,10,10,0.14) 50%, rgba(10,10,10,0.62) 100%)',
            'radial-gradient(ellipse 70% 50% at 20% 30%, rgba(0,174,239,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255,193,7,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
        aria-hidden="true"
      />

      {/* ── Bokeh particles ───────────────────────────────────────────── */}
      <ParticleCanvas className="absolute inset-0 h-full w-full" />

      {/* ── Plasma Visualizer — fixed top-right, persists on scroll ─────── */}
      <AudioVisualizerWaterfall3D src={audioSrc} />

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="container-base relative z-10 py-32">
        <div className="max-w-[900px]">

          {/* Eyebrow */}
          <motion.div
            className="mb-8 flex items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.3em] uppercase text-gradient-animated">
              Caracas, Venezuela · Desde 2015
            </span>
          </motion.div>

          {/* ── HEADING + SUBTITLE wrapped in opacity-loop controller ─── */}
          <motion.div animate={headingControls} initial={{ opacity: 1 }}>

            {/* ── TÍTULO DOS LÍNEAS — stagger secuencial (entra UNA VEZ) ── */}
            <h1
              aria-label="TURPIAL SOUND"
              className="font-display text-text-primary"
              style={{ lineHeight: 1, letterSpacing: '0.02em' }}
            >
              {/* Line 1: TURPIAL */}
              <div
                className="flex"
                style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}
                aria-hidden="true"
              >
                {LINE1.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={line1Transition(i)}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>

              {/* Line 2: SOUND */}
              <div
                className="flex"
                style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}
                aria-hidden="true"
              >
                {LINE2.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={line2Transition(i)}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            </h1>

            {/* Subtitle — enters after SOUND settles */}
            <motion.p
              className="mt-8 max-w-[580px] text-body-lg text-text-secondary"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Donde el criterio técnico hace la diferencia. Hub premium de ensayo,
              grabación y producción musical.
            </motion.p>

          </motion.div>

          {/* CTAs — static, outside the opacity loop */}
          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button as="link" href="/contacto" variant="primary" size="lg">
              Reservar ahora
            </Button>
            <Button as="link" href="/servicios" variant="glow-cyan" size="lg">
              Ver servicios
            </Button>
          </motion.div>
        </div>
      </div>

      {/* ── Scroll indicator — visible at 0.4s ────────────────────────── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-muted"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        aria-hidden="true"
      >
        <span className="font-display text-[10px] tracking-[0.25em] uppercase">Scroll</span>
        <motion.span
          className="block h-6 w-px bg-gradient-to-b from-accent-cyan/60 to-transparent"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'top' }}
        />
      </motion.div>
    </section>
  )
}
