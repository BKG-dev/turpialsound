'use client'

/**
 * AudioVisualizerWaterfall3D
 *
 * 5 modos de visualización tipo Winamp, canvas 2D puro sin deps externas.
 *
 * Arranque: modo D (SCOPE). Auto-cicla por todos los modos cada 5 s.
 *
 * Modos 3D (A / B / C):
 *   Grilla 20×20 con proyección perspectiva manual.
 *   Pointer drag (mouse + touch) → rotación esférica con inercia.
 *   Al soltar: momentum decae y auto-rotación retoma.
 *
 * Modos 2D (D / E):
 *   D - SCOPE   : Osciloscopio — forma de onda neon con glow
 *   E - CLASSIC : Barras Winamp — 64 barras con picos cayendo y reflejo
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, Layers } from 'lucide-react'

interface Props { src: string }

/* ── Constantes globales ─────────────────────────────────────────────────── */
const PITCH_DEF = -0.54          // pitch por defecto (regresa aquí al soltar)
const PITCH_MIN = -Math.PI * 0.45
const PITCH_MAX =  0.18          // rango esférico: ver desde ligeramente debajo
const FL        = 460
const CD        = 395
const GRID      = 20
const CELL      = 35
const MAX_H     = 200
const HW        = CELL * 0.43
const BARS_2D   = 64

/* ── Modos ──────────────────────────────────────────────────────────────── */
type Mode = 'A' | 'B' | 'C' | 'D' | 'E'
const MODES: Mode[] = ['A', 'B', 'C', 'D', 'E']
const MODE_LABEL: Record<Mode, string> = {
  A: 'SPECTRUM', B: 'RADIAL', C: 'TERRAIN', D: 'SCOPE', E: 'CLASSIC',
}

type Bar3D = { cx: number; cz: number; h: number; r: number; g: number; b: number; depth: number }

/* ── Paleta ──────────────────────────────────────────────────────────────── */
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

/* ── Proyección 3D → 2D ──────────────────────────────────────────────────── */
function p3(
  lx: number, ly: number, lz: number,
  cosY: number, sinY: number,
  cosP: number, sinP: number,
  cx: number, cy: number,
) {
  const x1 =  lx * cosY + lz * sinY
  const z1 = -lx * sinY + lz * cosY
  const y2 = ly * cosP - z1 * sinP
  const z2 = ly * sinP + z1 * cosP
  const s  = FL / (FL + z2 + CD)
  return { sx: cx + x1 * s, sy: cy - y2 * s, z2 }
}

/* ── Frecuencia por modo 3D ──────────────────────────────────────────────── */
function binVal(col: number, row: number, data: Uint8Array, mode: 'A' | 'B' | 'C'): number {
  const bins = data.length
  if (!bins) return 0
  let idx: number
  if (mode === 'A') {
    idx = Math.floor((col / GRID) * bins)
  } else if (mode === 'B') {
    const dx = col - (GRID - 1) / 2
    const dz = row - (GRID - 1) / 2
    idx = Math.floor((Math.sqrt(dx * dx + dz * dz) / (((GRID - 1) / 2) * Math.SQRT2)) * (bins - 1))
  } else {
    idx = Math.floor(((col + row) / (2 * (GRID - 1))) * (bins - 1))
  }
  return data[Math.min(idx, bins - 1)]
}

/* ─────────────────────────────────────────────────────────────────────────── */

