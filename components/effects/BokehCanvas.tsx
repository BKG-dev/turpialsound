'use client'

import { useEffect, useRef } from 'react'

/*
 * CinematicDust — CSS particles + JS mouse glow trail.
 * Partículas: @keyframes puro, compositor-thread, cero backing store.
 * Glow:       1 div + 1 RAF solo para lerp de posición. Costo mínimo.
 */

const COUNT  = 200
const COLORS = ['255,252,215', '255,238,170', '255,220,120', '210,238,255', '255,255,255']

function sr(n: number, o = 0) {
  return ((Math.sin(n * 127.1 + o * 311.7) * 43758.5453) % 1 + 1) % 1
}

export function BokehCanvas() {
  const glowRef  = useRef<HTMLDivElement>(null)
  const mouse    = useRef({ x: -999, y: -999 })
  const smooth   = useRef({ x: -999, y: -999 })
  const rafRef   = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) return

    const glow = glowRef.current
    if (!glow) return

    const onMove = (e: MouseEvent) => {
      const rect = glow.parentElement!.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const tick = () => {
      const m = mouse.current
      const s = smooth.current

      // Primer frame: snap sin lerp
      if (s.x < -900) { s.x = m.x; s.y = m.y }

      s.x += (m.x - s.x) * 0.07
      s.y += (m.y - s.y) * 0.07

      glow.style.transform = `translate(${s.x}px, ${s.y}px)`

      // Fade in cuando el cursor entra al área
      if (m.x > -900) glow.style.opacity = '1'

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      <style>{`
        @keyframes bk-float {
          0%   { transform: translate(0, 0);                        opacity: 0; }
          12%  { opacity: var(--bk-a); }
          88%  { opacity: var(--bk-a); }
          100% { transform: translate(var(--bk-dx), var(--bk-dy)); opacity: 0; }
        }
      `}</style>

      {/* ── Glow trail — un solo div, mix-blend screen, lerp 0.07 ── */}
      <div
        ref={glowRef}
        style={{
          position:        'absolute',
          top:             -140,
          left:            -140,
          width:           280,
          height:          280,
          borderRadius:    '50%',
          background:      'radial-gradient(circle, rgba(0,174,239,0.18) 0%, rgba(0,174,239,0.06) 40%, transparent 70%)',
          mixBlendMode:    'screen',
          opacity:         0,
          transition:      'opacity 0.5s ease',
          willChange:      'transform',
          pointerEvents:   'none',
        }}
      />

      {/* ── Partículas CSS ── */}
      {Array.from({ length: COUNT }, (_, i) => {
        const x     = sr(i, 0) * 100
        const y     = sr(i, 1) * 100
        const size  = 1.2 + sr(i, 2) * 3.5
        const delay = -(sr(i, 3) * 14).toFixed(2)
        const dur   = (9 + sr(i, 4) * 11).toFixed(2)
        const alpha = (0.25 + sr(i, 5) * 0.55).toFixed(3)
        const dx    = ((sr(i, 6) - 0.5) * 70).toFixed(1)
        const dy    = ((sr(i, 7) - 0.5) * 50).toFixed(1)
        const color = COLORS[Math.floor(sr(i, 8) * COLORS.length)]

        return (
          <span
            key={i}
            style={{
              position:     'absolute',
              left:         `${x}%`,
              top:          `${y}%`,
              width:        size,
              height:       size,
              borderRadius: '50%',
              background:   `rgb(${color})`,
              mixBlendMode: 'screen',
              animation:    `bk-float ${dur}s ${delay}s infinite ease-in-out`,
              '--bk-a':     alpha,
              '--bk-dx':    `${dx}px`,
              '--bk-dy':    `${dy}px`,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}
