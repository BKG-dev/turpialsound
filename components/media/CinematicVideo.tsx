'use client'

import { useEffect, useRef, useState } from 'react'
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
  poster = '/images/artista-hero-768.webp',
  aspect = 'horizontal',
  label = 'Turpial Sound',
  className,
}: CinematicVideoProps) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !src || !inView || loaded) return
    vid.src = src
    vid.load()
    setLoaded(true)
  }, [inView, loaded, src])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    return () => {
      vid.pause()
      vid.src = ''
    }
  }, [])

  function handleToggle() {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
      setPlaying(false)
    } else {
      void videoRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div
      ref={containerRef}
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
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.9) 100%)' }}
        aria-hidden="true"
      />

      {src ? (
        <video
          ref={videoRef}
          poster={inView ? poster : undefined}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.08)' }}
          playsInline
          muted
          loop
          preload="none"
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      ) : null}

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

      <div className="absolute bottom-0 left-0 z-20 p-5">
        <p className="font-display text-xs tracking-[0.25em] text-text-muted uppercase">{label}</p>
      </div>
    </div>
  )
}
