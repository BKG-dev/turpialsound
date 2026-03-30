'use client'

/**
 * AudioVisualizerFrequency
 *
 * Visualizador de espectro 3D inspirado en Winamp OpenGL v0.1A by mcbain.
 *
 * Estructura visual:
 *  • 128 barras (cubic rectangles) dispuestas en círculo con proyección oblicua
 *    que simula una vista desde ~30° sobre el plano horizontal.
 *  • La estructura completa rota suavemente sobre su eje.
 *  • Bass (bins 0–31)   → degradado cian eléctrico → turquesa profundo
 *  • Treble (bins 32+)  → ámbar → oro brillante
 *  • 3 passes de renderizado: outer glow (blur 5px), mid (blur 2px), core nítido
 *  • Fondo de metal oscuro cepillado (scanlines + radial gradient)
 *  • Texto "WINAMP OPENGL V0.1A BY MCBAIN" grabado tenuemente
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

interface Props { src: string }

const N_BARS  = 128
const INNER_R = 44
const MAX_BAR = 70
const PERSP   = 0.44   // compresión Y para efecto de perspectiva oblicua

/* Devuelve [r, g, b] según el bin de frecuencia */
function barRgb(binIdx: number): [number, number, number] {
  if (binIdx < 32) {
    const t = binIdx / 32
    return [0, Math.round(200 - t * 50), Math.round(255 - t * 70)]
  }
  const t = Math.min(1, (binIdx - 32) / 96)
  return [255, Math.round(180 - t * 80), 0]
}

