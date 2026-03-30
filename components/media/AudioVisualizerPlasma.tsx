'use client'

/**
 * AudioVisualizerPlasma
 *
 * Renders a horizontal plasma / electric-discharge wire that reacts in real time
 * to an audio file via Web Audio API (AnalyserNode / Fourier FFT).
 *
 * Energy mapping
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Bins  0–31  (low freq / bass)   → gold #FFC107, amber #FF7800, orange
 *  • Bins 32–127 (high freq / treble) → cyan #00AEEF, electric blue, purple
 *
 * Rendering passes (per frame)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Pass 1 — outer glow : thick stroke + ctx.filter blur(5px) + low alpha
 *  Pass 2 — mid glow   : medium stroke + blur(2px) + medium alpha
 *  Pass 3 — bright core: thin stroke + no blur + full alpha
 *  Sparks              : arc dots at high-entropy moments with shadowBlur
 *
 * Entropy (RMS energy) drives amplitude, speed, glow intensity and spark rate.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

interface Props {
  src: string
}

export function AudioVisualizerPlasma({ src }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const audioRef   = useRef<HTMLAudioElement>(null)
  const actxRef    = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef     = useRef<number>(0)
  const [playing, setPlaying] = useState(false)

  /* ─── AudioContext init — deferred to first user gesture ─────────────── */
  function initCtx() {
    if (actxRef.current) return
    const audio = audioRef.current
    if (!audio) return
    const actx = new AudioContext()
    const source = actx.createMediaElementSource(audio)
    const analyser = actx.createAnalyser()
    analyser.fftSize = 2048               // 1024 bins, high resolution
    analyser.smoothingTimeConstant = 0.78 // smooth but responsive
    source.connect(analyser)
    analyser.connect(actx.destination)
    actxRef.current  = actx
    analyserRef.current = analyser
  }

  /* ─── RAF draw loop ─────────────────────────────────────────────────── */
  const drawFrame = useCallback(() => {
    const canvas   = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const t = performance.now() / 1000   // seconds, for time-based drift

    /* ── FFT data ─────────────────────────────────────────────────── */
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)

    /* ── Energy analysis ────────────────────────────────────────────
     *  entropy  — RMS of used bins → global intensity 0..1
     *  lowEnergy  — bass (bins 0–31)  → gold/amber presence
     *  highEnergy — treble (32–127)   → cyan/purple presence
     */
    const usedBins = Math.min(256, data.length)
    let sumSq = 0
    for (let i = 0; i < usedBins; i++) sumSq += (data[i] / 255) ** 2
    const entropy = Math.sqrt(sumSq / usedBins)          // 0..1 RMS

    let lowSum = 0
    for (let i = 0; i < 32; i++) lowSum += data[i] / 255
    const lowEnergy = Math.min(1, (lowSum / 32) * 1.6)

    let highSum = 0
    for (let i = 32; i < 128; i++) highSum += data[i] / 255
    const highEnergy = Math.min(1, (highSum / 96) * 2.2)

    /* ── Wire control points ────────────────────────────────────────
     *  N segments, each driven by:
     *   • time-based multi-harmonic drift  (slow plasma oscillation)
     *   • FFT bin perturbation             (reactive to audio content)
     */
    const N = 80
    const amplitude = 8 + entropy * 22 + lowEnergy * 10

    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < N; i++) {
      const x      = (i / (N - 1)) * W
      const binIdx = Math.floor((i / N) * 64)
      const binE   = data[binIdx] / 255

      const drift =
        Math.sin(t * 1.1  + i * 0.42) * (3   + entropy   * 7) +
        Math.sin(t * 2.7  + i * 0.85) * (1.5 + highEnergy * 5) +
        Math.sin(t * 0.65 + i * 0.20) * (2   + lowEnergy  * 4)

      pts.push({ x, y: H / 2 + drift + (binE - 0.5) * amplitude * 2 })
    }

    /* ── Draw helpers — ctx typed explicitly to preserve narrowing ──── */
    function buildPath(c: CanvasRenderingContext2D) {
      c.beginPath()
      c.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < N - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      c.lineTo(pts[N - 1].x, pts[N - 1].y)
    }

    /* Gold (left/bass) → Amber → Cyan (centre) → Blue → Purple (right/treble) */
    function makeGradient(c: CanvasRenderingContext2D, alpha: number): CanvasGradient {
      const g = c.createLinearGradient(0, 0, W, 0)
      g.addColorStop(0.00, `rgba(255, 193,   7, ${alpha * (0.55 + lowEnergy  * 0.45)})`)
      g.addColorStop(0.28, `rgba(255, 120,   0, ${alpha * (0.50 + entropy    * 0.50)})`)
      g.addColorStop(0.55, `rgba(  0, 174, 239, ${alpha * (0.55 + highEnergy * 0.45)})`)
      g.addColorStop(0.78, `rgba( 80, 110, 255, ${alpha * (0.45 + highEnergy * 0.55)})`)
      g.addColorStop(1.00, `rgba(139,  92, 246, ${alpha * (0.35 + highEnergy * 0.65)})`)
      return g
    }

    /* ── Clear ──────────────────────────────────────────────────────── */
    ctx.clearRect(0, 0, W, H)

    /* ── Pass 1: outer glow ─────────────────────────────────────────── */
    ctx.save()
    ctx.filter = 'blur(5px)'
    buildPath(ctx)
    ctx.strokeStyle = makeGradient(ctx, 0.20 + entropy * 0.14)
    ctx.lineWidth   = 7 + entropy * 9
    ctx.lineCap     = 'round'
    ctx.stroke()
    ctx.filter = 'none'
    ctx.restore()

    /* ── Pass 2: mid glow ───────────────────────────────────────────── */
    ctx.save()
    ctx.filter = 'blur(2px)'
    buildPath(ctx)
    ctx.strokeStyle = makeGradient(ctx, 0.48 + entropy * 0.22)
    ctx.lineWidth   = 2.5 + entropy * 3.5
    ctx.lineCap     = 'round'
    ctx.stroke()
    ctx.filter = 'none'
    ctx.restore()

    /* ── Pass 3: bright core ────────────────────────────────────────── */
    ctx.save()
    buildPath(ctx)
    ctx.strokeStyle = makeGradient(ctx, 0.88 + entropy * 0.12)
    ctx.lineWidth   = 1.0 + entropy * 1.2
    ctx.lineCap     = 'round'
    ctx.stroke()
    ctx.restore()

    /* ── Sparks (high entropy moments) ──────────────────────────────── */
    if (entropy > 0.28) {
      const sparkCount = Math.floor(entropy * 5)
      for (let s = 0; s < sparkCount; s++) {
        const si = Math.floor(Math.random() * N)
        const sp = pts[si]
        if (!sp) continue
        const prog       = si / (N - 1)
        const sparkAlpha = 0.5 + Math.random() * 0.5
        const color      = prog < 0.45
          ? `rgba(255, 200, 60, ${sparkAlpha})`
          : `rgba(0, 210, 255, ${sparkAlpha})`

        ctx.save()
        ctx.filter         = 'blur(1px)'
        ctx.shadowBlur     = 10 + entropy * 14
        ctx.shadowColor    = color
        ctx.fillStyle      = color
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, 1.2 + Math.random() * 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.filter = 'none'
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(drawFrame)
  }, [])

  /* ─── Play / pause toggle ───────────────────────────────────────────── */
  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    initCtx()
    const actx = actxRef.current
    if (actx?.state === 'suspended') actx.resume().catch(() => {})

    if (playing) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      const c = canvasRef.current
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      drawFrame()
      setPlaying(true)
    }
  }

  /* ─── Cleanup ───────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      actxRef.current?.close().catch(() => {})
    }
  }, [])

  /* ─── UI ────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed top-20 right-6 z-40 flex flex-col items-end gap-2">

      {/* Plasma canvas */}
      <div className="relative overflow-hidden rounded-lg glass-surface border border-accent-cyan/20 p-2">
        <canvas
          ref={canvasRef}
          width={200}
          height={56}
          className="block"
          aria-hidden="true"
        />
        {/* Idle flat line shown when audio is paused */}
        {!playing && (
          <div
            className="pointer-events-none absolute inset-2 flex items-center"
            aria-hidden="true"
          >
            <div
              className="h-px w-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,193,7,0.25) 0%, rgba(0,174,239,0.25) 100%)',
              }}
            />
          </div>
        )}
      </div>

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={[
          'flex items-center gap-1.5 rounded-full px-3 py-1.5',
          'glass-surface border font-display text-[9px] tracking-widest uppercase',
          'transition-all duration-300',
          playing
            ? 'border-accent-gold/50 text-accent-gold hover:border-accent-gold/80'
            : 'border-accent-cyan/30 text-accent-cyan hover:border-accent-cyan/70',
        ].join(' ')}
        aria-label={playing ? 'Pausar visualizador' : 'Reproducir audio ambiente'}
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
        {playing ? 'Pause' : 'Play'}
      </button>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop preload="none" src={src} />
    </div>
  )
}
