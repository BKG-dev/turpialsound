'use client'

import { cn } from '@/lib/utils'
import { deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import {
  CUSTOM_BUNDLE_CATEGORIES,
  getCustomBundleIncludedItems,
  getCustomBundleItemsForCategory,
} from '@/lib/bookings/custom-bundle'
import type {
  CustomBundleEstimate,
  CustomBundleItem,
  CustomBundleSelection,
} from '@/lib/bookings/types'

const START_TIMES: string[] = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Por definir'

  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Por definir'

  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min'
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 hora' : `${hours} horas`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  return `${hours}h ${String(remaining).padStart(2, '0')}m`
}

function formatQuantityLabel(item: CustomBundleItem, quantity: number): string {
  if (item.quantityType === 'hour') {
    return quantity === 1 ? '1 hora' : `${quantity} horas`
  }

  if (item.quantityType === 'episode') {
    return quantity === 1 ? '1 episodio' : `${quantity} episodios`
  }

  if (item.quantityType === 'unit') {
    return quantity === 1 ? '1 unidad' : `${quantity} unidades`
  }

  return quantity === 1 ? '1 tema' : `${quantity} temas`
}

function getSelectionForItem(selections: CustomBundleSelection[], itemSlug: string) {
  return selections.find((selection) => selection.itemSlug === itemSlug) ?? null
}

function SummaryLine({
  label,
  value,
  detail,
  muted = false,
}: {
  label: string
  value: string
  detail?: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-border/70 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className="min-w-0">
        <span className={cn('block text-[11px]', muted ? 'text-text-muted' : 'text-text-secondary')}>
          {label}
        </span>
        {detail && <span className="mt-0.5 block text-[10px] text-text-muted">{detail}</span>}
      </span>
      <span className={cn('shrink-0 text-[11px] font-semibold', muted ? 'text-text-secondary' : 'text-text-primary')}>
        {value}
      </span>
    </div>
  )
}

interface CustomBundleStepProps {
  selections: CustomBundleSelection[]
  eventDate: string | null
  startTime: string | null
  estimate: CustomBundleEstimate
  onEventDateChange: (value: string | null) => void
  onStartTimeChange: (value: string | null) => void
  onToggleItem: (itemSlug: string) => void
  onQuantityChange: (itemSlug: string, nextQuantity: number) => void
  onSessionDurationChange: (itemSlug: string, nextDurationMinutes: number | null) => void
}