export function AudioVisualizerFrequency({ src }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const audioRef    = useRef<HTMLAudioElement>(null)
  const actxRef     = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number>(0)
  const [playing, setPlaying] = useState(false)

  /* ─── AudioContext — diferido al primer gesto ────────────────────────── */
  function initCtx() {
    if (actxRef.current) return
    const audio = audioRef.current
    if (!audio) return
    const actx    = new AudioContext()
    const source  = actx.createMediaElementSource(audio)
    const analyser = actx.createAnalyser()
    analyser.fftSize              = 512   // 256 bins
    analyser.smoothingTimeConstant = 0.82
    source.connect(analyser)
    analyser.connect(actx.destination)
    actxRef.current   = actx
    analyserRef.current = analyser
  }

  /* ─── Estado idle: fondo + anillo plano + texto ───────────────────────── */
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2 + 15

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.72)
    bg.addColorStop(0, 'rgba(14,14,18,1)')
    bg.addColorStop(1, 'rgba(4,4,8,1)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Scanlines
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.008)'
      ctx.fillRect(0, y, W, 1)
    }

    // Anillo idle tenue
    ctx.save()
    ctx.strokeStyle = 'rgba(0,174,239,0.10)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(cx, cy, INNER_R, INNER_R * PERSP, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Header text
    ctx.save()
    ctx.font = '6px monospace'
    ctx.fillStyle = 'rgba(0,174,239,0.14)'
    ctx.textAlign = 'center'
    ctx.fillText('WINAMP OPENGL V0.1A BY MCBAIN', cx, 13)
    ctx.restore()
  }, [])

  /* ─── RAF draw loop ──────────────────────────────────────────────────── */
  const drawFrame = useCallback(() => {
    const canvas   = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    const t  = performance.now() / 1000
    const cx = W / 2, cy = H / 2 + 15

    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const usedBins = Math.min(N_BARS, data.length)

    // Entropía RMS
    let sq = 0
    for (let i = 0; i < usedBins; i++) sq += (data[i] / 255) ** 2
    const entropy = Math.sqrt(sq / usedBins)

    /* ── Fondo metal oscuro ─────────────────────────────────────────────── */
    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.72)
    bg.addColorStop(0, 'rgba(14,14,18,1)')
    bg.addColorStop(1, 'rgba(4,4,8,1)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Scanlines (textura metal cepillado)
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.008)'
      ctx.fillRect(0, y, W, 1)
    }

    /* ── Header text ────────────────────────────────────────────────────── */
    ctx.save()
    ctx.font = '6px monospace'
    ctx.fillStyle = `rgba(0,174,239,${0.13 + entropy * 0.09})`
    ctx.textAlign = 'center'
    ctx.fillText('WINAMP OPENGL V0.1A BY MCBAIN', cx, 13)
    ctx.restore()

    /* ── Rotación de la estructura ──────────────────────────────────────── */
    const rot   = t * 0.25
    const dPhi  = Math.PI / N_BARS * 0.62

    /* ── Centro glowing ─────────────────────────────────────────────────── */
    ctx.save()
    ctx.filter = `blur(${6 + entropy * 8}px)`
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, INNER_R)
    cg.addColorStop(0, `rgba(0,174,239,${0.22 + entropy * 0.28})`)
    cg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.ellipse(cx, cy, INNER_R, INNER_R * PERSP, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = 'none'
    ctx.restore()

    /* Helper: traza el quad de una barra ─────────────────────────────────── */
    function drawBar(i: number) {
      const angle  = (i / N_BARS) * Math.PI * 2 + rot
      const binIdx = Math.floor((i / N_BARS) * usedBins)
      const e      = data[binIdx] / 255
      const barLen = e * MAX_BAR
      if (barLen < 0.8) return false
      const inner = INNER_R
      const outer = INNER_R + barLen
      ctx.beginPath()
      ctx.moveTo(cx + inner * Math.cos(angle - dPhi), cy + inner * Math.sin(angle - dPhi) * PERSP)
      ctx.lineTo(cx + outer * Math.cos(angle - dPhi), cy + outer * Math.sin(angle - dPhi) * PERSP)
      ctx.lineTo(cx + outer * Math.cos(angle + dPhi), cy + outer * Math.sin(angle + dPhi) * PERSP)
      ctx.lineTo(cx + inner * Math.cos(angle + dPhi), cy + inner * Math.sin(angle + dPhi) * PERSP)
      ctx.closePath()
      return true
    }

    /* ── Pass 0: outer glow (blur grueso, baja alpha) ────────────────────── */
    ctx.save()
    ctx.filter = 'blur(5px)'
    for (let i = 0; i < N_BARS; i++) {
      const binIdx = Math.floor((i / N_BARS) * usedBins)
      const [r, g, b] = barRgb(binIdx)
      ctx.fillStyle = `rgba(${r},${g},${b},${0.14 + entropy * 0.10})`
      if (drawBar(i)) ctx.fill()
    }
    ctx.filter = 'none'
    ctx.restore()

    /* ── Pass 1: mid glow (blur leve, alpha media) ───────────────────────── */
    ctx.save()
    ctx.filter = 'blur(2px)'
    for (let i = 0; i < N_BARS; i++) {
      const binIdx = Math.floor((i / N_BARS) * usedBins)
      const [r, g, b] = barRgb(binIdx)
      ctx.fillStyle = `rgba(${r},${g},${b},${0.38 + entropy * 0.18})`
      if (drawBar(i)) ctx.fill()
    }
    ctx.filter = 'none'
    ctx.restore()

    /* ── Pass 2: core nítido (sin blur, alpha alta) ───────────────────────── */
    ctx.save()
    for (let i = 0; i < N_BARS; i++) {
      const binIdx = Math.floor((i / N_BARS) * usedBins)
      const [r, g, b] = barRgb(binIdx)
      ctx.fillStyle = `rgba(${r},${g},${b},${0.68 + entropy * 0.28})`
      if (drawBar(i)) ctx.fill()
    }
    ctx.restore()

    /* ── Aura exterior pulsante ──────────────────────────────────────────── */
    ctx.save()
    ctx.filter = `blur(${4 + entropy * 7}px)`
    ctx.strokeStyle = `rgba(0,174,239,${0.09 + entropy * 0.13})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, INNER_R + MAX_BAR * 0.55, (INNER_R + MAX_BAR * 0.55) * PERSP, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.filter = 'none'
    ctx.restore()

    rafRef.current = requestAnimationFrame(drawFrame)
  }, [])

  /* ─── Toggle play/pause ─────────────────────────────────────────────── */
  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    initCtx()
    if (actxRef.current?.state === 'suspended') actxRef.current.resume().catch(() => {})

    if (playing) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      drawIdle()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      drawFrame()
      setPlaying(true)
    }
  }

  /* ─── Lifecycle ─────────────────────────────────────────────────────── */
  useEffect(() => {
    drawIdle()
    return () => {
      cancelAnimationFrame(rafRef.current)
      actxRef.current?.close().catch(() => {})
    }
  }, [drawIdle])

  /* ─── UI ─────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col items-end gap-2">

      {/* Canvas espectro */}
      <div className="relative overflow-hidden rounded-lg border border-accent-cyan/15 shadow-glow-cyan-sm">
        <canvas
          ref={canvasRef}
          width={240}
          height={200}
          className="block"
          aria-hidden="true"
        />
      </div>

      {/* Play / Pause */}
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
        aria-label={playing ? 'Pausar visualizador' : 'Reproducir visualizador'}
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
        {playing ? 'Pause' : 'Play'}
      </button>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop preload="none" src={src} />
    </div>
  )
}
