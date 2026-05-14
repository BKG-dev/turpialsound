'use client'

import { useEffect, useRef, useState } from 'react'

const HERO_VIDEO_SRC = '/video/turpial-hero-cinematic.webm'
const HERO_VIDEO_FALLBACK_SRC = '/video/turpial-sound-studio.mp4'
const DESKTOP_DELAY_MS = 1500
const IDLE_FALLBACK_MS = 1200

type ConnectionInfo = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionInfo
}

export function HeroCinematicLayer() {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let cancelled = false
    let idleId: number | null = null
    let delayId: ReturnType<typeof setTimeout> | null = null
    let idleFallbackId: ReturnType<typeof setTimeout> | null = null

    const win = window
    const nav = navigator as NavigatorWithConnection
    const isMobile = win.matchMedia('(max-width: 767px)').matches
    const prefersReducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = nav.connection?.saveData === true
    const effectiveType = nav.connection?.effectiveType ?? ''
    const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g'

    if (isMobile || prefersReducedMotion || saveData || slowConnection) {
      return
    }

    const triggerDeferredLoad = () => {
      if (cancelled) return
      let started = false

      const armDelay = () => {
        if (cancelled || started) return
        started = true
        delayId = setTimeout(() => {
          if (!cancelled) setShouldLoadVideo(true)
        }, DESKTOP_DELAY_MS)
      }

      if ('requestIdleCallback' in win) {
        idleId = win.requestIdleCallback(armDelay, { timeout: IDLE_FALLBACK_MS })
        idleFallbackId = setTimeout(armDelay, IDLE_FALLBACK_MS + 150)
      } else {
        delayId = setTimeout(armDelay, 300)
      }
    }

    if (document.readyState === 'complete') {
      triggerDeferredLoad()
    } else {
      win.addEventListener('load', triggerDeferredLoad, { once: true })
    }

    return () => {
      cancelled = true
      win.removeEventListener('load', triggerDeferredLoad)
      if (idleId !== null && 'cancelIdleCallback' in win) {
        win.cancelIdleCallback(idleId)
      }
      if (delayId !== null) {
        clearTimeout(delayId)
      }
      if (idleFallbackId !== null) {
        clearTimeout(idleFallbackId)
      }
    }
  }, [])

  useEffect(() => {
    if (!shouldLoadVideo || !videoRef.current) return
    const video = videoRef.current
    video.play().catch(() => {})
  }, [shouldLoadVideo])

  if (!shouldLoadVideo) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out"
        style={{
          opacity: videoReady ? 0.45 : 0,
          filter: 'brightness(0.72) saturate(1.05) contrast(1.03)',
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden="true"
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
      >
        <source src={HERO_VIDEO_SRC} type="video/webm" />
        <source src={HERO_VIDEO_FALLBACK_SRC} type="video/mp4" />
      </video>
    </div>
  )
}
