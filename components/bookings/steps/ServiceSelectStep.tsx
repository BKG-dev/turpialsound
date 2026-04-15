'use client'

// Turpial Sound — Paso 1 del wizard: selección de servicio
// Datos desde lib/bookings/catalog.ts (fuente compartida con VariantSelectStep).
// Recibe el valor seleccionado y un callback onChange.

import { cn } from '@/lib/utils'
import { CATALOG_SERVICES, getServiceStartingPriceUsd } from '@/lib/bookings/catalog'

interface ServiceSelectStepProps {
  selected: string | null
  onChange: (slug: string) => void
}

export function ServiceSelectStep({ selected, onChange }: ServiceSelectStepProps) {
  return (
    <div>
      <p className="mb-4 text-sm text-text-secondary md:mb-2 md:text-[11px]">
        Elige el servicio que necesitas. Podrás seleccionar la modalidad en el paso siguiente.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-2">
        {CATALOG_SERVICES.map((service) => {
          const isSelected = selected === service.slug
          const startingPriceUsd = getServiceStartingPriceUsd(service.slug)
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => onChange(service.slug)}
              className={cn(
                'flex w-full flex-col items-start rounded-lg border p-4 text-left transition-colors duration-200 md:min-h-[7rem] md:px-3.5 md:py-2.5',
                isSelected
                  ? 'border-accent-gold bg-accent-gold/5 text-text-primary'
                  : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/40 hover:text-text-primary',
              )}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'font-display text-sm font-semibold md:text-[0.9rem]',
                  isSelected ? 'text-accent-gold' : 'text-text-primary',
                )}
              >
                {service.name}
              </span>
              <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-text-secondary md:mt-0.5 md:text-[10px] md:leading-4">
                {service.description}
              </span>
              {startingPriceUsd !== null && (
                <span className="mt-auto self-end pt-3 text-[11px] font-medium text-accent-gold">
                  Desde {startingPriceUsd} USD
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