export function CustomBundleStep({
  selections,
  eventDate,
  startTime,
  estimate,
  onEventDateChange,
  onStartTimeChange,
  onToggleItem,
  onQuantityChange,
  onSessionDurationChange,
}: CustomBundleStepProps) {
  const endTime =
    startTime && estimate.totalDurationMinutes > 0
      ? deriveEndTime(startTime, estimate.totalDurationMinutes)
      : null
  const hasBlockingIssues = estimate.blockingIssues.length > 0
  const includedItems = getCustomBundleIncludedItems()
  const aggregateOnlyLines = estimate.lines.filter(
    (line) => line.item.clientPriceDisplay === 'aggregate_only',
  )
  const aggregateOnlyQuantity = aggregateOnlyLines.reduce((total, line) => total + line.quantity, 0)

  return (
    <div className="space-y-4 md:space-y-3">
      <div className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2 text-[11px] leading-snug text-text-secondary">
        Combina servicios compatibles, ajusta las cantidades y reserva un unico bloque continuo.
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] xl:gap-2.5">
        <div className="space-y-3 md:space-y-2">
          <section className="space-y-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Agenda del paquete
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                Selecciona la fecha y la hora de inicio. El final se calcula automaticamente a partir del total.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-2">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">Fecha</span>
                <input
                  type="date"
                  value={eventDate ?? ''}
                  onChange={(event) => onEventDateChange(event.target.value || null)}
                  className={cn(
                    'w-full rounded-lg border bg-brand-bg/30 px-3 py-2 text-sm text-text-primary outline-none transition-colors',
                    'border-brand-border focus:border-accent-gold/50',
                  )}
                />
              </label>

              <div className="md:col-span-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Hora de inicio</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7">
                  {START_TIMES.map((time) => {
                    const isSelected = startTime === time
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => onStartTimeChange(time)}
                        className={cn(
                          'rounded-md border px-2 py-2 text-[11px] font-medium transition-colors',
                          isSelected
                            ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                            : 'border-brand-border bg-brand-bg/20 text-text-secondary hover:border-accent-gold/50 hover:text-text-primary',
                        )}
                        aria-pressed={isSelected}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <SummaryLine label="Fecha" value={formatDate(eventDate)} />
              <SummaryLine label="Hora" value={startTime ?? 'Por definir'} />
              <SummaryLine label="Final" value={endTime ?? 'Por definir'} />
            </div>
          </section>

          <div className="space-y-3 md:space-y-2">
            {CUSTOM_BUNDLE_CATEGORIES.map((category) => {
              const categoryItems = getCustomBundleItemsForCategory(category.slug)
              if (categoryItems.length === 0) return null

              return (
                <section
                  key={category.slug}
                  className="space-y-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5"
                >
                  <div>
                    <h3 className="font-display text-sm font-semibold text-text-primary">{category.name}</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {categoryItems.map((item) => {
                      const selection = getSelectionForItem(selections, item.slug)
                      const isSelected = Boolean(selection)
                      const line = estimate.lines.find((entry) => entry.item.slug === item.slug)
                      const isExclusiveSala = item.groupSlug === 'sala-de-ensayo'
                      const isAggregateOnly = item.clientPriceDisplay === 'aggregate_only'
                      const lineLabel = isAggregateOnly
                        ? 'Se incluira en el total consolidado del paquete.'
                        : line
                          ? `${formatQuantityLabel(item, line.quantity)} · ${line.lineTotalUsd} USD`
                          : `${item.unitPriceUsd} USD / ${item.commercialUnit}`
                      const durationLabel =
                        line && line.durationMinutes > 0 ? formatDuration(line.durationMinutes) : null
                      const disableQuantity = !isSelected || item.maximumQuantity === 1 || item.fixedPrice
                      const canEditDuration = item.requiresSessionDuration

                      return (
                        <div
                          key={item.slug}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 transition-colors',
                            isSelected
                              ? 'border-accent-gold/45 bg-accent-gold/5'
                              : 'border-brand-border bg-brand-bg/25',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-text-primary">{item.name}</h4>
                                {isExclusiveSala && (
                                  <span className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-gold">
                                    Modalidad unica
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                                {item.description}
                              </p>
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-text-muted">
                                {item.clientPriceDisplay === 'aggregate_only'
                                  ? `Unidad: ${item.commercialUnit}`
                                  : item.clientPriceDisplay === 'included'
                                    ? 'Incluido'
                                    : `${item.unitPriceUsd} USD / ${item.commercialUnit}`}
                              </p>
                            </div>

                            <label
                              className={cn(
                                'flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                                isSelected
                                  ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                                  : 'border-brand-border bg-brand-bg/25 text-text-secondary hover:border-accent-gold/50 hover:text-text-primary',
                              )}
                            >
                              <input
                                type={isExclusiveSala ? 'radio' : 'checkbox'}
                                name={isExclusiveSala ? 'sala-de-ensayo' : item.categorySlug}
                                checked={isSelected}
                                onChange={() => onToggleItem(item.slug)}
                                className="h-3.5 w-3.5 accent-accent-gold"
                              />
                              <span>{isSelected ? 'Seleccionado' : isExclusiveSala ? 'Elegir' : 'Activar'}</span>
                            </label>
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wide text-text-muted">
                                Cantidad
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onQuantityChange(item.slug, (selection?.quantity ?? item.minimumQuantity) - item.quantityStep)
                                  }
                                  disabled={disableQuantity}
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-semibold transition-colors',
                                    disableQuantity
                                      ? 'cursor-not-allowed border-brand-border/60 bg-brand-bg/20 text-text-muted'
                                      : 'border-brand-border bg-brand-bg/30 text-text-secondary hover:border-accent-gold/50 hover:text-text-primary',
                                  )}
                                  aria-label={`Disminuir cantidad de ${item.name}`}
                                >
                                  -
                                </button>
                                <span className="min-w-10 rounded-md border border-brand-border bg-brand-bg/30 px-3 py-1.5 text-center text-sm font-semibold text-text-primary">
                                  {selection?.quantity ?? item.minimumQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onQuantityChange(item.slug, (selection?.quantity ?? item.minimumQuantity) + item.quantityStep)
                                  }
                                  disabled={disableQuantity}
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-semibold transition-colors',
                                    disableQuantity
                                      ? 'cursor-not-allowed border-brand-border/60 bg-brand-bg/20 text-text-muted'
                                      : 'border-brand-border bg-brand-bg/30 text-text-secondary hover:border-accent-gold/50 hover:text-text-primary',
                                  )}
                                  aria-label={`Aumentar cantidad de ${item.name}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                              <span>{lineLabel}</span>
                              {durationLabel && <span>Duracion: {durationLabel}</span>}
                            </div>
                          </div>

                          {canEditDuration && isSelected && (
                            <div className="mt-2">
                              <p className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">
                                Duracion de la sesion
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {[60, 120, 180, 240].map((durationMinutes) => {
                                  const isDurationSelected = selection?.sessionDurationMinutes === durationMinutes
                                  return (
                                    <button
                                      key={durationMinutes}
                                      type="button"
                                      onClick={() => onSessionDurationChange(item.slug, durationMinutes)}
                                      className={cn(
                                        'rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                                        isDurationSelected
                                          ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                                          : 'border-brand-border bg-brand-bg/25 text-text-secondary hover:border-accent-gold/50 hover:text-text-primary',
                                      )}
                                      aria-pressed={isDurationSelected}
                                    >
                                      {formatDuration(durationMinutes)}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 md:space-y-2">
          <section className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Resumen en vivo
            </h3>

            <div className="mt-2 space-y-1.5">
              <SummaryLine
                label="Servicios seleccionados"
                value={String(estimate.selectionCount)}
                detail="Solo se cuentan los servicios pagados."
              />
              <SummaryLine label="Duracion total" value={formatDuration(estimate.totalDurationMinutes)} />
              <SummaryLine label="Subtotal" value={`${estimate.subtotalUsd} USD`} />
              {aggregateOnlyLines.length > 0 && (
                <SummaryLine
                  label="Adicionales del paquete"
                  value={`${estimate.additionalSubtotalUsd} USD`}
                  detail={`${aggregateOnlyQuantity} adicionales seleccionados`}
                />
              )}
              <SummaryLine
                label="Recargo de fin de semana"
                value={`${estimate.adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)} USD`}
              />
              <SummaryLine
                label="Tecnico de sonido"
                value="Incluido"
                detail="0 USD"
                muted
              />
              <SummaryLine
                label="Backline"
                value="Incluido"
                detail="0 USD"
                muted
              />
              <SummaryLine
                label="Total estimado"
                value={`${estimate.estimatedTotalUsd} USD`}
              />
            </div>

            {includedItems.length > 0 && (
              <div className="mt-2 rounded-md border border-brand-border/70 bg-brand-bg/30 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Incluidos automaticos</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {includedItems.map((item) => (
                    <span
                      key={item.slug}
                      className="rounded-full border border-brand-border bg-brand-surface px-2 py-0.5 text-[10px] text-text-secondary"
                    >
                      {item.name} · 0 USD
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasBlockingIssues && (
              <div className="mt-2 space-y-1 rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300">
                  Revisa la combinacion
                </p>
                <ul className="space-y-1 text-[11px] text-red-200">
                  {estimate.blockingIssues.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-2 text-[10px] leading-snug text-text-muted">
              El total consolidado no incluye cambios de calendario fuera de este bloque preview.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
