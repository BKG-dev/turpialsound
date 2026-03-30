'use client'

/**
 * AudioVisualizerWaterfall3D
 *
 * Replica del "3D Rotating Spectrum Analyzer" estilo Winamp OpenGL.
 * Proyección oblicua manual (canvas 2D) sin dependencias 3D externas.
 *
 * Estructura visual:
 *  • COLS columnas de frecuencia × ROWS filas de historial temporal
 *  • Cada barra es un prisma 3D con cara frontal, superior y lateral derecha
 *  • Color por amplitud: azul→cian→verde→amarillo→rojo
 *  • Datos nuevos entran por el frente; el historial se desplaza al fondo
 *  • Cuadrícula de piso tenue para reforzar la perspectiva
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

interface Props { src: string }

/* ── Dimensiones del canvas ────────────────────────────────────────────── */
const CW = 480
const CH = 300

/* ── Parámetros de la grilla 3D ────────────────────────────────────────── */
const COLS  = 22     // bins de frecuencia visibles
const ROWS  = 30     // frames de historial
const MAX_H = 68     // altura máxima de barra (px, hacia arriba)

/* ── Vectores de proyección oblicua ────────────────────────────────────── */
// Eje de columnas (frecuencia) → derecha y muy leve pendiente
const CDX =  8.5
const CDY =  1.2
// Eje de filas (profundidad temporal) → izquierda y arriba
const RDX = -6.0
const RDY = -2.8

/* ── Origen de la esquina frontal-izquierda de la grilla ───────────────── */
const OX = CW * 0.60   // ~288 px desde la izquierda
const OY = CH * 0.89   // ~267 px desde arriba

/* ── Proyecta coordenadas de grilla a pantalla ─────────────────────────── */
function proj(col: number, row: number): { x: number; y: number } {
  return {
    x: OX + col * CDX + row * RDX,
    y: OY + col * CDY + row * RDY,
  }
}

/* ── Amplitud 0-255 → [r, g, b] espectro arcoíris ──────────────────────── */
function ampRgb(v: number): [number, number, number] {
  const n = v / 255
  if (n < 0.25) {
    const t = n / 0.25
    return [0, Math.round(t * 210), 255]
  }
  if (n < 0.5) {
    const t = (n - 0.25) / 0.25
    return [0, 210, Math.round((1 - t) * 255)]
  }
  if (n < 0.75) {
    const t = (n - 0.5) / 0.25
    return [Math.round(t * 255), 210, 0]
  }
  const t = (n - 0.75) / 0.25
  return [255, Math.round((1 - t) * 210), 0]
}

/* ────────────────────────────────────────────────────────────────────────── */

