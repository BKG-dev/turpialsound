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
          const iconLabel = service.name.trim().charAt(0).toUpperCase()
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => onChange(service.slug)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 md:min-h-[7rem] md:flex-col md:items-start md:gap-0 md:px-3.5 md:py-2.5',
                isSelected
                  ? 'border-accent-gold bg-accent-gold/5 text-text-primary'
                  : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/40 hover:text-text-primary',
              )}
              aria-pressed={isSelected}
            >
              <div className="flex w-full items-center gap-3 md:hidden">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-cyan/35 bg-accent-cyan/10 text-xs font-semibold text-accent-cyan">
                  {iconLabel}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-semibold text-text-primary">
                    {service.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-text-secondary">
                    {service.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {startingPriceUsd !== null && (
                    <span className="text-[11px] font-medium text-accent-gold">
                      Desde {startingPriceUsd} USD
                    </span>
                  )}
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-accent-gold bg-accent-gold text-brand-bg'
                        : 'border-brand-border bg-transparent',
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div className="hidden md:flex md:w-full md:flex-col md:items-start">
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
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
