'use client'

// Turpial Sound — Paso 2 del wizard: selección de modalidad/variante
// Muestra las variantes del servicio seleccionado en el paso anterior.
// Datos desde lib/bookings/catalog.ts (sin Prisma Client).

import { cn } from '@/lib/utils'
import {
  getAddonsForService,
  getVariantPriceLabel,
  getVariantsForService,
} from '@/lib/bookings/catalog'

interface VariantSelectStepProps {
  serviceSlug: string
  selected: string | null
  onChange: (slug: string) => void
}

export function VariantSelectStep({ serviceSlug, selected, onChange }: VariantSelectStepProps) {
  const variants = getVariantsForService(serviceSlug)
  const addons = getAddonsForService(serviceSlug)

  return (
    <div>
      <p className="mb-4 text-sm text-text-secondary md:mb-2 md:text-[11px]">
        Elige la modalidad que mejor se ajusta a tu proyecto.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-2">
        {variants.map((variant) => {
          const isSelected = selected === variant.slug
          const iconLabel = variant.name.trim().charAt(0).toUpperCase()
          const variantPriceLabel = getVariantPriceLabel(variant)
          return (
            <button
              key={variant.slug}
              type="button"
              onClick={() => onChange(variant.slug)}
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
                    {variant.name}
                  </p>
                  {variant.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-text-secondary">
                      {variant.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {variantPriceLabel && (
                    <span className="text-right text-[11px] font-medium text-accent-gold">
                      {variantPriceLabel}
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
                  {variant.name}
                </span>
                {variantPriceLabel && (
                  <span className="mt-0.5 text-[11px] font-medium text-accent-gold">
                    {variantPriceLabel}
                  </span>
                )}
                {variant.description && (
                  <span className="mt-1 line-clamp-4 text-xs leading-relaxed text-text-secondary md:text-[10px] md:leading-4">
                    {variant.description}
                  </span>
                )}
                {variant.badges && variant.badges.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {variant.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-brand-border px-2 py-0.5 text-[10px] text-text-muted"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {addons.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-border bg-brand-surface px-3.5 py-2.5 md:mt-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Adicionales disponibles
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-text-secondary">
            {addons.map((addon) => (
              <li key={addon.slug}>
                {addon.name}: {addon.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
