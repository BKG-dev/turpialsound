'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Lightbox } from '@/components/media/Lightbox'

export interface GalleryItem {
  id: string
  title: string
  description?: string
  imageUrl?: string
  tag?: string
  accentColor?: 'gold' | 'cyan'
}

interface Mac3DGalleryProps {
  images: string[]
  title?: string
  className?: string
}

export function Mac3DGallery({ images, title, className }: Mac3DGalleryProps) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const count = images.length

  if (count === 0) return null

  const prev = () => setActive((a) => (a - 1 + count) % count)
  const next = () => setActive((a) => (a + 1) % count)

  function getOffset(index: number): number {
    const raw = ((index - active) % count + count) % count
    return raw > Math.floor(count / 2) ? raw - count : raw
  }

  return (
    <>
      <div className={cn('relative w-full', className)}>
        {/* ── 3D Stage ──────────────────────────────────────────────── */}
        <div
          className="relative mx-auto flex items-center justify-center"
          style={{ perspective: '1100px', height: '460px' }}
        >
          {/* Glow pool — 80% width, centered under active card */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '80%',
              height: '70%',
              background:
                'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(0,174,239,0.18) 0%, rgba(255,193,7,0.07) 45%, transparent 80%)',
              filter: 'blur(32px)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {images.map((src, i) => {
            const offset = getOffset(i)
            if (Math.abs(offset) > 1) return null

            const isActive = offset === 0

            return (
              <motion.div
                key={i}
                className={cn(
                  'absolute overflow-hidden rounded-2xl border',
                  isActive
                    ? 'border-accent-cyan/40 cursor-zoom-in'
                    : 'border-brand-border/60 cursor-pointer',
                )}
                style={{ transformStyle: 'preserve-3d' }}
                animate={{
                  width: isActive ? 500 : 260,
                  height: isActive ? 340 : 195,
                  x: offset * 340,
                  y: isActive ? -24 : 12,
                  rotateY: -offset * 52,
                  scale: 1,
                  opacity: isActive ? 1 : 0.5,
                  zIndex: isActive ? 10 : 2,
                  boxShadow: isActive
                    ? '0 32px 80px rgba(0,174,239,0.22), 0 8px 32px rgba(0,0,0,0.55)'
                    : '0 8px 24px rgba(0,0,0,0.35)',
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                onClick={() => {
                  if (isActive) setLightboxOpen(true)
                  else setActive(i)
                }}
              >
                {/* Gradient placeholder */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      i % 2 === 0
                        ? 'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(0,174,239,0.14) 0%, rgba(255,193,7,0.06) 60%, transparent 100%)'
                        : 'radial-gradient(ellipse 70% 60% at 70% 60%, rgba(255,193,7,0.12) 0%, rgba(0,174,239,0.05) 60%, transparent 100%)',
                  }}
                  aria-hidden="true"
                />
                <Image
                  src={src}
                  alt={title ? `${title} — foto ${i + 1}` : `Foto ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 90vw, 500px"
                  className="object-cover"
                  priority={isActive}
                />

                {/* Active: shine overlay */}
                {isActive && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 55%)',
                    }}
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            )
          })}

          {/* ── Nav buttons — always visible, sides of the stage ── */}
          {count > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full glass-surface border border-accent-cyan/30 text-accent-cyan transition-all hover:border-accent-cyan/70 hover:shadow-glow-cyan-sm"
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={next}
                className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full glass-surface border border-accent-cyan/30 text-accent-cyan transition-all hover:border-accent-cyan/70 hover:shadow-glow-cyan-sm"
                aria-label="Imagen siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* ── Hint ── */}
        <p className="mt-2 text-center font-display text-[10px] tracking-[0.2em] uppercase text-text-muted/60">
          Clic en la imagen central para ampliar
        </p>

        {/* ── Separator ── */}
        <div className="mt-8 flex items-center justify-center gap-4" aria-hidden="true">
          <div
            className="h-px flex-1"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(0,174,239,0.15) 40%, rgba(0,174,239,0.35) 100%)',
            }}
          />
          <div className="flex items-center gap-1.5">
            <div className="h-px w-4 bg-accent-cyan/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" />
            <div className="h-px w-4 bg-accent-cyan/40" />
          </div>
          <div
            className="h-px flex-1"
            style={{
              background:
                'linear-gradient(to left, transparent, rgba(0,174,239,0.15) 40%, rgba(0,174,239,0.35) 100%)',
            }}
          />
        </div>
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            images={images}
            activeIndex={active}
            onClose={() => setLightboxOpen(false)}
            onPrev={() => setActive((a) => (a - 1 + count) % count)}
            onNext={() => setActive((a) => (a + 1) % count)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
