'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PRODUCTION_MUSIC_ADDONS,
  getProductionMusicAddonCategoryEntries,
  type ProductionMusicAddonDefinition,
} from '@/lib/bookings/production-music'

interface ProductionMusicAddonsStepProps {
  selectedAddonIds: string[]
  selectedAddonQuantities: Record<string, number>
  onToggleAddon: (addonId: string) => void
  onQuantityChange: (addonId: string, quantity: number) => void
}

function AddonChip({
  addon,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
}: {
  addon: ProductionMusicAddonDefinition
  isSelected: boolean
  quantity: number
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 transition-colors',
        isSelected
          ? 'border-accent-gold bg-accent-gold/10'
          : 'border-brand-border bg-brand-surface hover:border-accent-gold/35',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2">
          <div
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
              isSelected
                ? 'border-accent-gold bg-accent-gold text-brand-bg'
                : 'border-brand-border',
            )}
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
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-text-primary">
              {addon.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-text-muted">
              {addon.description}
            </span>
          </div>
        </div>
      </button>

      {isSelected && addon.quantityEnabled && (
        <div className="mt-2 flex items-center gap-2 border-t border-brand-border pt-2">
          <span className="text-[10px] uppercase tracking-wide text-text-muted">
            Cantidad
          </span>
          <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-bg/30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onQuantityChange(Math.max(1, quantity - 1))
              }}
              disabled={quantity <= 1}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                quantity <= 1
                  ? 'cursor-not-allowed text-text-muted/40'
                  : 'text-text-primary hover:text-accent-gold',
              )}
              aria-label="Reducir cantidad"
            >
              -
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold text-text-primary">
              {quantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onQuantityChange(Math.min(12, quantity + 1))
              }}
              disabled={quantity >= 12}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                quantity >= 12
                  ? 'cursor-not-allowed text-text-muted/40'
                  : 'text-text-primary hover:text-accent-gold',
              )}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddonCategoryGroup({
  title,
  description,
  addons,
  selectedAddonIds,
  selectedAddonQuantities,
  onToggleAddon,
  onQuantityChange,
}: {
  title: string
  description: string
  addons: ProductionMusicAddonDefinition[]
  selectedAddonIds: string[]
  selectedAddonQuantities: Record<string, number>
  onToggleAddon: (addonId: string) => void
  onQuantityChange: (addonId: string, quantity: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-bg/30 transition-colors"
      >
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="mt-0.5 text-[11px] text-text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {addons.filter((a) => selectedAddonIds.includes(a.id)).length > 0 && (
            <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[10px] font-medium text-accent-gold">
              {addons.filter((a) => selectedAddonIds.includes(a.id)).length}
            </span>
          )}
          <svg
            className={cn(
              'h-4 w-4 text-text-muted transition-transform',
              isOpen && 'rotate-180',
            )}
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-brand-border px-4 pb-4 pt-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {addons.map((addon) => (
              <AddonChip
                key={addon.id}
                addon={addon}
                isSelected={selectedAddonIds.includes(addon.id)}
                quantity={selectedAddonQuantities[addon.id] ?? 1}
                onToggle={() => onToggleAddon(addon.id)}
                onQuantityChange={(quantity) => onQuantityChange(addon.id, quantity)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProductionMusicAddonsStep({
  selectedAddonIds,
  selectedAddonQuantities,
  onToggleAddon,
  onQuantityChange,
}: ProductionMusicAddonsStepProps) {
  const categoryEntries = getProductionMusicAddonCategoryEntries()
  const selectedCount = PRODUCTION_MUSIC_ADDONS.filter((a) =>
    selectedAddonIds.includes(a.id),
  ).length

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              Instrumentos y voces adicionales
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Selecciona los instrumentos que necesitas para tu produccion.
              El total estimado se actualizara internamente.
            </p>
          </div>
          {selectedCount > 0 && (
            <span className="shrink-0 rounded-full bg-accent-gold/15 px-3 py-1 text-[11px] font-semibold text-accent-gold">
              {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {categoryEntries.map((entry) => (
          <AddonCategoryGroup
            key={entry.category}
            title={entry.title}
            description={entry.description}
            addons={entry.addons}
            selectedAddonIds={selectedAddonIds}
            selectedAddonQuantities={selectedAddonQuantities}
            onToggleAddon={onToggleAddon}
            onQuantityChange={onQuantityChange}
          />
        ))}
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-bg/20 px-4 py-3 text-sm leading-snug text-text-secondary">
        El total estimado incluye los adicionales seleccionados. El equipo validara el alcance
        final por WhatsApp antes de confirmar.
      </div>
    </div>
  )
}
