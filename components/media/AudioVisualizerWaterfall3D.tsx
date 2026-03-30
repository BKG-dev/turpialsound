'use client'

/**
 * AudioVisualizerWaterfall3D
 *
 * Grilla 3D 20×20 con proyección perspectiva manual (canvas 2D, sin deps externas).
 * CELL=35 → el grid llena el ~90% del canvas en el eje horizontal.
 * MAX_H=200 → barras con presencia visual real.
 * Buffer 500×500, display 300×300 CSS fixed top-right.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, Layers } from 'lucide-react'

interface Props { src: string }

/* ── Proyección ─────────────────────────────────────────────────────────── */
const PITCH = -0.54
const COS_P = Math.cos(PITCH)
const SIN_P = Math.sin(PITCH)
const FL    = 460
const CD    = 395

/* ── Grilla (calibradas para 90 % de fill en canvas de 500 px) ──────────── */
const GRID  = 20
const CELL  = 35    // 2.33 × el original → llena ~90 % horizontal del canvas
const MAX_H = 200   // barras con altura visual real (proporción ≈ 5.7 × CELL)
const HW    = CELL * 0.43

/* ── Modos ──────────────────────────────────────────────────────────────── */
type Mode = 'A' | 'B' | 'C'
const MODES: Mode[]                    = ['A', 'B', 'C']
const MODE_LABEL: Record<Mode, string> = { A: 'SPECTRUM', B: 'RADIAL', C: 'TERRAIN' }

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
    return [0, Math.round(60 + t * 114), Math.round(100 + t * 139)]
  }
  if (n < 0.82) {
    const t = (n - 0.45) / 0.37
    return [Math.round(t * 255), Math.round(174 + t * 19), Math.round(239 - t * 232)]
  }
  const t = (n - 0.82) / 0.18
  return [255, Math.round(193 + t * 62), Math.round(7 + t * 248)]
}

/* ── Proyección 3D → 2D ─────────────────────────────────────────────────── */
function p3(
  lx: number, ly: number, lz: number,
  cosY: number, sinY: number,
  cx: number, cy: number,
) {
  const x1 =  lx * cosY + lz * sinY
  const z1 = -lx * sinY + lz * cosY
  const y2 = ly * COS_P - z1 * SIN_P
  const z2 = ly * SIN_P + z1 * COS_P
  const s  = FL / (FL + z2 + CD)
  return { sx: cx + x1 * s, sy: cy - y2 * s, z2 }
}

/* ── Valor de frecuencia por modo ───────────────────────────────────────── */
function binVal(col: number, row: number, data: Uint8Array, mode: Mode): number {
  const bins = data.length
  if (bins === 0) return 0
  let idx: number
  if (mode === 'A') {
    idx = Math.floor((col / GRID) * bins)
  } else if (mode === 'B') {
    const dx = col - (GRID - 1) / 2, dz = row - (GRID - 1) / 2
    idx = Math.floor((Math.sqrt(dx * dx + dz * dz) / (((GRID - 1) / 2) * Math.SQRT2)) * (bins - 1))
  } else {
    idx = Math.floor(((col + row) / (2 * (GRID - 1))) * (bins - 1))
  }
  return data[Math.min(idx, bins - 1)]
}