export function AudioVisualizerWaterfall3D({ src }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const audioRef     = useRef<HTMLAudioElement>(null)
  const actxRef      = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const rafRef       = useRef<number>(0)

  /* Buffers reutilizables — evitan allocations GC por frame */
  const freqBufRef   = useRef<Uint8Array>(new Uint8Array(512))
  const waveBufRef   = useRef<Uint8Array>(new Uint8Array(1024))

  /* Visibilidad — IntersectionObserver pausa el loop fuera del viewport */
  const isVisibleRef = useRef(true)
  /* Tipo de loop activo para reanudar correctamente tras scroll de vuelta */
  const loopTypeRef  = useRef<'live' | 'idle'>('idle')

  /* Rotación esférica */
  const yawRef       = useRef(0)
  const pitchRef     = useRef(PITCH_DEF)
  const prevTsRef    = useRef(0)
  const autoRotRef   = useRef(true)
  const draggingRef  = useRef(false)
  const lastPtrRef   = useRef({ x: 0, y: 0 })
  const velRef       = useRef({ x: 0, y: 0 })   // inercia angular
  const resumeTimRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Modo activo — arranca en D (SCOPE, 2D) */
  const modeRef      = useRef<Mode>('D')
  const peaksRef     = useRef(new Float32Array(BARS_2D))

  const [playing,  setPlaying]  = useState(false)
  const [mode,     setMode]     = useState<Mode>('D')
  const [dragging, setDragging] = useState(false)

  /* ── Avanza al siguiente modo ──────────────────────────────────────────── */
  function cycleMode() {
    const next = MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]
    modeRef.current = next
    setMode(next)
    if (next === 'E') peaksRef.current.fill(0)
  }

  /* ── Auto-ciclo cada 5 s ───────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(cycleMode, 5_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ══════════════════════════════════════════════════════════════════════════
     ROTACIÓN ESFÉRICA — Pointer Events (mouse + touch unificados)
  ════════════════════════════════════════════════════════════════════════════ */
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (modeRef.current === 'D' || modeRef.current === 'E') return
    e.preventDefault()
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    draggingRef.current  = true
    autoRotRef.current   = false
    velRef.current       = { x: 0, y: 0 }
    lastPtrRef.current   = { x: e.clientX, y: e.clientY }
    setDragging(true)
    if (resumeTimRef.current) clearTimeout(resumeTimRef.current)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) return
    const dx = e.clientX - lastPtrRef.current.x
    const dy = e.clientY - lastPtrRef.current.y
    const dYaw   = dx * 0.010
    const dPitch = -dy * 0.008
    yawRef.current    += dYaw
    pitchRef.current   = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitchRef.current + dPitch))
    /* Guardar velocidad instantánea para inercia */
    velRef.current     = { x: dYaw, y: dPitch }
    lastPtrRef.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    /* Inercia activa 2 s, luego retoma auto-rotación */
    if (resumeTimRef.current) clearTimeout(resumeTimRef.current)
    resumeTimRef.current = setTimeout(() => {
      autoRotRef.current = true
      velRef.current     = { x: 0, y: 0 }
    }, 2_000)
  }

  /* ── AudioContext ─────────────────────────────────────────────────────── */
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
    /* Ajustar buffers al tamaño real del analyser */
    freqBufRef.current = new Uint8Array(analyser.frequencyBinCount)
    waveBufRef.current = new Uint8Array(analyser.fftSize)
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ════════════════════════════════════════════════════════════════════════════ */
  const render = useCallback((
    freqData: Uint8Array | null,
    waveData: Uint8Array | null,
    ts: number,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    /* Sincroniza buffer al tamaño CSS × DPR */
    const dpr  = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (!cssW || !cssH) return
    const bufW = Math.round(cssW * dpr)
    const bufH = Math.round(cssH * dpr)
    if (canvas.width  !== bufW) canvas.width  = bufW
    if (canvas.height !== bufH) canvas.height = bufH

    const sc = Math.min(bufW, bufH) / 500
    const cx = bufW / 2
    const cy = bufH / 2 + bufH * 0.056

    /* Delta time */
    const dt = prevTsRef.current
      ? Math.min((ts - prevTsRef.current) / 1000, 0.05)
      : 0.016
    prevTsRef.current = ts

    /* ── Física de rotación esférica ───────────────────────────────────── */
    if (draggingRef.current) {
      /* nada — los eventos ya actualizan yaw/pitch */
    } else if (autoRotRef.current) {
      /* Auto-rotación suave + pitch regresa al default */
      yawRef.current   += dt * 0.32
      pitchRef.current += (PITCH_DEF - pitchRef.current) * Math.min(1, dt * 1.8)
      velRef.current    = { x: 0, y: 0 }
    } else {
      /* Inercia post-drag: aplica velocidad y la decae */
      yawRef.current   += velRef.current.x
      pitchRef.current  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitchRef.current + velRef.current.y))
      velRef.current.x *= 0.91
      velRef.current.y *= 0.91
    }

    const yaw  = yawRef.current
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const cosP = Math.cos(pitchRef.current)
    const sinP = Math.sin(pitchRef.current)
    const curMode = modeRef.current

    ctx.clearRect(0, 0, bufW, bufH)

    /* ── Datos idle animados ─────────────────────────────────────────── */
    const freq: Uint8Array = freqData ?? (() => {
      const d = new Uint8Array(512)
      for (let i = 0; i < 512; i++)
        d[i] = Math.round((Math.sin(ts / 950 + i / 16) * 0.5 + 0.5) * 26)
      return d
    })()

    const wave: Uint8Array = waveData ?? (() => {
      const d = new Uint8Array(1024)
      for (let i = 0; i < 1024; i++)
        d[i] = Math.round(128 + Math.sin(ts / 500 + i / 10) * 22)
      return d
    })()

    /* ══════════════════════════════════════════════════════════════════════
       MODOS 3D: A / B / C
    ════════════════════════════════════════════════════════════════════════ */
    if (curMode === 'A' || curMode === 'B' || curMode === 'C') {
      const cell = CELL  * sc
      const maxH = MAX_H * sc
      const hw   = HW    * sc

      const bars: Bar3D[] = new Array(GRID * GRID)
      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const lcx = (col - (GRID - 1) / 2) * cell
          const lcz = (row - (GRID - 1) / 2) * cell
          const v   = binVal(col, row, freq, curMode)
          const h   = (v / 255) * maxH
          const [r, g, b] = tsColor(v)
          const z1c = -lcx * sinY + lcz * cosY
          bars[row * GRID + col] = { cx: lcx, cz: lcz, h, r, g, b, depth: z1c * cosP }
        }
      }
      bars.sort((a, b) => b.depth - a.depth)

      /* Cuadrícula de base */
      const half = (GRID / 2) * cell
      ctx.save()
      ctx.strokeStyle = 'rgba(0,174,239,0.07)'
      ctx.lineWidth   = 0.6 * sc
      for (let i = 0; i <= GRID; i++) {
        const t  = (i - GRID / 2) * cell
        const pA = p3(t,     0, -half, cosY, sinY, cosP, sinP, cx, cy)
        const pB = p3(t,     0,  half, cosY, sinY, cosP, sinP, cx, cy)
        const pC = p3(-half, 0,  t,    cosY, sinY, cosP, sinP, cx, cy)
        const pD = p3( half, 0,  t,    cosY, sinY, cosP, sinP, cx, cy)
        ctx.beginPath(); ctx.moveTo(pA.sx, pA.sy); ctx.lineTo(pB.sx, pB.sy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(pC.sx, pC.sy); ctx.lineTo(pD.sx, pD.sy); ctx.stroke()
      }
      ctx.restore()

      const frontZ = cosY >= 0
      const rightX = sinY <= 0

      for (const { cx: bcx, cz: bcz, h, r, g, b } of bars) {
        if (h < 0.5 * sc) continue

        const bfl = p3(bcx - hw, 0, bcz - hw, cosY, sinY, cosP, sinP, cx, cy)
        const bfr = p3(bcx + hw, 0, bcz - hw, cosY, sinY, cosP, sinP, cx, cy)
        const bbl = p3(bcx - hw, 0, bcz + hw, cosY, sinY, cosP, sinP, cx, cy)
        const bbr = p3(bcx + hw, 0, bcz + hw, cosY, sinY, cosP, sinP, cx, cy)
        const tfl = p3(bcx - hw, h, bcz - hw, cosY, sinY, cosP, sinP, cx, cy)
        const tfr = p3(bcx + hw, h, bcz - hw, cosY, sinY, cosP, sinP, cx, cy)
        const tbl = p3(bcx - hw, h, bcz + hw, cosY, sinY, cosP, sinP, cx, cy)
        const tbr = p3(bcx + hw, h, bcz + hw, cosY, sinY, cosP, sinP, cx, cy)

        /* Cara superior */
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.moveTo(tfl.sx, tfl.sy); ctx.lineTo(tfr.sx, tfr.sy)
        ctx.lineTo(tbr.sx, tbr.sy); ctx.lineTo(tbl.sx, tbl.sy)
        ctx.closePath(); ctx.fill()

        /* Cara frontal/trasera */
        const rz = r * 0.62 | 0, gz = g * 0.62 | 0, bz = b * 0.62 | 0
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

        /* Cara lateral */
        const rx = r * 0.42 | 0, gx = g * 0.42 | 0, bx = b * 0.42 | 0
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

    /* ══════════════════════════════════════════════════════════════════════
       MODO D: SCOPE — Osciloscopio neon
    ════════════════════════════════════════════════════════════════════════ */
    } else if (curMode === 'D') {
      const amp    = bufH * 0.36
      const yMid   = bufH * 0.50
      const sliceW = bufW / wave.length

      /* Grid de referencia */
      ctx.save()
      ctx.strokeStyle = 'rgba(0,174,239,0.06)'
      ctx.lineWidth   = 0.5 * sc
      ctx.setLineDash([3 * sc, 9 * sc])
      for (let i = 1; i < 4; i++) {
        const y = bufH * (i / 4)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(bufW, y); ctx.stroke()
      }
      for (let i = 1; i < 6; i++) {
        const x = bufW * (i / 6)
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, bufH); ctx.stroke()
      }
      ctx.restore()

      /* Glow exterior */
      ctx.save()
      ctx.shadowBlur  = 20 * sc
      ctx.shadowColor = 'rgba(0,174,239,0.8)'
      ctx.strokeStyle = 'rgba(0,174,239,0.28)'
      ctx.lineWidth   = 4 * sc
      ctx.lineJoin    = 'round'
      ctx.beginPath()
      for (let i = 0; i < wave.length; i++) {
        const v = (wave[i] / 128) - 1
        i === 0 ? ctx.moveTo(i * sliceW, yMid + v * amp) : ctx.lineTo(i * sliceW, yMid + v * amp)
      }
      ctx.stroke()
      ctx.restore()

      /* Core nítido */
      ctx.save()
      ctx.shadowBlur  = 7 * sc
      ctx.shadowColor = 'rgba(0,220,255,1)'
      ctx.strokeStyle = 'rgba(0,230,255,0.94)'
      ctx.lineWidth   = 1.6 * sc
      ctx.lineJoin    = 'round'
      ctx.beginPath()
      for (let i = 0; i < wave.length; i++) {
        const v = (wave[i] / 128) - 1
        i === 0 ? ctx.moveTo(i * sliceW, yMid + v * amp) : ctx.lineTo(i * sliceW, yMid + v * amp)
      }
      ctx.stroke()
      ctx.restore()

      /* Línea central */
      ctx.save()
      ctx.strokeStyle = 'rgba(0,174,239,0.12)'
      ctx.lineWidth   = 0.6 * sc
      ctx.setLineDash([5 * sc, 10 * sc])
      ctx.beginPath(); ctx.moveTo(0, yMid); ctx.lineTo(bufW, yMid); ctx.stroke()
      ctx.restore()

    /* ══════════════════════════════════════════════════════════════════════
       MODO E: CLASSIC — Barras tipo Winamp con picos
    ════════════════════════════════════════════════════════════════════════ */
    } else if (curMode === 'E') {
      const peaks  = peaksRef.current
      const barW   = bufW / BARS_2D
      const baseY  = bufH * 0.91
      const maxBar = bufH * 0.80
      const gap    = Math.max(1, Math.round(1.5 * sc))

      for (let i = 0; i < BARS_2D; i++) {
        const binIdx = Math.min(
          Math.floor((i / BARS_2D) * (freq.length * 0.80)),
          freq.length - 1,
        )
        const v   = freq[binIdx]
        const h   = (v / 255) * maxBar
        const x   = i * barW
        const [r, g, b] = tsColor(v)

        if (h > peaks[i]) peaks[i] = h
        else peaks[i] = Math.max(0, peaks[i] - 2.5 * sc)

        const grad = ctx.createLinearGradient(0, baseY, 0, baseY - maxBar)
        grad.addColorStop(0,   'rgba(0,80,150,0.75)')
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.82)`)
        grad.addColorStop(1,   `rgba(${Math.min(255, r + 55)},${Math.min(255, g + 55)},${Math.min(255, b + 55)},0.96)`)
        ctx.fillStyle = grad
        ctx.fillRect(x + gap, baseY - h, barW - gap * 2, Math.max(1, h))

        if (h > 2) {
          const refGrad = ctx.createLinearGradient(0, baseY, 0, baseY + maxBar * 0.28)
          refGrad.addColorStop(0, `rgba(${r},${g},${b},0.18)`)
          refGrad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = refGrad
          ctx.fillRect(x + gap, baseY, barW - gap * 2, h * 0.26)
        }

        if (peaks[i] > 3 * sc) {
          ctx.fillStyle = 'rgba(255,193,7,0.90)'
          ctx.fillRect(x + gap, baseY - peaks[i] - 2 * sc, barW - gap * 2, Math.max(1, 2 * sc))
        }
      }

      ctx.save()
      ctx.strokeStyle = 'rgba(0,174,239,0.18)'
      ctx.lineWidth   = sc
      ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(bufW, baseY); ctx.stroke()
      ctx.restore()
    }

    /* ── Etiqueta de modo ────────────────────────────────────────────────── */
    ctx.save()
    ctx.font      = `${Math.round(7 * sc)}px monospace`
    ctx.fillStyle = 'rgba(0,174,239,0.28)'
    ctx.textAlign = 'center'
    ctx.fillText(MODE_LABEL[curMode], cx, bufH - 6 * sc)
    ctx.restore()

  }, [])

  /* ── Loops RAF ───────────────────────────────────────────────────────────── */
  const liveLoop = useCallback((ts: number) => {
    if (!isVisibleRef.current) return          // pausado por IntersectionObserver
    const analyser = analyserRef.current
    if (!analyser) return
    analyser.getByteFrequencyData(freqBufRef.current)
    analyser.getByteTimeDomainData(waveBufRef.current)
    render(freqBufRef.current, waveBufRef.current, ts)
    rafRef.current = requestAnimationFrame(liveLoop)
  }, [render])

  const idleLoop = useCallback((ts: number) => {
    if (!isVisibleRef.current) return          // pausado por IntersectionObserver
    render(null, null, ts)
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
      loopTypeRef.current = 'idle'
      if (isVisibleRef.current) rafRef.current = requestAnimationFrame(idleLoop)
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      loopTypeRef.current = 'live'
      if (isVisibleRef.current) rafRef.current = requestAnimationFrame(liveLoop)
      setPlaying(true)
    }
  }

  /* ── Lifecycle: RAF inicial + IntersectionObserver + cleanup ─────────── */
  useEffect(() => {
    loopTypeRef.current = 'idle'
    rafRef.current = requestAnimationFrame(idleLoop)

    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        isVisibleRef.current = visible
        if (visible) {
          /* Reanudar el loop correcto al volver al viewport */
          cancelAnimationFrame(rafRef.current)
          prevTsRef.current = 0             // resetea delta para evitar salto de animación
          if (loopTypeRef.current === 'live') {
            rafRef.current = requestAnimationFrame(liveLoop)
          } else {
            rafRef.current = requestAnimationFrame(idleLoop)
          }
        } else {
          /* Fuera del viewport — cancelar loop */
          cancelAnimationFrame(rafRef.current)
        }
      },
      { threshold: 0.05 },                  // pausa al salir casi del todo
    )
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      actxRef.current?.close().catch(() => {})
      if (resumeTimRef.current) clearTimeout(resumeTimRef.current)
    }
  }, [idleLoop, liveLoop])

  /* ── UI ──────────────────────────────────────────────────────────────────── */
  const is3D = mode === 'A' || mode === 'B' || mode === 'C'

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col items-end gap-2">

      <div className="overflow-hidden rounded-lg">
        <canvas
          ref={canvasRef}
          style={{
            width: 300, height: 300, display: 'block',
            background: 'transparent',
            cursor: is3D ? (dragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            touchAction: 'none',   /* evita scroll del navegador en touch */
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        />
      </div>

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
