'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
import { Play, Pause } from 'lucide-react'

interface SocialVideoPlayerProps {
  src: string
  fallback?: string
  label?: string
}

export function SocialVideoPlayer({ src, fallback, label = 'Turpial Sound' }: SocialVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [inView, setInView] = useState(false)

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
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || !videoRef.current) return
    const v = videoRef.current
    const canWebm = v.canPlayType('video/webm') !== ''
    v.src = canWebm || !fallback ? src : (fallback ?? src)
    v.load()
  }, [inView, src, fallback])

  useIsomorphicLayoutEffect(() => {
    const v = videoRef.current
    if (!v) return
    return () => {
      v.pause()
      v.src = ''
    }
  }, [])

  function toggle() {
    const v = videoRef.current
    if (!v) return
    if (playing) {
      v.pause()
      setPlaying(false)
    } else {
      v.play().catch(() => {})
      setPlaying(true)
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-full">
      <div
        className="rounded-2xl p-[2px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,174,239,0.70) 0%, rgba(255,193,7,0.50) 50%, rgba(0,174,239,0.70) 100%)',
        }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-brand-bg" style={{ aspectRatio: '9 / 16' }}>
          <video
            ref={videoRef}
            loop
            playsInline
            disablePictureInPicture
            preload="none"
            className="h-full w-full object-cover"
            onClick={toggle}
            style={{ cursor: 'pointer' }}
            aria-label={label}
          >
            <track
              kind="captions"
              src="/captions/turpial-sound-video-rrss.vtt"
              srcLang="es"
              label="Español"
              default
            />
          </video>

          {!playing && (
            <button
              onClick={toggle}
              className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/45"
              aria-label="Reproducir video"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-cyan/50"
                style={{
                  background: 'rgba(10,10,10,0.65)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Play size={22} className="ml-1 text-accent-cyan" />
              </div>
            </button>
          )}

          {playing && (
            <button
              onClick={toggle}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
              style={{ background: 'rgba(10,10,10,0.65)', backdropFilter: 'blur(6px)' }}
              aria-label="Pausar video"
            >
              <Pause size={13} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
