'use client'

/**
 * ParticleCanvas — Bokeh luminoso interactivo
 *
 * Técnica de renderizado:
 *  - fillStyle = blanco casi puro → núcleo caliente de la partícula
 *  - shadowBlur + shadowColor = halo de color (cyan / gold) → efecto bloom
 *  - Mouse como linterna: gradiente radial sutil + boost de alpha/glow por proximidad
 *  - Física térmica: deriva upward constante + micro-turbulencia Browniana
 *  - IntersectionObserver pausa el RAF cuando el canvas sale de viewport
 */

import { useEffect, useRef } from 'react'

/* ─── Tipos ──────────────────────────────────────────────────────────────── */

interface Particle {
  x: number
  y: number
  r: number         // radio base
  vx: number
  vy: number
  alpha: number     // alpha actual (animada por lerp)
  baseAlpha: number // alpha en reposo
  glow: number      // shadowBlur actual (animada)
  baseGlow: number  // shadowBlur en reposo
  color: string     // color del halo (cyan o gold)
}

/* ─── Paleta (cyan dominante, gold raro) ────────────────────────────────── */

const HALO_COLORS = [
  '#00aeef', '#00aeef', '#00aeef', '#00aeef',
  '#29bcff', '#0090c8', '#0060d0',
  '#ffc107', // gold — 1 de cada 8
]

/* ─── Fábrica de partícula ───────────────────────────────────────────────── */

function makeParticle(w: number, h: number): Particle {
  const baseAlpha = 0.30 + Math.random() * 0.50   // visible desde frame 1
  const baseGlow  = 10  + Math.random() * 10       // halo inicial apreciable

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.8 + Math.random() * 1.8,
    // Térmica: componente vertical negativa (hacia arriba) + drift horizontal
    vx: (Math.random() - 0.5) * 0.22,
    vy: -(0.08 + Math.random() * 0.20),
    alpha:     baseAlpha,
    baseAlpha,
    glow:      baseGlow,
    baseGlow,
    color: HALO_COLORS[Math.floor(Math.random() * HALO_COLORS.length)],
  }
}

/* ─── Componente ─────────────────────────────────────────────────────────── */

export function ParticleCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    /* ── Optimización móvil: no montar en pantallas pequeñas ── */
    if (window.matchMedia('(max-width: 768px)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctxRaw = canvas.getContext('2d')
    if (!ctxRaw) return
    const ctx: CanvasRenderingContext2D = ctxRaw

    let animId: number
    let particles: Particle[] = []
    // Cursor muy lejos por defecto → sin efecto hasta que el usuario mueva el mouse
    let mouse = { x: -9999, y: -9999 }
    let dpr = devicePixelRatio || 1
    // Coordina IO + visibilitychange para evitar loops duplicados
    let isActive = false

    /* ── Inicialización / resize ─────────────────────────────────────── */
    function resize() {
      if (!canvas) return
      dpr = devicePixelRatio || 1
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width  = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // ~1 partícula por 14 000px² → equilibrio visual / rendimiento
      const count = Math.max(20, Math.floor((w * h) / 14000))
      particles = Array.from({ length: count }, () => makeParticle(w, h))
    }

    /* ── Loop principal ──────────────────────────────────────────────── */
    function draw() {
      if (!canvas) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      /* Linterna del cursor — gradiente radial sutil ANTES de las partículas */
      const mouseActive = mouse.x > -1000
      if (mouseActive) {
        const grad = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 160,
        )
        grad.addColorStop(0.0, 'rgba(0, 174, 239, 0.038)')
        grad.addColorStop(0.5, 'rgba(0, 174, 239, 0.012)')
        grad.addColorStop(1.0, 'rgba(0, 174, 239, 0)')
        ctx.save()
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 160, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      /* Partículas */
      for (const p of particles) {

        /* ── Proximidad al cursor → boost de alpha / glow / radio ─────── */
        const dx   = p.x - mouse.x
        const dy   = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const RADIUS = 150

        let targetAlpha = p.baseAlpha
        let targetGlow  = p.baseGlow
        let displayR    = p.r

        if (mouseActive && dist < RADIUS && dist > 0) {
          const t = 1 - dist / RADIUS            // 1 en el cursor, 0 en el borde
          targetAlpha = Math.min(1, p.baseAlpha + t * 0.55)
          targetGlow  = p.baseGlow  + t * 18
          displayR    = p.r         + t * 1.4

          /* Perturbación numinosa: vórtice tangencial suave */
          const angle = Math.atan2(dy, dx) + Math.PI / 2
          p.vx += Math.cos(angle) * t * 0.018
          p.vy += Math.sin(angle) * t * 0.018
          /* Nudge radial mínimo */
          p.vx += (dx / dist) * t * 0.005
          p.vy += (dy / dist) * t * 0.005
        }

        /* Lerp suave hacia los targets (responde en ~0.5s a 60fps) */
        p.alpha += (targetAlpha - p.alpha) * 0.06
        p.glow  += (targetGlow  - p.glow)  * 0.06

        /* ── Física térmica ────────────────────────────────────────────── */
        p.vy -= 0.0012                          // corriente térmica ascendente
        p.vx += (Math.random() - 0.5) * 0.003  // micro-turbulencia Browniana
        p.vx *= 0.985
        p.vy *= 0.985
        p.x  += p.vx
        p.y  += p.vy

        /* Wrap de bordes */
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h    // sale arriba → reaparece abajo
        if (p.y > h) p.y = 0

        /* ── Dibujo bokeh ─────────────────────────────────────────────── */
        /* Núcleo blanco caliente + halo de color por shadowBlur → bloom */
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.shadowBlur  = p.glow
        ctx.shadowColor = p.color
        ctx.fillStyle   = `rgba(255, 255, 255, ${p.alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, displayR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    /* ── Arranque / parada del loop ─────────────────────────────────── */
    function start() {
      if (isActive) return          // evita loops duplicados
      isActive = true
      animId = requestAnimationFrame(draw)
    }

    function stop() {
      isActive = false
      cancelAnimationFrame(animId)
    }

    /* ── Eventos ─────────────────────────────────────────────────────── */
    function onMouseMove(e: MouseEvent) {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function onMouseLeave() {
      mouse = { x: -9999, y: -9999 }
    }

    /* ── Pausa cuando la pestaña queda oculta ── */
    function onVisibility() {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    /* ── IntersectionObserver: pausa si el canvas sale del viewport ── */
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start()
      else stop()
    })

    resize()
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    /* El loop lo arranca exclusivamente el IntersectionObserver en su primer disparo */

    return () => {
      stop()
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      canvas?.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    />
  )
}
