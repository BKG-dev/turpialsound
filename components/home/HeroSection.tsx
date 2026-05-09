'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// useLayoutEffect on client, useEffect on server — avoids SSR warning while
// preserving synchronous cleanup before DOM removal on the client.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
import { motion, useAnimation } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  AudioVisualizerFrequency,
  type AudioVisualizerHandle,
} from '@/components/media/AudioVisualizerFrequency'

const LINE1 = 'TURPIAL'
const LINE2 = 'SOUND'

/* Texto del botón partido en chars para stagger — igual que AnimatedLogo del navbar */
const BTN_CHARS = 'VIVE LA EXPERIENCIA!'.split('')

/* Colores del gradiente animado (misma paleta que text-gradient-animated en globals.css) */
const GRAD_COLORS = ['#00aeef', '#0050c8', '#0068e0', '#00aeef', '#ffc107', '#00aeef'] as const

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
  const videoRef  = useRef<HTMLVideoElement>(null)
  const vizRef    = useRef<AudioVisualizerHandle>(null)
  const ctaRef    = useRef<HTMLDivElement>(null)

  const [isMobile,  setIsMobile]  = useState(false)
  const [vizActive, setVizActive] = useState(false)
  const [canvasH,   setCanvasH]   = useState(150)

  // Detect mobile — no heavy effects on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* canvasH se mide UNA SOLA VEZ en onAnimationComplete del div de CTAs
     (posición final tras la animación de entrada, con el borde inferior del botón
     "Reservar ahora" ya asentado). Ese valor es permanente para toda la sesión. */

  // Video lifecycle — useIsomorphicLayoutEffect is critical here.
  //
  // useLayoutEffect cleanup runs SYNCHRONOUSLY during React's commit mutation
  // phase, BEFORE React removes the <video> DOM node. At that moment
  // videoRef.current is still valid and the element is still attached.
  //
  // useEffect cleanup runs AFTER React removes the DOM node (asynchronously,
  // post-paint). By then Chrome has already performed its synchronous
  // GPU/decode-pipeline teardown — cleanup is too late to prevent the freeze.
  //
  // Cleanup sequence: pause → src='' → load()
  //   pause()  stops playback so the pipeline is idle.
  //   src=''   aborts any in-flight network fetch immediately.
  //   load()   runs the media-element load algorithm against an empty src,
  //            which reaches HAVE_NOTHING in microseconds — no buffer to flush.
  //   The 10-12 s block the original comment warned about only occurs when
  //   load() is called while the video is still actively playing/downloading.
  //
  // Explicit vid.src = videoSrc in setup restores the src after Strict Mode
  // cleanup, because React skips the DOM update when the prop value is unchanged.
  useIsomorphicLayoutEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (videoSrc) vid.src = videoSrc
    void vid.play().catch(() => {})
    return () => {
      vid.pause()
      vid.src = ''
      // No load() — calling load() synchronously in a layout effect blocks the
      // main thread 10-12 s on large WebM files → Chrome kills the tab (HUNG).
    }
  }, [videoSrc])

  /**
   * Heading opacity loop — spec:
   *   1. Letters enter at 100% (entrance animation above handles this).
   *   2. After entrance settles (~1.9 s), fade to 5% over 4 s.
   *   3. Loop while page is visible:
   *        hold  5%  ── 15 s  (native setTimeout — guaranteed, not optimised away)
   *        fade to 80% ── 4 s   (never returns to 100%)
   *        fade to  5% ── 4 s
   *        → repeat
   *
   * Why setTimeout for the hold:
   *   Framer Motion can short-circuit keyframe segments where start === end
   *   (same-value optimisation), making the 15 s hold unreliable. A native
   *   setTimeout is the only guarantee.
   *
   * Cancellation via `era` stamp:
   *   Every callback checks that its era still matches the current one.
   *   Incrementing era (on hide / unmount) silently kills any in-flight chain
   *   — no need to track individual promise references.
   */
  useEffect(() => {
    let alive = true
    let era   = 0
    let holdId: ReturnType<typeof setTimeout> | null = null

    const clearHold = () => {
      if (holdId !== null) { clearTimeout(holdId); holdId = null }
    }

    // One tick: fade-in 80% → fade-out 5% → schedule next hold
    const tick = (e: number) => {
      if (!alive || e !== era) return
      headingControls
        .start({ opacity: 0.8, transition: { duration: 4, ease: 'easeInOut' } })
        .then(() => {
          if (!alive || e !== era) return
          headingControls
            .start({ opacity: 0.05, transition: { duration: 4, ease: 'easeInOut' } })
            .then(() => {
              if (!alive || e !== era) return
              holdId = setTimeout(() => { holdId = null; tick(e) }, 15_000)
            })
        })
    }

    // Bump era, cancel pending hold, wait 15 s then tick
    const startLoop = () => {
      era++
      clearHold()
      const e = era
      holdId = setTimeout(() => { holdId = null; tick(e) }, 15_000)
    }

    // Initial: after letter entrance, fade to 5%, then enter loop
    const e0 = era
    headingControls
      .start({ opacity: 0.05, transition: { delay: 1.9, duration: 4, ease: 'easeInOut' } })
      .then(() => { if (alive && era === e0) startLoop() })

    // Stop when tab is hidden; resume when visible again
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        era++           // invalidates any running chain
        clearHold()
        headingControls.stop()
      } else if (alive) {
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      era++
      clearHold()
      headingControls.stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [headingControls])

  return (
    <section
      className="relative flex min-h-screen min-h-[100dvh] snap-start items-center overflow-hidden -mt-16 pt-0"
      aria-label="Hero principal"
    >
      {/* ── Video background ───────────────────────────────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      {/* src directly on <video> (not via <source>) so cleanup can clear vid.src='' */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-60"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        preload="auto"
      />

      {/* ── Dark overlay gradient ──────────────────────────────────────── */}
      {/* Cyan radial moved to 68% vertical to avoid colliding with text block */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'linear-gradient(to bottom, rgba(10,10,10,0.32) 0%, rgba(10,10,10,0.14) 50%, rgba(10,10,10,0.62) 100%)',
            'radial-gradient(ellipse 70% 50% at 20% 68%, rgba(0,174,239,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 60% 40% at 80% 70%, rgba(255,193,7,0.06) 0%, transparent 60%)',
          ].join(', '),
        }}
        aria-hidden="true"
      />

      {/* ── Bokeh particles — skipped on mobile ───────────────────────── */}
      {/* {!isMobile && <ParticleCanvas className="absolute inset-0 h-full w-full" />} */}

      {/* ── Plasma Visualizer — skipped on mobile ───────────────────────── */}
      {!isMobile && (
        <AudioVisualizerFrequency
          ref={vizRef}
          src={audioSrc}
          canvasHeight={canvasH}
          onActiveChange={setVizActive}
        />
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      {/* pl-[6.5rem] = left-6(24) + pl-5(20) + logo(52) + gap-2(8) = 104px → alinea con "T" del navbar */}
      <div className="relative z-10 py-32 w-full pl-6 sm:pl-[6.5rem] pr-6">

        {/* ── Botón play — mismo nivel visual que eyebrow, justificado a la derecha ── */}
        {!isMobile && (
          <button
            onClick={() => vizRef.current?.toggle()}
            className="absolute top-32 right-6 hidden sm:flex items-center gap-2 cursor-pointer"
            style={{
              zIndex:       51,
              border:       'none',
              padding:      '4px 10px',
              borderRadius: '6px',
              /* Glow detrás del texto: fondo radial + box-shadow ambiente */
              background:   'radial-gradient(ellipse 130% 160% at 50% 60%, rgba(0,174,239,0.11) 0%, transparent 72%)',
              boxShadow:    '0 0 18px rgba(0,174,239,0.28), 0 0 6px rgba(0,174,239,0.14)',
            }}
            aria-label={vizActive ? 'Pausar visualizador de audio' : 'Reproducir visualizador de audio'}
          >
            {/* Texto — misma estética que el eyebrow: Michroma, gradient animado, uppercase tracking */}
            <span
              className="text-gradient-animated font-display text-xs tracking-[0.3em] uppercase select-none flex"
              aria-hidden="true"
            >
              {BTN_CHARS.map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay:    0.25 + i * 0.032,
                    duration: 0.38,
                    ease:     [0.16, 1, 0.3, 1],
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </span>

            {/* Icono — color animado en la misma paleta cyan/gold del gradiente */}
            <motion.span
              initial={{ opacity: 0, x: 14 }}
              animate={{
                opacity: 1,
                x: 0,
                color: GRAD_COLORS as unknown as string,
              }}
              transition={{
                opacity: { delay: 0.25 + BTN_CHARS.length * 0.032, duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                x:       { delay: 0.25 + BTN_CHARS.length * 0.032, duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                color:   { delay: 0.9, duration: 5, ease: 'easeInOut', repeat: Infinity },
              }}
              className="flex items-center"
            >
              {vizActive ? <Pause size={12} /> : <Play size={12} />}
            </motion.span>
          </button>
        )}

        {/* Text anchor gradient — applied directly as background on the text block */}
        <div
          className="max-w-[900px]"
          style={{
            borderRadius: '0.5rem',
            padding: '1rem 2rem 1rem 0',
            marginLeft: '-0.5rem',
          }}
        >

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
              className="mt-8 max-w-[580px] text-body-lg"
              style={{
                color: '#F5F5F5',
                fontWeight: 500,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
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
            ref={ctaRef}
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              /* Medición única — canvasH es permanente para la sesión */
              if (canvasH > 0 || !ctaRef.current) return
              const rect = ctaRef.current.getBoundingClientRect()
              setCanvasH(Math.max(40, Math.round(window.innerHeight - rect.bottom - 5)))
            }}
          >
            <Button as="link" href="/reservas" variant="primary" size="lg">
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
