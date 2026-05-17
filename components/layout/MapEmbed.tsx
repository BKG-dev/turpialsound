'use client'

import { useState } from 'react'
import { Navigation2, MapPin } from 'lucide-react'

const MAPS_URL =
  'https://www.google.com/maps/place/Turpial+Sound/@10.5008586,-66.8952916,17z/data=!3m1!4b1!4m6!3m5!1s0x8c2a59e88689e50f:0x9e3a1d11c67a4d53!8m2!3d10.5008586!4d-66.8927167!16s%2Fg%2F11vspg56w1?entry=ttu'

const EMBED_URL =
  'https://maps.google.com/maps?q=10.5008586,-66.8927167&z=17&output=embed'

export function MapEmbed() {
  const [activated, setActivated] = useState(false)

  return (
    <div className="mt-6">
      {/* Map container */}
      <div className="relative overflow-hidden rounded-lg border border-white/[0.06]">
        <iframe
          src={EMBED_URL}
          width="100%"
          height="160"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación de Turpial Sound en Google Maps"
        />

        {/* Tap-to-activate overlay — desaparece al tocar */}
        {!activated && (
          <button
            type="button"
            onClick={() => setActivated(true)}
            aria-label="Activar mapa interactivo"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2
                       bg-brand-bg/70 backdrop-blur-[2px]
                       transition-opacity duration-250 hover:bg-brand-bg/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
          >
            <MapPin size={20} className="text-accent-cyan" aria-hidden="true" />
            <span className="font-display text-[0.65rem] tracking-[0.2em] text-text-secondary uppercase">
              Toca para explorar
            </span>
          </button>
        )}
      </div>

      {/* "¿Cómo llegar?" — abre Maps externo */}
      <a
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-secondary
                   transition-colors duration-250 hover:text-accent-cyan"
      >
        <Navigation2 size={12} aria-hidden="true" />
        ¿Cómo llegar?
      </a>
    </div>
  )
}
