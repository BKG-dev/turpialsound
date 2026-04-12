'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
import { cn } from '@/lib/utils'

interface CinematicVideoProps {
  src?: string
  poster?: string
  aspect?: 'horizontal' | 'vertical'
  label?: string
  className?: string
}

export function CinematicVideo({
  src,
  poster,
  aspect = 'horizontal',
  label = 'Turpial Sound',
  className,
}: CinematicVideoProps) {
  // Arranca como true porque el video tiene autoplay (muted + playsInline)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useIsomorphicLayoutEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    // Restaurar src tras cleanup de Strict Mode — React omite el update del DOM
    // si el valor del prop no cambió, así que la restauración debe ser explícita.
    if (src && (!vid.src || vid.src === window.location.href)) vid.src = src
    return () => {
      vid.pause()
      vid.src = ''
    }
  }, [src])

  function handleToggle() {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
    } else {
      void videoRef.current.play()
    }
    setPlaying((prev) => !prev)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-brand-surface',
        aspect === 'horizontal' ? 'aspect-video' : 'aspect-[9/16] max-w-sm mx-auto',
        className,
      )}
      style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: hovered
          ? '0 30px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 190, 255, 0.25)'
          : '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 150, 255, 0.15)',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Bottom gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.9) 100%)',
        }}
        aria-hidden="true"
      />

      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.2)' }}
          playsInline
          muted
          loop
          autoPlay
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        /* Cinematic placeholder */
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Dual-tone radial glow */}
          <div
            className="absolute inset-0 animate-pulse-glow"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(0,174,239,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 70% 60%, rgba(255,193,7,0.08) 0%, transparent 60%)',
            }}
            aria-hidden="true"
          />

          {/* Center decoration */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div
              className="h-px w-20 opacity-40"
              style={{
                background: 'linear-gradient(90deg, transparent, #00AEEF, transparent)',
              }}
              aria-hidden="true"
            />
            <span className="font-display text-xs tracking-[0.3em] text-text-muted uppercase">
              {label}
            </span>
            <div
              className="h-px w-20 opacity-40"
              style={{
                background: 'linear-gradient(90deg, transparent, #FFC107, transparent)',
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Play / Pause control */}
      <button
        onClick={handleToggle}
        className={cn(
          'absolute inset-0 z-20 flex items-center justify-center',
          'transition-opacity duration-350',
          playing ? 'opacity-100 sm:opacity-0 sm:hover:opacity-100' : 'opacity-100',
        )}
        aria-label={playing ? 'Pausar video' : 'Reproducir video'}
      >
        <span
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full glass-surface',
            'transition-all duration-350 hover:scale-110',
            playing ? 'border-white/10' : 'border-accent-gold/30 shadow-glow-sm',
          )}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="3" y="2" width="4" height="14" rx="1" fill="#F2F2F2" />
              <rect x="11" y="2" width="4" height="14" rx="1" fill="#F2F2F2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M5 3.5l11 5.5-11 5.5V3.5z" fill="#FFC107" />
            </svg>
          )}
        </span>
      </button>

      {/* Label bottom-left */}
      <div className="absolute bottom-0 left-0 z-20 p-5">
        <p className="font-display text-xs tracking-[0.25em] text-text-muted uppercase">{label}</p>
      </div>
    </div>
  )
}
