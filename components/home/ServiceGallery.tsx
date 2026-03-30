'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lightbox } from '@/components/media/Lightbox'

interface ServiceItem {
  id: string
  tag: string
  title: string
  description: string
  imageUrl: string
  accentColor: 'gold' | 'cyan'
}

const items: ServiceItem[] = [
  {
    id: 'salas',
    tag: 'Ensayo',
    title: 'Salas de ensayo profesionales',
    description: 'Tratamiento acústico real. Equipamiento incluido. Disponibilidad flexible.',
    accentColor: 'gold',
    imageUrl: '/images/salas-ensayo.jpg',
  },
  {
    id: 'grabacion',
    tag: 'Grabación',
    title: 'Estudio de grabación',
    description: "El mismo espacio donde grabaron Oscar D'León y Dimensión Latina.",
    accentColor: 'cyan',
    imageUrl: '/images/estudio-grabacion.jpg',
  },
  {
    id: 'produccion',
    tag: 'Producción',
    title: 'Producción musical integral',
    description: 'De los arreglos al master. Un equipo, un lugar, un estándar.',
    accentColor: 'gold',
    imageUrl: '/images/produccion-musical.jpg',
  },
]

const images = items.map((item) => item.imageUrl)

export function ServiceGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  function openLightbox(index: number) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function prevImage() {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null,
    )
  }

  function nextImage() {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % images.length : null,
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, i) => {
          const tagColor =
            item.accentColor === 'cyan' ? 'text-accent-cyan' : 'text-accent-gold'
          const hoverBorder =
            item.accentColor === 'cyan'
              ? 'hover:border-accent-cyan/40'
              : 'hover:border-accent-gold/40'
          const placeholderBg =
            item.accentColor === 'cyan'
              ? 'radial-gradient(ellipse at 30% 30%, rgba(0,174,239,0.16) 0%, rgba(255,193,7,0.06) 60%, transparent 100%)'
              : 'radial-gradient(ellipse at 30% 30%, rgba(255,193,7,0.14) 0%, rgba(0,174,239,0.06) 60%, transparent 100%)'

          return (
            <motion.div
              key={item.id}
              className={cn(
                'group rounded-2xl border border-brand-border bg-brand-surface overflow-hidden',
                'transition-colors duration-350',
                hoverBorder,
              )}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Image — clickable for lightbox */}
              <button
                className="relative block w-full overflow-hidden"
                style={{ height: 180 }}
                onClick={() => openLightbox(i)}
                aria-label={`Ver imagen de ${item.title}`}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: placeholderBg }}
                  aria-hidden="true"
                />
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Bottom gradient */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.65) 100%)',
                  }}
                  aria-hidden="true"
                />
                {/* Zoom hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="rounded-full bg-black/50 px-3 py-1 font-display text-[9px] tracking-[0.25em] uppercase text-white backdrop-blur-sm">
                    Ver imagen
                  </span>
                </div>
              </button>

              {/* Card body */}
              <div className="p-6">
                <span className={cn('mb-2 block text-xs tracking-[0.2em] uppercase', tagColor)}>
                  {item.tag}
                </span>
                <h3 className="font-display text-sm leading-snug text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            activeIndex={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prevImage}
            onNext={nextImage}
          />
        )}
      </AnimatePresence>
    </>
  )
}