/* ─────────────────────────────────────────────────────────────────────────── */

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

  function initCtx() {
    if (actxRef.current) return
    const audio = audioRef.current
    if (!audio) return
    const actx     = new AudioContext()
    const mediaEl  = actx.createMediaElementSource(audio)
    const analyser = actx.createAnalyser()
    analyser.fftSize               = 1024
    analyser.smoothingTimeConstant = 0.80
    mediaEl.connect(analyser)
    analyser.connect(actx.destination)
    actxRef.current    = actx
    analyserRef.current = analyser
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  const render = useCallback((freqData: Uint8Array | null, ts: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    /* Sincroniza buffer con el tamaño CSS real × DPR */
    const dpr  = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (cssW === 0 || cssH === 0) return
    const bufW = Math.round(cssW * dpr)
    const bufH = Math.round(cssH * dpr)
    if (canvas.width !== bufW)  canvas.width  = bufW
    if (canvas.height !== bufH) canvas.height = bufH

    /* Factor de escala uniforme referenciado al canvas de diseño (500 px) */
    const sc = Math.min(bufW, bufH) / 500
    const cx = bufW / 2
    const cy = bufH / 2 + bufH * 0.056

    /* Escalado de constantes de grilla */
    const cell = CELL  * sc
    const maxH = MAX_H * sc
    const hw   = HW    * sc

    /* Delta time → rotación suave */
    const dt = prevTsRef.current
      ? Math.min((ts - prevTsRef.current) / 1000, 0.05)
      : 0.016
    prevTsRef.current = ts
    yawRef.current   += dt * 0.32

    const yaw  = yawRef.current
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const curMode = modeRef.current

    ctx.clearRect(0, 0, bufW, bufH)

    /* Idle: onda senoidal suave sin audio */
    const data: Uint8Array = freqData ?? (() => {
      const d = new Uint8Array(512)
      for (let i = 0; i < 512; i++)
        d[i] = Math.round((Math.sin(ts / 950 + i / 16) * 0.5 + 0.5) * 26)
      return d
    })()

    /* ── Construir y ordenar barras ─────────────────────────────────────── */
    const bars: BarData[] = new Array(GRID * GRID)
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const lcx = (col - (GRID - 1) / 2) * cell
        const lcz = (row - (GRID - 1) / 2) * cell
        const v   = binVal(col, row, data, curMode)
        const h   = (v / 255) * maxH
        const [r, g, b] = tsColor(v)
        const z1c = -lcx * sinY + lcz * cosY
        bars[row * GRID + col] = { cx: lcx, cz: lcz, h, r, g, b, depth: z1c * COS_P }
      }
    }
    bars.sort((a, b) => b.depth - a.depth)

    /* ── Cuadrícula de base ─────────────────────────────────────────────── */
    const half = (GRID / 2) * cell
    ctx.save()
    ctx.strokeStyle = 'rgba(0,174,239,0.07)'
    ctx.lineWidth   = 0.6 * sc
    for (let i = 0; i <= GRID; i++) {
      const t = (i - GRID / 2) * cell
      const pA = p3(t,     0, -half, cosY, sinY, cx, cy)
      const pB = p3(t,     0,  half, cosY, sinY, cx, cy)
      const pC = p3(-half, 0,  t,    cosY, sinY, cx, cy)
      const pD = p3( half, 0,  t,    cosY, sinY, cx, cy)
      ctx.beginPath(); ctx.moveTo(pA.sx, pA.sy); ctx.lineTo(pB.sx, pB.sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pC.sx, pC.sy); ctx.lineTo(pD.sx, pD.sy); ctx.stroke()
    }
    ctx.restore()

    /* ── Face selection según yaw ───────────────────────────────────────── */
    const frontZ = cosY >= 0
    const rightX = sinY <= 0

    /* ── Barras ─────────────────────────────────────────────────────────── */
    for (const { cx: bcx, cz: bcz, h, r, g, b } of bars) {
      if (h < 0.5 * sc) continue

      const bfl = p3(bcx - hw, 0, bcz - hw, cosY, sinY, cx, cy)
      const bfr = p3(bcx + hw, 0, bcz - hw, cosY, sinY, cx, cy)
      const bbl = p3(bcx - hw, 0, bcz + hw, cosY, sinY, cx, cy)
      const bbr = p3(bcx + hw, 0, bcz + hw, cosY, sinY, cx, cy)
      const tfl = p3(bcx - hw, h, bcz - hw, cosY, sinY, cx, cy)
      const tfr = p3(bcx + hw, h, bcz - hw, cosY, sinY, cx, cy)
      const tbl = p3(bcx - hw, h, bcz + hw, cosY, sinY, cx, cy)
      const tbr = p3(bcx + hw, h, bcz + hw, cosY, sinY, cx, cy)

      /* Cara superior — 100% brillo */
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.beginPath()
      ctx.moveTo(tfl.sx, tfl.sy); ctx.lineTo(tfr.sx, tfr.sy)
      ctx.lineTo(tbr.sx, tbr.sy); ctx.lineTo(tbl.sx, tbl.sy)
      ctx.closePath(); ctx.fill()

      /* Cara Z — 62% brillo */
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
      ctx.closePath(); ctx.fill()

      /* Cara X — 42% brillo */
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
      ctx.closePath(); ctx.fill()
    }

    /* ── Etiqueta de modo ────────────────────────────────────────────────── */
    ctx.save()
    ctx.font      = `${Math.round(7 * sc)}px monospace`
    ctx.fillStyle = 'rgba(0,174,239,0.28)'
    ctx.textAlign = 'center'
    ctx.fillText(MODE_LABEL[curMode], cx, bufH - 6 * sc)
    ctx.restore()

  }, [])

  /* ── Loops ───────────────────────────────────────────────────────────── */
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

      {/* Canvas — 300 × 300 CSS, buffer adaptado a DPR */}
      <div className="overflow-hidden rounded-lg">
        <canvas
          ref={canvasRef}
          style={{ width: 300, height: 300, display: 'block', background: 'transparent' }}
          aria-hidden="true"
        />
      </div>

      {/* Controles */}
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
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 glass-surface border border-cyan-400/30 font-display text-[9px] tracking-widest uppercase text-cyan-400 transition-all duration-300 hover:border-cyan-400/70"
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