export function AudioVisualizerWaterfall3D({ src }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const audioRef    = useRef<HTMLAudioElement>(null)
  const actxRef     = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number>(0)
  const historyRef  = useRef<Uint8Array[]>([])
  const [playing, setPlaying] = useState(false)

  /* ── Inicializa AudioContext al primer gesto ──────────────────────────── */
  function initCtx() {
    if (actxRef.current) return
    const audio = audioRef.current
    if (!audio) return
    const actx     = new AudioContext()
    const source   = actx.createMediaElementSource(audio)
    const analyser = actx.createAnalyser()
    analyser.fftSize               = 256   // 128 bins
    analyser.smoothingTimeConstant = 0.78
    source.connect(analyser)
    analyser.connect(actx.destination)
    actxRef.current    = actx
    analyserRef.current = analyser
  }

  /* ── Renderiza una escena completa ────────────────────────────────────── */
  const drawScene = useCallback((freqData: Uint8Array | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    /* Fondo negro */
    ctx.clearRect(0, 0, CW, CH)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CW, CH)

    /* Actualiza historial con el frame más reciente */
    if (freqData) {
      const frame = new Uint8Array(COLS)
      for (let i = 0; i < COLS; i++) {
        frame[i] = freqData[Math.floor((i / COLS) * freqData.length)]
      }
      historyRef.current.unshift(frame)
      if (historyRef.current.length > ROWS) historyRef.current.pop()
    }

    const history = historyRef.current
    const depth   = history.length

    /* ── Cuadrícula de piso (se dibuja primero, debajo de las barras) ───── */
    ctx.save()
    ctx.strokeStyle = 'rgba(50,50,80,0.55)'
    ctx.lineWidth   = 0.5
    // Líneas a lo largo del eje de columnas
    for (let r = 0; r <= depth; r++) {
      const pL = proj(0,    r)
      const pR = proj(COLS, r)
      ctx.beginPath()
      ctx.moveTo(pL.x, pL.y)
      ctx.lineTo(pR.x, pR.y)
      ctx.stroke()
    }
    // Líneas a lo largo del eje de profundidad
    for (let c = 0; c <= COLS; c++) {
      const pF = proj(c, 0)
      const pB = proj(c, depth)
      ctx.beginPath()
      ctx.moveTo(pF.x, pF.y)
      ctx.lineTo(pB.x, pB.y)
      ctx.stroke()
    }
    ctx.restore()

    /* ── Barras 3D: de atrás hacia delante (painter's algorithm) ─────────── */
    for (let row = depth - 1; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const v = history[row][col]
        if (v < 5) continue

        const h             = (v / 255) * MAX_H
        const [r, g, b]     = ampRgb(v)

        const p00 = proj(col,     row)      // base frontal izquierda
        const p10 = proj(col + 1, row)      // base frontal derecha
        const p11 = proj(col + 1, row + 1)  // base trasera derecha
        const p01 = proj(col,     row + 1)  // base trasera izquierda

        /* Cara frontal */
        ctx.beginPath()
        ctx.moveTo(p00.x, p00.y)
        ctx.lineTo(p10.x, p10.y)
        ctx.lineTo(p10.x, p10.y - h)
        ctx.lineTo(p00.x, p00.y - h)
        ctx.closePath()
        ctx.fillStyle = `rgba(${r},${g},${b},0.86)`
        ctx.fill()

        /* Cara superior (más brillante) */
        const rb = Math.min(255, r + 75)
        const gb = Math.min(255, g + 75)
        const bb = Math.min(255, b + 75)
        ctx.beginPath()
        ctx.moveTo(p00.x, p00.y - h)
        ctx.lineTo(p10.x, p10.y - h)
        ctx.lineTo(p11.x, p11.y - h)
        ctx.lineTo(p01.x, p01.y - h)
        ctx.closePath()
        ctx.fillStyle = `rgba(${rb},${gb},${bb},0.96)`
        ctx.fill()

        /* Cara lateral derecha (más oscura) */
        const rd = Math.round(r * 0.52)
        const gd = Math.round(g * 0.52)
        const bd = Math.round(b * 0.52)
        ctx.beginPath()
        ctx.moveTo(p10.x, p10.y)
        ctx.lineTo(p11.x, p11.y)
        ctx.lineTo(p11.x, p11.y - h)
        ctx.lineTo(p10.x, p10.y - h)
        ctx.closePath()
        ctx.fillStyle = `rgba(${rd},${gd},${bd},0.86)`
        ctx.fill()
      }
    }

    /* ── Texto de título ─────────────────────────────────────────────────── */
    ctx.save()
    ctx.font         = '7px monospace'
    ctx.fillStyle    = 'rgba(110,110,170,0.32)'
    ctx.textAlign    = 'left'
    ctx.fillText('3D ROTATING SPECTRUM ANALYZER', 8, 12)
    ctx.restore()

  }, [])

  /* ── Loop de animación ───────────────────────────────────────────────── */
  const drawFrame = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    drawScene(data)
    rafRef.current = requestAnimationFrame(drawFrame)
  }, [drawScene])

  /* ── Toggle play / pause ─────────────────────────────────────────────── */
  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    initCtx()
    if (actxRef.current?.state === 'suspended') actxRef.current.resume().catch(() => {})

    if (playing) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      drawFrame()
      setPlaying(true)
    }
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────── */
  useEffect(() => {
    drawScene(null)
    return () => {
      cancelAnimationFrame(rafRef.current)
      actxRef.current?.close().catch(() => {})
    }
  }, [drawScene])

  /* ── UI ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col items-end gap-2">

      {/* Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-white/10 shadow-[0_0_24px_rgba(0,0,0,0.8)]">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block"
          style={{ width: 360, height: Math.round(CH * 360 / CW) }}
          aria-hidden="true"
        />
      </div>

      {/* Controles */}
      <button
        onClick={toggle}
        className={[
          'flex items-center gap-1.5 rounded-full px-3 py-1.5',
          'glass-surface border font-display text-[9px] tracking-widest uppercase',
          'transition-all duration-300',
          playing
            ? 'border-yellow-400/50 text-yellow-400 hover:border-yellow-400/80'
            : 'border-blue-400/30  text-blue-400  hover:border-blue-400/70',
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
