'use client'

import { cn } from '@/lib/utils'
import { CATALOG_SERVICES, getServiceStartingPriceUsd } from '@/lib/bookings/catalog'

interface ServiceSelectStepProps {
  selected: string | null
  isCustomBundleSelected: boolean
  isPreview: boolean
  onChange: (slug: string) => void
  onSelectCustomBundle: () => void
}

export function ServiceSelectStep({
  selected,
  isCustomBundleSelected,
  isPreview,
  onChange,
  onSelectCustomBundle,
}: ServiceSelectStepProps) {
  return (
    <div>
      <p className="mb-4 hidden text-sm text-text-secondary md:mb-2 md:block md:text-[11px]">
        Elige el servicio que necesitas. Podras seleccionar la modalidad en el paso siguiente.
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
                'relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 md:min-h-[7rem] md:flex-col md:items-start md:gap-0 md:px-3.5 md:py-2.5',
                isSelected
                  ? 'border-accent-gold bg-accent-gold/5 text-text-primary'
                  : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/40 hover:text-text-primary',
              )}
              aria-pressed={isSelected}
            >
              <div className="flex w-full items-start gap-2.5 md:hidden">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-cyan/35 bg-accent-cyan/10 text-[11px] font-semibold text-accent-cyan">
                  {iconLabel}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="pr-5 font-display text-[13px] font-semibold leading-tight text-text-primary">
                    {service.name}
                  </p>
                  <div className="mt-0.5 flex items-end justify-between gap-2">
                    <p className="line-clamp-2 text-[11px] leading-snug text-text-secondary">
                      {service.description}
                    </p>
                    {startingPriceUsd !== null && (
                      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-accent-gold">
                        Desde {startingPriceUsd} USD
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isSelected && (
                <span
                  className="absolute right-2 top-2 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent-gold text-brand-bg md:hidden"
                  aria-hidden="true"
                >
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

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

        {isPreview && (
          <button
            type="button"
            onClick={onSelectCustomBundle}
            className={cn(
              'relative col-span-full flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 md:min-h-[7rem] md:flex-col md:items-start md:gap-0 md:px-3.5 md:py-2.5',
              isCustomBundleSelected
                ? 'border-accent-gold bg-accent-gold/5 text-text-primary'
                : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/40 hover:text-text-primary',
            )}
            aria-pressed={isCustomBundleSelected}
          >
            <div className="flex w-full items-start gap-2.5 md:hidden">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-gold/35 bg-accent-gold/10 text-[11px] font-semibold text-accent-gold">
                P
              </span>

              <div className="min-w-0 flex-1">
                <p className="pr-5 font-display text-[13px] font-semibold leading-tight text-text-primary">
                  Arma tu paquete
                </p>
                <div className="mt-0.5 flex items-end justify-between gap-2">
                  <p className="line-clamp-2 text-[11px] leading-snug text-text-secondary">
                    Combina servicios compatibles, ajusta las cantidades y reserva un unico bloque continuo.
                  </p>
                </div>
              </div>
            </div>

            {isCustomBundleSelected && (
              <span
                className="absolute right-2 top-2 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent-gold text-brand-bg md:hidden"
                aria-hidden="true"
              >
                <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}

            <div className="hidden md:flex md:w-full md:flex-col md:items-start">
              <span
                className={cn(
                  'font-display text-sm font-semibold md:text-[0.9rem]',
                  isCustomBundleSelected ? 'text-accent-gold' : 'text-text-primary',
                )}
              >
                Arma tu paquete
              </span>
              <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-text-secondary md:mt-0.5 md:text-[10px] md:leading-4">
                Combina servicios compatibles, ajusta las cantidades y reserva un unico bloque continuo.
              </span>
              <span className="mt-auto self-end pt-3 text-[11px] font-medium text-accent-gold">
                Solo en Preview
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
