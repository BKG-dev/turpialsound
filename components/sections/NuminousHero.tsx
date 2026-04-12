'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ParticleCanvas } from '@/components/fx/ParticleCanvas'
import type { Route } from 'next'

interface NuminousHeroProps {
  imageSrc: string
  eyebrow: string
  heading: string
  subheading: string
  ctaLabel: string
  ctaHref: Route
  /** 'cover' (default) — imagen full-width con velo oscuro a la izquierda.
   *  'right'            — imagen pegada al borde derecho, fade a negro en el
   *                       borde izquierdo de la imagen, partículas en la zona
   *                       oscura con densidad decreciente hacia la derecha. */
  imageAlign?: 'cover' | 'right'
}

const variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
}

export function NuminousHero({
  imageSrc,
  eyebrow,
  heading,
  subheading,
  ctaLabel,
  ctaHref,
  imageAlign = 'cover',
}: NuminousHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null)

  /* Pause the CSS animation when the hero scrolls out of view */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const img = el.querySelector<HTMLElement>('.hero-slow-zoom')
        if (img) img.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
      },
      { threshold: 0.05 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden -mt-16 snap-start snap-always"
    >
      {/* ── Layout: imagen pegada a la derecha ──────────────────────────── */}
      {imageAlign === 'right' ? (
        <>
          {/* Fondo negro puro */}
          <div className="absolute inset-0 z-0 bg-[#0a0a0a]" aria-hidden="true" />

          {/* Imagen — mask directo sobre el contenedor: dissolve real sobre píxeles de la foto */}
          <div
            className="absolute inset-y-0 right-0 z-[1]"
            style={{
              left: '58%',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 10%, rgba(0,0,0,1) 26%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.45) 91%, transparent 100%)',
              maskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 10%, rgba(0,0,0,1) 26%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.45) 91%, transparent 100%)',
            }}
            aria-hidden="true"
          >
            <Image
              src={imageSrc}
              alt=""
              fill
              priority
              className="object-cover hero-slow-zoom"
              sizes="42vw"
            />
          </div>

          {/* Partículas — densas en zona oscura izquierda, se disuelven antes de la imagen */}
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            aria-hidden="true"
            style={{
              WebkitMaskImage:
                'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 48%, rgba(0,0,0,0.2) 62%, rgba(0,0,0,0) 70%)',
              maskImage:
                'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 48%, rgba(0,0,0,0.2) 62%, rgba(0,0,0,0) 70%)',
            }}
          >
            <ParticleCanvas className="absolute inset-0 w-full h-full" />
          </div>
        </>
      ) : (
        <>
          {/* ── Layout: imagen full-width (comportamiento original) ───────── */}
          <div className="absolute inset-0 z-0">
            <Image
              src={imageSrc}
              alt=""
              fill
              priority
              className="object-cover hero-slow-zoom"
              sizes="100vw"
            />
          </div>

          {/* Cinematic veil — dark on left, dissolves to right */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.88) 30%, rgba(10,10,10,0.45) 60%, rgba(10,10,10,0.1) 85%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Content — idéntico en ambos layouts */}
      <motion.div
        className="container-base relative z-20 pt-16"
        initial="hidden"
        animate="visible"
        variants={variants}
      >
        <div
          className="max-w-2xl"
          style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0) 100%)',
            borderRadius: '0.5rem',
            padding: '1rem 2rem 1rem 0',
            marginLeft: '-0.5rem',
          }}
        >
          {eyebrow && (
            <motion.div className="mb-5 flex items-center gap-3" variants={item}>
              <span className="accent-line-animated" aria-hidden="true" />
              <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                {eyebrow}
              </span>
            </motion.div>
          )}

          <motion.h1
            className="font-display text-white"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              textShadow: '0 0 50px rgba(0,174,239,0.22)',
            }}
            variants={item}
          >
            {heading}
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-body-lg"
            style={{
              color: '#F5F5F5',
              fontWeight: 500,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
            variants={item}
          >
            {subheading}
          </motion.p>

          <motion.div className="mt-10" variants={item}>
            <Button as="link" href={ctaHref} variant="primary" size="lg">
              {ctaLabel}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
