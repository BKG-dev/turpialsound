'use client'

/**
 * AudioVisualizerWaterfall3D
 *
 * Grilla 3D 20×20 con proyección perspectiva manual (canvas 2D, sin deps externas).
 *
 * Arquitectura visual:
 *  • 400 barras en grilla cuadrada, todas reaccionan al audio simultáneamente
 *  • Pitch fijo ~-30° para ver la base en perspectiva; rotación Y continua
 *  • Barras con 3 caras (top, frontal, lateral); face-selection dinámica según yaw
 *  • Painter's algorithm: ordena 400 barras por z-depth cada frame
 *  • Fondo transparente — el conjunto "flota" sobre la página
 *  • Paleta Turpial Sound: cian #00AEEF → oro #FFC107 → blanco en picos
 *  • Idle: onda senoidal suave (el grid rota y respira sin audio)
 *
 * Modos de visualización (toggle):
 *  A / SPECTRUM — mapeo lineal: col = banda de frecuencia → crestas en profundidad
 *  B / RADIAL   — mapeo radial: bajo al centro, agudos en bordes → forma volcán
 *  C / TERRAIN  — mapeo diagonal: olas que cruzan el grid en diagonal
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, Layers } from 'lucide-react'

interface Props { src: string }

/* ── Constantes de grilla ───────────────────────────────────────────────── */
const GRID  = 20
const CELL  = 15            // unidades por celda
const HW    = CELL * 0.43   // semianchura de barra (deja hueco entre barras)
const MAX_H = 95            // altura máxima en unidades

/* ── Proyección ─────────────────────────────────────────────────────────── */
const PITCH = -0.54         // ~-31° inclinación fija (pitch)
const COS_P = Math.cos(PITCH)
const SIN_P = Math.sin(PITCH)
const FL    = 460           // focal length
const CD    = 395           // camera distance

/* ── Canvas ─────────────────────────────────────────────────────────────── */
const CW = 500
const CH = 500
const CX = CW / 2
const CY = CH / 2 + 28     // centro ligeramente hacia abajo

/* ── Modos ──────────────────────────────────────────────────────────────── */
type Mode = 'A' | 'B' | 'C'
const MODES: Mode[]                  = ['A', 'B', 'C']
const MODE_LABEL: Record<Mode, string> = { A: 'SPECTRUM', B: 'RADIAL', C: 'TERRAIN' }

/* ── Tipo interno para datos de barra ya procesada ─────────────────────── */
type BarData = {
  cx: number; cz: number
  h:  number
  r:  number; g: number; b: number
  depth: number
}

/* ── Paleta Turpial Sound: cian → oro → blanco ──────────────────────────── */
function tsColor(v: number): [number, number, number] {
  const n = v / 255
  if (n < 0.45) {
    const t = n / 0.45
    return [0, Math.round(60 + t * 114), Math.round(100 + t * 139)]   // oscuro → cian
  }
  if (n < 0.82) {
    const t = (n - 0.45) / 0.37
    return [
      Math.round(t * 255),
      Math.round(174 + t * 19),
      Math.round(239 - t * 232),
    ]  // cian → oro
  }
  const t = (n - 0.82) / 0.18
  return [255, Math.round(193 + t * 62), Math.round(7 + t * 248)]      // oro → blanco
}

/* ── Proyección 3D → 2D ──────────────────────────────────────────────────
 *  cosY/sinY precalculados una vez por frame (no recalcular dentro del loop)
 * ─────────────────────────────────────────────────────────────────────── */
function p3(lx: number, ly: number, lz: number, cosY: number, sinY: number) {
  // Yaw (rotación alrededor de Y)
  const x1 =  lx * cosY + lz * sinY
  const z1 = -lx * sinY + lz * cosY
  // Pitch (rotación alrededor de X, fija)
  const y2 = ly * COS_P - z1 * SIN_P
  const z2 = ly * SIN_P + z1 * COS_P
  // Proyección perspectiva
  const s  = FL / (FL + z2 + CD)
  return { sx: CX + x1 * s, sy: CY - y2 * s, z2 }
}

/* ── Valor de frecuencia según modo ─────────────────────────────────────── */
function binVal(col: number, row: number, data: Uint8Array, mode: Mode): number {
  const bins = data.length
  if (bins === 0) return 0
  let idx: number
  if (mode === 'A') {
    // Lineal: columna controla la banda de frecuencia
    idx = Math.floor((col / GRID) * bins)
  } else if (mode === 'B') {
    // Radial: distancia desde el centro controla la frecuencia
    const dx   = col - (GRID - 1) / 2
    const dz   = row - (GRID - 1) / 2
    const maxD = ((GRID - 1) / 2) * Math.SQRT2
    idx = Math.floor((Math.sqrt(dx * dx + dz * dz) / maxD) * (bins - 1))
  } else {
    // Diagonal: frecuencia baja en esquina (0,0), alta en (19,19)
    idx = Math.floor(((col + row) / (2 * (GRID - 1))) * (bins - 1))
  }
  return data[Math.min(idx, bins - 1)]
}

