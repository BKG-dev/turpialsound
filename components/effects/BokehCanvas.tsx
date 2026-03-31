'use client'

import { useEffect, useRef } from 'react'

/*
 * CinematicDust — motas de polvo flotando en luz de ventana.
 *
 * Claves visuales:
 *  1. Movimiento casi imperceptible — deriva Browniana lenta.
 *  2. Captura de luz: la mayoría dim (alpha ~0.04); de vez en cuando
 *     una mota rota y lanza un destello breve y brillante (sin^6).
 *  3. Screen blend: partículas superpuestas suman luz → calidad cinematográfica.
 *  4. Distribución: esquina inferior-izquierda densa, superior-derecha vacía.
 */

/* ── Colores de polvo iluminado: blanco cálido, dorado, cyan pálido ─────── */
const PALETTE: [number, number, number][] = [
  [255, 252, 215],  // blanco cálido
  [255, 238, 170],  // dorado pálido
  [255, 220, 120],  // ámbar suave
  [210, 238, 255],  // hielo azul
  [255, 255, 255],  // blanco puro
]

interface Mote {
  x:  number; y:  number
  vx: number; vy: number
  r:  number           // radio base 0.5–2.8 px
  baseAlpha: number    // opacidad en reposo (muy baja)
  phase: number
  pulseSpeed: number   // lentísimo para la mayoría
  color: [number, number, number]
  depth: number        // 0=lejos/pequeño  1=cerca/grande
}

const TOTAL = 289

/* ── Rejection sampling: peso (1-x/W)^2 · (y/H)^2 ────────────────────────
   Peso = 1 en esquina inferior-izquierda, ~0 en esquina superior-derecha.
   Floor 0.04 → unos pocos puntos llegan al resto del canvas (profundidad). */
function sample(W: number, H: number): { x: number; y: number } {
  for (;;) {
    const x = Math.random() * W
    const y = Math.random() * H
    const w = Math.pow(1 - x / W, 2) * Math.pow(y / H, 2)
    if (Math.random() < w * 0.96 + 0.04) return { x, y }
  }
}

function makeMote(W: number, H: number): Mote {
  const { x, y } = sample(W, H)
  const depth = Math.random()
  return {
    x, y,
    vx: (Math.random() - 0.5) * 0.07,
    vy: (Math.random() - 0.35) * 0.10,   // deriva levemente hacia abajo
    r:  0.5 + Math.random() * 1.28 + depth * 0.8,
    baseAlpha: 0.06 + Math.random() * 0.14,
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.004 + Math.random() * 0.014,  // muy lento
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    depth,
  }
}

export function BokehCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse     = useRef({ x: -9999, y: -9999 })
  const motes     = useRef<Mote[]>([])
  const raf       = useRef(0)
  const gt        = useRef(0)   // tiempo global

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width  = width  * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      motes.current = Array.from({ length: TOTAL }, () => makeMote(width, height))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    window.addEventListener('mousemove', onMove)

    const draw = () => {
      const W = canvas.width  / dpr
      const H = canvas.height / dpr
      const now = gt.current
      ctx.clearRect(0, 0, W, H)

      /* Screen blend: las partículas se suman como fuentes de luz real */
      ctx.globalCompositeOperation = 'screen'

      for (const m of motes.current) {
        /* ── Movimiento: deriva lenta + convección sinusoidal ── */
        m.x += m.vx + Math.sin(now * 0.18 + m.phase) * 0.06
        m.y += m.vy + Math.cos(now * 0.14 + m.phase * 1.3) * 0.05

        /* ── Perturbación del mouse (corriente de aire) ── */
        const dx = m.x - mouse.current.x
        const dy = m.y - mouse.current.y
        const d2 = dx * dx + dy * dy
        if (d2 < 8000 && d2 > 0.5) {
          const d = Math.sqrt(d2)
          const f = Math.max(0, (90 - d) / 90) * 0.5
          m.vx += (dx / d) * f * 0.04
          m.vy += (dy / d) * f * 0.04
        }
        m.vx *= 0.995
        m.vy *= 0.995

        /* ── Recicla: si sale por cualquier borde, vuelve desde la izquierda/abajo ── */
        if (m.y > H + 5 || m.y < -5 || m.x < -5 || m.x > W + 5) {
          Object.assign(m, makeMote(W, H))
        }

        /* ── Captura de luz: sin^6 — casi siempre dim, destello breve brillante ──
           El exponente 6 aplana la curva cerca de 0 y crea un pico agudo.       */
        const sinVal  = Math.sin(now * m.pulseSpeed * 60 + m.phase)
        const pulse   = Math.pow(Math.max(0, sinVal), 6)
        const alpha   = m.baseAlpha + pulse * 1.0
        const r       = m.r * (1 + pulse * 0.6)   // bloom: se agranda al brillar

        const [rc, gc, bc] = m.color

        /* ── Halo difuso (sólo cuando hay pulso > 0.1) ── */
        if (pulse > 0.08) {
          const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3.5)
          hg.addColorStop(0,   `rgba(${rc},${gc},${bc},${(pulse * 0.22).toFixed(4)})`)
          hg.addColorStop(1,   `rgba(${rc},${gc},${bc},0)`)
          ctx.beginPath()
          ctx.arc(m.x, m.y, r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = hg
          ctx.fill()
        }

        /* ── Núcleo de la mota ── */
        ctx.beginPath()
        ctx.arc(m.x, m.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rc},${gc},${bc},${alpha.toFixed(4)})`
        ctx.fill()

        /* ── Especular: punto blanco offset superior-izquierda en el destello ── */
        if (pulse > 0.15) {
          const sx = m.x - r * 0.3
          const sy = m.y - r * 0.3
          const sr = Math.max(0.25, r * 0.38)
          ctx.beginPath()
          ctx.arc(sx, sy, sr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${(pulse * 1.0).toFixed(4)})`
          ctx.fill()
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      gt.current += 0.016
      raf.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ zIndex: 0 }}
    />
  )
}
