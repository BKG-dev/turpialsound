'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Lightbox } from '@/components/media/Lightbox'

// ── Legacy type kept for any external imports ──────────────────────────────
export interface GalleryItem {
  id: string
  title: string
  description?: string
  imageUrl?: string
  tag?: string
  accentColor?: 'gold' | 'cyan'
}

interface Mac3DGalleryProps {
  /** Array of image paths to display in the 3D carousel */
  images: string[]
  /** Accessible label prefix for alt attributes */
  title?: string
  className?: string
}

/**
 * True Apple-style 3D carousel.
 * Active card is front-facing; adjacent cards are rotated inward with perspective depth.
 * Clicking the active card opens an integrated fullscreen lightbox.
 */
export function Mac3DGallery({ images, title, className }: Mac3DGalleryProps) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const count = images.length

  if (count === 0) return null

  const prev = () => setActive((a) => (a - 1 + count) % count)
  const next = () => setActive((a) => (a + 1) % count)

  /**
   * Converts raw index distance from active into a signed offset
   * in [-floor(count/2), ceil(count/2)], so wrapping works correctly.
   */
  function getOffset(index: number): number {
    const raw = ((index - active) % count + count) % count
    return raw > Math.floor(count / 2) ? raw - count : raw
  }

  return (
    <>
      <div className={cn('relative', className)}>
        {/* ── 3D Stage ──────────────────────────────────────────────── */}
        <div
          className="relative mx-auto flex items-center justify-center"
          style={{ perspective: '900px', height: '360px' }}
        >
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
                    ? 'border-accent-cyan/30 cursor-zoom-in'
                    : 'border-brand-border cursor-pointer',
                )}
                style={{
                  width: 288,
                  height: 216,
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  x: offset * 260,
                  rotateY: -offset * 32,
                  scale: isActive ? 1 : 0.82,
                  opacity: isActive ? 1 : 0.55,
                  zIndex: isActive ? 10 : 1,
                }}
                transition={{ type: 'spring', stiffness: 270, damping: 28 }}
                onClick={() => {
                  if (isActive) {
                    setLightboxOpen(true)
                  } else {
                    setActive(i)
                  }
                }}
              >
                {/* Gradient placeholder (shown before/if image fails) */}
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
                  sizes="(max-width: 768px) 90vw, 288px"
                  className="object-cover"
                  priority={isActive}
                />

                {/* Active card: subtle shine overlay */}
                {isActive && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
                    }}
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-5">
            <button
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full glass-surface border border-accent-cyan/30 text-accent-cyan transition-all hover:border-accent-cyan/60 hover:shadow-glow-cyan-sm"
              aria-label="Imagen anterior"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === active
                      ? 'h-1.5 w-5 bg-accent-cyan'
                      : 'h-1.5 w-1.5 bg-text-muted/40 hover:bg-text-muted/70',
                  )}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full glass-surface border border-accent-cyan/30 text-accent-cyan transition-all hover:border-accent-cyan/60 hover:shadow-glow-cyan-sm"
              aria-label="Imagen siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Click-to-open hint on active card */}
        {count > 0 && (
          <p className="mt-3 text-center font-display text-[10px] tracking-[0.2em] uppercase text-text-muted">
            Clic en la imagen central para ampliar
          </p>
        )}
      </div>

      {/* ── Integrated Lightbox ──────────────────────────────────────── */}
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