/* ─────────────────────────────────────────────────────────────────────────
 * Componente principal
 * ───────────────────────────────────────────────────────────────────────── */
export function AudioVisualizerWaterfall3D({ src }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const audioRef    = useRef<HTMLAudioElement>(null)
  const actxRef     = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number>(0)
  const yawRef      = useRef(0)
  const prevTsRef   = useRef(0)
  const modeRef     = useRef<Mode>('A')

  const [playing, setPlaying] = useState(false)
  const [mode,    setMode]    = useState<Mode>('A')

  function cycleMode() {
    const next = MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]
    modeRef.current = next
    setMode(next)
  }

  /* ── AudioContext (diferido al primer gesto) ──────────────────────────── */
  function initCtx() {
    if (actxRef.current) return
    const audio = audioRef.current
    if (!audio) return
    const actx     = new AudioContext()
    const mediaEl  = actx.createMediaElementSource(audio)
    const analyser = actx.createAnalyser()
    analyser.fftSize               = 1024   // 512 bins → buena resolución de frecuencia
    analyser.smoothingTimeConstant = 0.80
    mediaEl.connect(analyser)
    analyser.connect(actx.destination)
    actxRef.current    = actx
    analyserRef.current = analyser
  }

  /* ── Render principal ────────────────────────────────────────────────── */
  const render = useCallback((freqData: Uint8Array | null, ts: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    /* Delta time → rotación suave independiente del frame rate */
    const dt = prevTsRef.current
      ? Math.min((ts - prevTsRef.current) / 1000, 0.05)
      : 0.016
    prevTsRef.current = ts
    yawRef.current   += dt * 0.32   // ~18°/s

    const yaw  = yawRef.current
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const curMode = modeRef.current

    /* Fondo totalmente transparente */
    ctx.clearRect(0, 0, CW, CH)

    /* Datos de frecuencia: onda senoidal suave si no hay audio */
    const data: Uint8Array = freqData ?? (() => {
      const d = new Uint8Array(512)
      for (let i = 0; i < 512; i++) {
        d[i] = Math.round((Math.sin(ts / 950 + i / 16) * 0.5 + 0.5) * 26)
      }
      return d
    })()

    /* ── Construir lista de barras con depth para painter's algorithm ───── */
    const bars: BarData[] = new Array(GRID * GRID)

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const cx = (col - (GRID - 1) / 2) * CELL
        const cz = (row - (GRID - 1) / 2) * CELL
        const v  = binVal(col, row, data, curMode)
        const h  = (v / 255) * MAX_H
        const [r, g, b] = tsColor(v)

        /* Depth del centro de la base (aproximación suficiente para el sort) */
        const z1c = -cx * sinY + cz * cosY   // yaw aplicado
        const z2c =  z1c * COS_P             // pitch aplicado (ly=0)

        bars[row * GRID + col] = { cx, cz, h, r, g, b, depth: z2c }
      }
    }

    /* Sort back → front (mayor depth primero) */
    bars.sort((a, b) => b.depth - a.depth)

    /* ── Cuadrícula de base ─────────────────────────────────────────────── */
    ctx.save()
    ctx.strokeStyle = 'rgba(0,174,239,0.07)'
    ctx.lineWidth   = 0.6
    const half = (GRID / 2) * CELL
    for (let i = 0; i <= GRID; i++) {
      const t = (i - GRID / 2) * CELL
      const pA = p3(t,    0, -half, cosY, sinY)
      const pB = p3(t,    0,  half, cosY, sinY)
      const pC = p3(-half, 0, t,   cosY, sinY)
      const pD = p3( half, 0, t,   cosY, sinY)
      ctx.beginPath(); ctx.moveTo(pA.sx, pA.sy); ctx.lineTo(pB.sx, pB.sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pC.sx, pC.sy); ctx.lineTo(pD.sx, pD.sy); ctx.stroke()
    }
    ctx.restore()

    /* ── Face selection según ángulo de yaw ─────────────────────────────── */
    const frontZ = cosY >= 0   // cara -Z visible cuando cosY ≥ 0
    const rightX = sinY <= 0   // cara +X visible cuando sinY ≤ 0

    /* ── Dibujar barras (painter's algorithm garantiza oclusión correcta) ── */
    for (const { cx, cz, h, r, g, b } of bars) {
      if (h < 0.4) continue

      /* 8 vértices de la barra */
      const bfl = p3(cx - HW, 0, cz - HW, cosY, sinY)   // base: front-left
      const bfr = p3(cx + HW, 0, cz - HW, cosY, sinY)   // base: front-right
      const bbl = p3(cx - HW, 0, cz + HW, cosY, sinY)   // base: back-left
      const bbr = p3(cx + HW, 0, cz + HW, cosY, sinY)   // base: back-right
      const tfl = p3(cx - HW, h, cz - HW, cosY, sinY)   // top:  front-left
      const tfr = p3(cx + HW, h, cz - HW, cosY, sinY)   // top:  front-right
      const tbl = p3(cx - HW, h, cz + HW, cosY, sinY)   // top:  back-left
      const tbr = p3(cx + HW, h, cz + HW, cosY, sinY)   // top:  back-right

      /* Cara superior — más brillante (100%) */
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.beginPath()
      ctx.moveTo(tfl.sx, tfl.sy)
      ctx.lineTo(tfr.sx, tfr.sy)
      ctx.lineTo(tbr.sx, tbr.sy)
      ctx.lineTo(tbl.sx, tbl.sy)
      ctx.closePath()
      ctx.fill()

      /* Cara Z (frontal o trasera según yaw) — 62% brillo */
      const rz = Math.round(r * 0.62), gz = Math.round(g * 0.62), bz = Math.round(b * 0.62)
      ctx.fillStyle = `rgb(${rz},${gz},${bz})`
      ctx.beginPath()
      if (frontZ) {
        ctx.moveTo(bfl.sx, bfl.sy); ctx.lineTo(bfr.sx, bfr.sy)
        ctx.lineTo(tfr.sx, tfr.sy); ctx.lineTo(tfl.sx, tfl.sy)
      } else {
        ctx.moveTo(bbl.sx, bbl.sy); ctx.lineTo(bbr.sx, bbr.sy)
        ctx.lineTo(tbr.sx, tbr.sy); ctx.lineTo(tbl.sx, tbl.sy)
      }
      ctx.closePath()
      ctx.fill()

      /* Cara X (derecha o izquierda según yaw) — 42% brillo */
      const rx = Math.round(r * 0.42), gx = Math.round(g * 0.42), bx = Math.round(b * 0.42)
      ctx.fillStyle = `rgb(${rx},${gx},${bx})`
      ctx.beginPath()
      if (rightX) {
        ctx.moveTo(bfr.sx, bfr.sy); ctx.lineTo(bbr.sx, bbr.sy)
        ctx.lineTo(tbr.sx, tbr.sy); ctx.lineTo(tfr.sx, tfr.sy)
      } else {
        ctx.moveTo(bfl.sx, bfl.sy); ctx.lineTo(bbl.sx, bbl.sy)
        ctx.lineTo(tbl.sx, tbl.sy); ctx.lineTo(tfl.sx, tfl.sy)
      }
      ctx.closePath()
      ctx.fill()
    }

    /* ── Etiqueta de modo ────────────────────────────────────────────────── */
    ctx.save()
    ctx.font      = '7px monospace'
    ctx.fillStyle = 'rgba(0,174,239,0.28)'
    ctx.textAlign = 'center'
    ctx.fillText(MODE_LABEL[curMode], CX, CH - 8)
    ctx.restore()

  }, [])

  /* ── Loops de animación ──────────────────────────────────────────────── */
  const liveLoop = useCallback((ts: number) => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    render(data, ts)
    rafRef.current = requestAnimationFrame(liveLoop)
  }, [render])

  const idleLoop = useCallback((ts: number) => {
    render(null, ts)
    rafRef.current = requestAnimationFrame(idleLoop)
  }, [render])

  /* ── Toggle play / pause ─────────────────────────────────────────────── */
  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    initCtx()
    if (actxRef.current?.state === 'suspended') actxRef.current.resume().catch(() => {})

    cancelAnimationFrame(rafRef.current)
    if (playing) {
      audio.pause()
      rafRef.current = requestAnimationFrame(idleLoop)
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      rafRef.current = requestAnimationFrame(liveLoop)
      setPlaying(true)
    }
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────── */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(idleLoop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      actxRef.current?.close().catch(() => {})
    }
  }, [idleLoop])

  /* ── UI ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col items-end gap-2">

      {/* Canvas — background transparente para efecto "flotante" */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ width: 300, height: 300, background: 'transparent', display: 'block' }}
        aria-hidden="true"
      />

      {/* Controles: Play/Pause + Toggle de modo */}
      <div className="flex gap-2">

        <button
          onClick={toggle}
          className={[
            'flex items-center gap-1.5 rounded-full px-3 py-1.5',
            'glass-surface border font-display text-[9px] tracking-widest uppercase',
            'transition-all duration-300',
            playing
              ? 'border-amber-400/50 text-amber-400 hover:border-amber-400/80'
              : 'border-cyan-400/30  text-cyan-400  hover:border-cyan-400/70',
          ].join(' ')}
          aria-label={playing ? 'Pausar visualizador' : 'Reproducir visualizador'}
        >
          {playing ? <Pause size={10} /> : <Play size={10} />}
          {playing ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={cycleMode}
          className={[
            'flex items-center gap-1.5 rounded-full px-3 py-1.5',
            'glass-surface border border-cyan-400/30 font-display text-[9px]',
            'tracking-widest uppercase text-cyan-400',
            'transition-all duration-300 hover:border-cyan-400/70',
          ].join(' ')}
          aria-label="Cambiar estilo de visualización"
        >
          <Layers size={10} />
          {mode}
        </button>

      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop preload="none" src={src} />
    </div>
  )
}
