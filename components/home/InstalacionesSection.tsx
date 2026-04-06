'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence } from 'framer-motion'
import { Car, Sparkles, Coffee } from 'lucide-react'
import { Lightbox } from '@/components/media/Lightbox'

const instalaciones = [
  {
    Icon: Car,
    src: '/images/instalaciones.jpg',
    label: 'Acceso y seguridad',
    copy: 'Estacionamiento privado y techado con personal de seguridad permanente. Llega, descarga y enfócate — sin distracciones.',
    accent: 'gold' as const,
  },
  {
    Icon: Sparkles,
    src: '/images/instalaciones3.jpg',
    label: 'Estética que inspira',
    copy: 'Espacios diseñados con criterio ecléctico: cada rincón fue pensado para estimular la creatividad y sostener sesiones largas.',
    accent: 'cyan' as const,
  },
  {
    Icon: Coffee,
    src: '/images/instalaciones7.jpg',
    label: 'Comodidades de primer nivel',
    copy: 'Amenidades completas para que el equipo y los artistas trabajen cómodos. Porque las mejores tomas se graban cuando todo fluye.',
    accent: 'gold' as const,
  },
]

const images = instalaciones.map((i) => i.src)

export function InstalacionesSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  function handlePrev() {
    setLightboxIndex((i) => (i === null ? 0 : i === 0 ? images.length - 1 : i - 1))
  }
  function handleNext() {
    setLightboxIndex((i) => (i === null ? 0 : i === images.length - 1 ? 0 : i + 1))
  }

  return (
    <>
      <div className="mt-12 grid gap-12 sm:grid-cols-3">
        {instalaciones.map(({ Icon, src, label, copy, accent }, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setLightboxIndex(idx)}
            className={`card-premium-wrapper${accent === 'gold' ? ' card-premium-wrapper--gold' : ''} group w-full rounded-2xl bg-brand-bg text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan`}
            aria-label={`Ampliar imagen: ${label}`}
          >
            <div className="relative h-72 w-full overflow-hidden rounded-t-2xl">
              <Image
                src={src}
                alt={label}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/60 to-transparent" />
              {/* Hover hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span
                  className="rounded-full px-3 py-1.5 font-display text-[10px] tracking-[0.2em] uppercase text-white"
                  style={{ background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(8px)' }}
                >
                  Ver imagen
                </span>
              </div>
            </div>
            <div className="p-7">
              <Icon
                size={20}
                className="mb-4"
                style={{ color: accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                aria-hidden="true"
              />
              <h3 className="font-display text-sm font-semibold text-text-primary">{label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{copy}</p>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            activeIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </>
  )
}
