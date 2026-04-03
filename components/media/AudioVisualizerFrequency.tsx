'use client'

/**
 * AudioVisualizerFrequency — Canvas 2D, barras verticales desde borde inferior
 *
 * Distribución en montaña (bell curve): barras del centro más altas, extremos más bajas.
 * Altura máxima fija: pasada como `canvasHeight` desde HeroSection, calculada una sola vez
 * al cargar la página (borde inferior del CTA "Reservar ahora" − 5 px).
 *
 * Idle:   barras en cero, caps en borde inferior con gradiente animado.
 * Activo: responde al audio en tiempo real.
 * Barras y Caps: gradiente horizontal animado (cyan→blue→gold→blue→cyan, ciclo 5 s, siempre →).
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

interface Props {
  src: string
  /** Altura CSS del strip en px — fijada una vez en HeroSection al cargar la página */
  canvasHeight?: number
  onActiveChange?: (active: boolean) => void
}

export interface AudioVisualizerHandle {
  toggle: () => void
}

/* ── Constantes ──────────────────────────────────────────────────────────── */
const N              = 45
const GAP_H          = 3
const FPS            = 30
const STOP           = 90_000   // 90 s activo → auto-idle
const BELL_SIGMA     = 0.70
const GRAD_CYCLE     = 5_000    // duración ciclo gradiente animado
const PULSE_PERIOD   = 1_760    // ms por travesía del pulso idle (−20 %)
const PULSE_PAUSE    = 3_000    // ms de espera entre pulsos

/* ── Segmentos tipo LED ── cambiar a false para volver a barras sólidas ── */
const SEGMENTED = true
const SEG_H     = 1   // alto de cada segmento en CSS px (doble de líneas)
const SEG_GAP   = 1   // hueco entre segmentos en CSS px

/* Bell curve weight para la barra i */
function bell(i: number): number {
  const t = (i / (N - 1)) * 2 - 1
  return Math.exp(-0.5 * (t / BELL_SIGMA) ** 2)
}

/**
 * LUT de 256 colores para barras — precalculada una vez al cargar el módulo.
 * Índice = Math.round(s[i] * 255).  0 → azul,  ~128 → cyan,  255 → gold.
 * Cero allocations en runtime.
 */
const BAR_LUT: string[] = Array.from({ length: 256 }, (_, j) => {
  const r = j / 255
  let R: number, G: number, B: number
  if (r < 0.62) {
    const t = r / 0.62                      // 0 → 1 en la zona azul–cyan
    R = 0
    G = Math.round(80  + 94  * t)           // 80  → 174
    B = Math.round(200 + 39  * t)           // 200 → 239
  } else {
    const t = (r - 0.62) / 0.38            // 0 → 1 en la zona cyan–gold (−15 % amarillo)
    R = Math.round(255 * t)                 // 0   → 255
    G = Math.round(174 + 19  * t)           // 174 → 193
    B = Math.round(239 - 232 * t)           // 239 → 7
  }
  return `rgba(${R},${G},${B},0.45)`
})

/**
 * Gradiente horizontal animado para CAPS — paleta cyan→blue→gold→blue→cyan.
 * gold avanza izq→der. Amarillo reducido 20 %: stops 0.34 / 0.66.
 */
function buildCapGradient(
  ctx: CanvasRenderingContext2D,
  ts: number,
  bufW: number,
): CanvasGradient {
  const t   = (ts % GRAD_CYCLE) / GRAD_CYCLE
  const off = (1 - t) * bufW

  const g = ctx.createLinearGradient(-off, 0, 2 * bufW - off, 0)
  g.addColorStop(0.00, 'rgba(0,174,239,1)')
  g.addColorStop(0.34, 'rgba(0,80,200,1)')
  g.addColorStop(0.50, 'rgba(255,193,7,1)')
  g.addColorStop(0.66, 'rgba(0,80,200,1)')
  g.addColorStop(1.00, 'rgba(0,174,239,1)')
  return g
}


