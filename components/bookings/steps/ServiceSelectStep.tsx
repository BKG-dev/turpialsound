'use client'

// Turpial Sound — Paso 1 del wizard: selección de servicio
// Datos estáticos alineados con prisma/seed.ts (sin Prisma Client).
// Recibe el valor seleccionado y un callback onChange.

import { cn } from '@/lib/utils'

interface CatalogService {
  slug: string
  name: string
  description: string
}

// Alineado con prisma/seed.ts — mismos slugs y nombres
const CATALOG_SERVICES: CatalogService[] = [
  {
    slug: 'sala-ensayo',
    name: 'Sala de Ensayo',
    description: 'Espacio acústicamente tratado para ensayo de bandas y artistas.',
  },
  {
    slug: 'grabacion',
    name: 'Grabación',
    description: 'Sesión de grabación profesional en estudio.',
  },
  {
    slug: 'produccion-musical',
    name: 'Producción Musical',
    description: 'Producción integral de una pieza o proyecto musical.',
  },
  {
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y Masterización',
    description: 'Mezcla y masterización de material grabado.',
  },
  {
    slug: 'podcast-locucion',
    name: 'Podcast / Locución',
    description: 'Producción de podcast o sesión de locución profesional.',
  },
  {
    slug: 'video-session',
    name: 'Video Session',
    description: 'Sesión de video para artistas en set de producción audiovisual.',
  },
  {
    slug: 'arreglos-musicales',
    name: 'Arreglos Musicales',
    description: 'Arreglos y adaptaciones musicales para proyectos propios o de terceros.',
  },
]

interface ServiceSelectStepProps {
  selected: string | null
  onChange: (slug: string) => void
}

export function ServiceSelectStep({ selected, onChange }: ServiceSelectStepProps) {
  return (
    <div>
      <p className="mb-6 text-sm text-text-secondary">
        Elige el servicio que necesitas. Podrás seleccionar la modalidad en el paso siguiente.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATALOG_SERVICES.map((service) => {
          const isSelected = selected === service.slug
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => onChange(service.slug)}
              className={cn(
                'flex w-full flex-col items-start rounded-lg border p-4 text-left transition-colors duration-200',
                isSelected
                  ? 'border-accent-gold bg-accent-gold/5 text-text-primary'
                  : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/40 hover:text-text-primary',
              )}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'font-display text-sm font-semibold',
                  isSelected ? 'text-accent-gold' : 'text-text-primary',
                )}
              >
                {service.name}
              </span>
              <span className="mt-1 text-xs text-text-secondary">{service.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
