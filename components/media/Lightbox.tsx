'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface LightboxProps {
  images: string[]
  activeIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function Lightbox({ images, activeIndex, onClose, onPrev, onNext }: LightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  const src = images[activeIndex]
  if (!src) return null

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(10,10,10,0.93)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
    >
      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-accent-cyan/30 bg-black/60 text-accent-cyan backdrop-blur-sm transition-all hover:border-accent-cyan/70 hover:shadow-glow-cyan-sm"
          aria-label="Imagen anterior"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Image container — close button lives INSIDE here */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          className="relative max-h-[85vh] w-full max-w-[90vw] rounded-2xl overflow-hidden"
          style={{ aspectRatio: '16/9' }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={src}
            alt={`Imagen ${activeIndex + 1} de ${images.length}`}
            fill
            className="object-contain"
            sizes="90vw"
            priority
          />

          {/* ── Close button — anchored to image top-right corner ── */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-250 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            style={{
              background: 'rgba(10,10,10,0.82)',
              border: '1px solid rgba(0,174,239,0.45)',
              boxShadow: '0 0 24px rgba(0,0,0,0.7), 0 0 12px rgba(0,174,239,0.22)',
            }}
            aria-label="Cerrar imagen ampliada"
          >
            <X size={18} style={{ color: '#F5F5F5' }} strokeWidth={2.5} />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-accent-cyan/30 bg-black/60 text-accent-cyan backdrop-blur-sm transition-all hover:border-accent-cyan/70 hover:shadow-glow-cyan-sm"
          aria-label="Imagen siguiente"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-white/40">
            {activeIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </motion.div>
  )
}
