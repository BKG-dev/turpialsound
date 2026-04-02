'use client'

// Turpial Sound — Paso 2 del wizard: selección de modalidad/variante
// Muestra las variantes del servicio seleccionado en el paso anterior.
// Datos desde lib/bookings/catalog.ts (sin Prisma Client).

import { cn } from '@/lib/utils'
import { getVariantsForService } from '@/lib/bookings/catalog'

interface VariantSelectStepProps {
  serviceSlug: string
  selected: string | null
  onChange: (slug: string) => void
}

export function VariantSelectStep({ serviceSlug, selected, onChange }: VariantSelectStepProps) {
  const variants = getVariantsForService(serviceSlug)

  return (
    <div>
      <p className="mb-6 text-sm text-text-secondary">
        Elige la modalidad que mejor se ajusta a tu proyecto.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((variant) => {
          const isSelected = selected === variant.slug
          return (
            <button
              key={variant.slug}
              type="button"
              onClick={() => onChange(variant.slug)}
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
                {variant.name}
              </span>
              {variant.description && (
                <span className="mt-1 text-xs text-text-secondary">{variant.description}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