export const AudioVisualizerFrequency = forwardRef<AudioVisualizerHandle, Props>(
  function AudioVisualizerFrequency({ src, canvasHeight = 0, onActiveChange }, ref) {
    const cvRef    = useRef<HTMLCanvasElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const actxRef  = useRef<AudioContext | null>(null)
    const anRef    = useRef<AnalyserNode | null>(null)
    const rafRef   = useRef<number>(0)
    const fpsTs    = useRef(0)
    const dtTs     = useRef(0)

    const freqBuf = useRef(new Uint8Array(128))
    const smooth  = useRef(new Float32Array(N))
    const peaks   = useRef(new Float32Array(N))
    const peakV   = useRef(new Float32Array(N))

    const activeRef     = useRef(false)
    const stopTmr       = useRef<ReturnType<typeof setTimeout> | null>(null)
    const visRef        = useRef(true)
    const barOffscreens = useRef<OffscreenCanvas[]>([])
    const barOffKey     = useRef('')   // "barW,ceiling" — detecta resize

    /* ── AudioContext — reutiliza contexto suspendido si existe ─────────── */
    function initAudio() {
      if (!audioRef.current) return
      if (actxRef.current && actxRef.current.state !== 'closed') return
      try {
        const actx = new AudioContext()
        const node = actx.createMediaElementSource(audioRef.current)
        const an   = actx.createAnalyser()
        an.fftSize               = 256
        an.smoothingTimeConstant = 0.40
        node.connect(an)
        an.connect(actx.destination)
        actxRef.current = actx
        anRef.current   = an
        freqBuf.current = new Uint8Array(an.frequencyBinCount)
      } catch { /* elemento ya conectado */ }
    }

    /* ── Draw ────────────────────────────────────────────────────────────── */
    const draw = useCallback((ts: number) => {
      const cv = cvRef.current
      if (!cv) return
      const ctx = cv.getContext('2d')
      if (!ctx) return

      const dpr  = Math.min(window.devicePixelRatio || 1, 2)
      const bufW = Math.round(cv.clientWidth  * dpr)
      const bufH = Math.round(cv.clientHeight * dpr)
      if (!bufW || !bufH) return
      if (cv.width  !== bufW) cv.width  = bufW
      if (cv.height !== bufH) cv.height = bufH

      const dt = dtTs.current ? Math.min((ts - dtTs.current) / 1000, 0.05) : 0.016
      dtTs.current = ts

      ctx.clearRect(0, 0, bufW, bufH)

      const an = anRef.current
      const on = activeRef.current && !!an

      if (on) an!.getByteFrequencyData(freqBuf.current)

      const s  = smooth.current
      const pk = peaks.current
      const pv = peakV.current
      const fd = freqBuf.current

      const sliceW  = bufW / N
      const barW    = Math.max(1, Math.floor(sliceW - GAP_H * dpr))
      /* Techo: 26.4 % del canvas (+10 % sobre 24 %) */
      const ceiling = Math.round((bufH - Math.ceil(2 * dpr)) * 0.264)

      /* ── OffscreenCanvas: rebuild solo en resize (D) ─────────────────────── */
      if (SEGMENTED && typeof OffscreenCanvas !== 'undefined') {
        const offKey = `${barW},${ceiling}`
        if (barOffKey.current !== offKey) {
          barOffKey.current = offKey
          const pitch = (SEG_H + SEG_GAP) * dpr
          barOffscreens.current = Array.from({ length: N }, (_, i) => {
            const bwi       = bell(i)
            const totalSegs = Math.max(2, Math.floor(bwi * ceiling / pitch))
            const offH      = Math.ceil(totalSegs * pitch)
            const off       = new OffscreenCanvas(barW, offH)
            const octx      = off.getContext('2d')!
            for (let k = 0; k < totalSegs; k++) {
              const segRatio = k / (totalSegs - 1)
              octx.fillStyle = BAR_LUT[Math.min(255, Math.round(segRatio * 255))]
              octx.fillRect(0, offH - Math.ceil((k + 1) * pitch), barW, Math.ceil(SEG_H * dpr))
            }
            return off
          })
        }
      }

      /* Cap: gradiente horizontal animado */
      const capGrad = buildCapGradient(ctx, ts, bufW)
      const capGlow = 'rgba(0,174,239,0.85)'

      for (let i = 0; i < N; i++) {
        const x  = Math.round(i * sliceW + (sliceW - barW) / 2)
        const bw = bell(i)

        let raw: number

        if (on) {
          /* Mapeo logarítmico: concentra barras en freqs bajas/medias donde vive la energía */
          const logBin = Math.pow(i / (N - 1), 1.8) * fd.length * 0.72
          const bin    = Math.min(Math.floor(logBin), fd.length - 1)
          raw = fd[bin] / 255
        } else {
          /* Idle — pulso gaussiano estrecho viajero izq→der, pausa 3 s entre ciclos */
          const cyclePos = ts % (PULSE_PERIOD + PULSE_PAUSE)
          if (cyclePos < PULSE_PERIOD) {
            const t          = cyclePos / PULSE_PERIOD
            const waveCenter = t * (N + 8) - 4
            const waveWidth  = N * 0.0144
            raw = Math.exp(-0.5 * ((i - waveCenter) / waveWidth) ** 2) * 0.90
          } else {
            raw = 0
          }
        }

        /* Lerp — muy rápido en activo para máxima reactividad; más suave en idle para el pulso */
        const kRate = on ? 30 : 12
        s[i] += (raw - s[i]) * (1 - Math.exp(-dt * kRate))

        /* Longitud visual con bell curve; escala al ceiling — sin clipping */
        const barLen = Math.max(1, s[i] * bw * ceiling)

        if (SEGMENTED) {
          /* D: drawImage desde OffscreenCanvas pre-renderizado — 0 allocations en runtime */
          const off = barOffscreens.current[i]
          if (off) {
            const drawH = Math.min(Math.round(barLen), off.height)
            ctx.drawImage(off, 0, off.height - drawH, barW, drawH, x, bufH - drawH, barW, drawH)
          }
        } else {
          const colorIdx = Math.min(255, Math.round(s[i] * 255))
          ctx.fillStyle  = BAR_LUT[colorIdx]
          ctx.fillRect(x, bufH - barLen, barW, barLen)
        }

        /* Peak tracking en unidades raw */
        if (s[i] >= pk[i]) {
          pk[i] = s[i]
          pv[i] = 0
        } else {
          pv[i] = Math.min(pv[i] + dt * 1.6, 2.2)
          pk[i] = Math.max(0, pk[i] - pv[i] * dt)
        }

        /* Cap siempre visible — en cero aparece en borde inferior */
        {
          const capLen = pk[i] * bw * ceiling
          const capY   = Math.round(bufH - capLen)
          const capH   = Math.max(2, Math.round(3.5 * dpr))
          ctx.save()
          ctx.shadowColor   = capGlow
          ctx.shadowBlur    = 20 * dpr
          ctx.shadowOffsetY = -10 * dpr  // proyecta glow hacia arriba (+60 %)
          ctx.fillStyle     = capGrad
          ctx.fillRect(x, capY - capH, barW, capH)
          ctx.restore()
        }
      }
    }, [])

    /* ── Loop RAF con throttle 30 FPS ──────────────────────────────────── */
    const loop = useCallback((ts: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!visRef.current) return
      if (ts - fpsTs.current < 1000 / FPS) return
      fpsTs.current = ts
      draw(ts)
    }, [draw])

    /* ── Deactivar — va a idle ──────────────────────────────────────────── */
    function deactivate() {
      audioRef.current?.pause()
      actxRef.current?.suspend().catch(() => {})
      activeRef.current = false
      onActiveChange?.(false)
      if (stopTmr.current) { clearTimeout(stopTmr.current); stopTmr.current = null }
      peaks.current.fill(0)
      peakV.current.fill(0)
    }

    /* ── Toggle idle ↔ activo ───────────────────────────────────────────── */
    function toggle() {
      if (activeRef.current) {
        deactivate()
        return
      }

      /* Activar */
      initAudio()
      const actx = actxRef.current
      if (actx?.state === 'suspended') actx.resume().catch(() => {})
      audioRef.current?.play().catch(() => {})
      activeRef.current = true
      onActiveChange?.(true)
      peaks.current.fill(0)
      peakV.current.fill(0)

      /* Auto-idle tras 60 s */
      if (stopTmr.current) clearTimeout(stopTmr.current)
      stopTmr.current = setTimeout(() => {
        deactivate()
      }, STOP)

    }

    useImperativeHandle(ref, () => ({ toggle }))

    /* ── Lifecycle ──────────────────────────────────────────────────────── */
    useEffect(() => {
      if (window.matchMedia('(max-width: 768px)').matches) return

      rafRef.current = requestAnimationFrame(loop)

      const observer = new IntersectionObserver(
        ([e]) => { visRef.current = e.isIntersecting },
        { threshold: 0.01 },
      )
      if (cvRef.current) observer.observe(cvRef.current)

      const onVis = () => { visRef.current = document.visibilityState === 'visible' }
      document.addEventListener('visibilitychange', onVis)

      const audio = audioRef.current
      const actx = actxRef.current
      return () => {
        cancelAnimationFrame(rafRef.current)
        observer.disconnect()
        document.removeEventListener('visibilitychange', onVis)
        if (stopTmr.current) clearTimeout(stopTmr.current)
        audio?.pause()
        actx?.suspend().catch(() => {})
      }
    }, [loop])

    /* ── UI ─────────────────────────────────────────────────────────────── */
    return (
      <>
        <div
          onClick={toggle}
          style={{
            position:      'fixed',
            bottom:        0,
            left:          0,
            width:         '100%',
            height:        `${canvasHeight}px`,
            zIndex:        40,
            cursor:        'pointer',
            background:    'transparent',
            pointerEvents: canvasHeight > 0 ? 'auto' : 'none',
          }}
          aria-hidden="true"
        >
          <canvas
            ref={cvRef}
            style={{ display: 'block', width: '100%', height: '100%' }}
            aria-hidden="true"
          />
        </div>

        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} loop preload="none" src={src} />
      </>
    )
  },
)
