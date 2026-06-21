'use client'

import type { ReactNode } from 'react'
import { CATALOG_SERVICES, CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import {
  countCustomBundleAggregateOnlySelections,
  formatCustomBundlePriceDisplay,
  splitCustomBundleEstimateLines,
} from '@/lib/bookings/custom-bundle'
import {
  getRecordingAddonVisualTopicLabel,
  getSelectedRecordingAddonVisualLines,
  type RecordingAddonDefinition,
} from '@/lib/bookings/recording-addons'
import type { BookingEstimate, CustomBundleEstimate, BookingMode } from '@/lib/bookings/types'

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5 md:space-y-1 md:px-2.5 md:py-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-[10px]">
        {title}
      </h3>
      {children}
    </section>
  )
}

function SummaryPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 rounded-md bg-brand-bg/30 px-2.5 py-2 md:px-2 md:py-1.5">
      <p className="text-[11px] uppercase tracking-wide text-text-muted md:text-[10px]">{label}</p>
      <p className="break-words text-sm font-medium text-text-primary md:text-[12px]">{value}</p>
    </div>
  )
}

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-brand-border px-2 py-0.5 text-[10px] text-text-secondary md:text-[9px]">
      {children}
    </span>
  )
}

function EstimateLine({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string
  value: string
  detail?: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-border/70 py-2 last:border-b-0 last:pb-0 first:pt-0 md:gap-2 md:py-1.5">
      <span>
        <span
          className={
            emphasis
              ? 'text-[11px] font-semibold uppercase tracking-wide text-text-primary md:text-[10px]'
              : 'text-[12px] text-text-secondary md:text-[11px]'
          }
        >
          {label}
        </span>
        {detail && <span className="mt-0.5 block text-[11px] text-text-muted md:text-[10px]">{detail}</span>}
      </span>
      <span
        className={
          emphasis
            ? 'text-sm font-semibold text-accent-gold md:text-[14px]'
            : 'text-sm font-medium text-text-primary md:text-[12px]'
        }
      >
        {value}
      </span>
    </div>
  )
}

function getHourLabel(quantity: number): string {
  return quantity === 1 ? '1 hora' : `${quantity} horas`
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

interface SummaryStepProps {
  bookingMode: BookingMode
  serviceSlug?: string | null
  variantSlug?: string | null
  eventDate: string
  startTime: string
  durationMinutes: number
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  recordingAddonSlugs: string[]
  recordingAddonPreviewTotalUsd: number
  availableRecordingAddons: RecordingAddonDefinition[]
  projectTopicCount: number
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  estimate?: BookingEstimate
  customBundleEstimate?: CustomBundleEstimate
}

export function SummaryStep({
  bookingMode,
  serviceSlug,
  variantSlug,
  eventDate,
  startTime,
  durationMinutes,
  extrasNotes,
  extrasTechnician,
  extrasBackline,
  recordingAddonSlugs,
  recordingAddonPreviewTotalUsd,
  availableRecordingAddons,
  projectTopicCount,
  requesterName,
  requesterEmail,
  requesterPhone,
  estimate,
  customBundleEstimate,
}: SummaryStepProps) {
  if (bookingMode === 'custom_bundle' && customBundleEstimate) {
    const bundleEndTime = deriveEndTime(startTime, customBundleEstimate.totalDurationMinutes)
    const { itemizedLines, includedLines } = splitCustomBundleEstimateLines(
      customBundleEstimate.lines,
    )
    const aggregateOnlyCount = countCustomBundleAggregateOnlySelections(customBundleEstimate.lines)
    const weekendAdjustmentTotal = customBundleEstimate.adjustments.reduce(
      (total, adjustment) => total + adjustment.amountUsd,
      0,
    )

    return (
      <div className="space-y-3 md:space-y-2">
        <p className="text-sm text-text-secondary md:text-[10px] md:leading-tight">
          Revisa el paquete antes de simular. El equipo de Turpial Sound no recibira una solicitud real en Preview.
        </p>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-2">
          <div className="space-y-3 md:space-y-2">
            <SummaryCard title="Agenda del paquete">
              <div className="grid grid-cols-1 gap-2 md:gap-1.5 sm:grid-cols-2">
                <SummaryPair label="Fecha" value={formatDate(eventDate)} />
                <SummaryPair label="Horario" value={`${startTime} - ${bundleEndTime}`} />
                <SummaryPair label="Duracion" value={formatDuration(durationMinutes)} />
                <SummaryPair
                  label="Bloque continuo"
                  value={formatDuration(customBundleEstimate.totalDurationMinutes)}
                />
              </div>
            </SummaryCard>
          </div>

          <div className="space-y-3 md:space-y-2">
            <SummaryCard title="Resumen economico">
              <div className="space-y-0">
                {itemizedLines.map((line) => {
                  const priceLabel = formatCustomBundlePriceDisplay(line.item)
                  const detail =
                    line.unitPriceUsd === 0
                      ? priceLabel
                      : line.sessionDurationMinutes
                        ? `${priceLabel} · ${formatDuration(line.durationMinutes)}`
                        : line.item.quantityType === 'hour'
                          ? `${getHourLabel(line.quantity)} · ${priceLabel}`
                          : `${line.quantity} x ${priceLabel}`

                  return (
                    <EstimateLine
                      key={`${line.item.slug}-${line.label}`}
                      label={line.label}
                      value={`${line.lineTotalUsd} USD`}
                      detail={detail}
                    />
                  )
                })}

                {aggregateOnlyCount > 0 && (
                  <EstimateLine
                    label="Adicionales del paquete"
                    value={`${customBundleEstimate.additionalSubtotalUsd} USD`}
                    detail={`${aggregateOnlyCount} adicionales seleccionados`}
                  />
                )}

                {customBundleEstimate.adjustments.map((adjustment) => (
                  <EstimateLine
                    key={adjustment.label}
                    label={adjustment.label}
                    value={`${adjustment.amountUsd} USD`}
                  />
                ))}

                <EstimateLine
                  label="Subtotal"
                  value={`${customBundleEstimate.subtotalUsd} USD`}
                />
                <EstimateLine
                  label="Total estimado"
                  value={`${customBundleEstimate.estimatedTotalUsd} USD`}
                  emphasis
                />
              </div>
            </SummaryCard>
          </div>

          <div className="space-y-3 md:space-y-2">
            <SummaryCard title="Incluidos">
              <div className="flex flex-wrap gap-1.5">
                {includedLines.map((line) => (
                  <SummaryPill key={line.item.slug}>
                    {line.label}: {formatCustomBundlePriceDisplay(line.item)} · 0 USD
                  </SummaryPill>
                ))}
              </div>
              <div className="mt-2 rounded-md bg-brand-bg/30 px-2.5 py-2 md:px-2 md:py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Total con recargo</p>
                <p className="mt-0.5 text-sm font-semibold text-text-primary">
                  {customBundleEstimate.estimatedTotalUsd} USD
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {weekendAdjustmentTotal > 0
                    ? `El recargo de fin de semana suma ${weekendAdjustmentTotal} USD al subtotal.`
                    : 'No se aplico recargo de fin de semana.'}
                </p>
              </div>
            </SummaryCard>
          </div>
        </div>

        {customBundleEstimate.blockingIssues.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 md:px-2.5 md:py-1.5">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-red-400"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300 md:text-[10px]">
                Requiere ajuste antes de simular
              </p>
            </div>
            <ul className="mt-1 space-y-1 text-[13px] text-red-200 md:text-[12px]">
              {customBundleEstimate.blockingIssues.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-text-muted md:text-[10px] md:leading-tight">
          La simulacion conserva fecha, hora, lineas, subtotales y total sin crear reservas reales.
        </p>
      </div>
    )
  }

  const service = CATALOG_SERVICES.find((s) => s.slug === serviceSlug)
  const variant = CATALOG_VARIANTS.find((v) => v.slug === variantSlug)
  const endTime = deriveEndTime(startTime, durationMinutes)
  const selectedRecordingAddons = availableRecordingAddons.filter((addon) =>
    recordingAddonSlugs.includes(addon.slug),
  )
  const selectedRecordingAddonVisualLines = getSelectedRecordingAddonVisualLines(
    recordingAddonSlugs,
    serviceSlug ?? '',
    variantSlug ?? '',
    projectTopicCount,
  )
  const hasExtras =
    extrasTechnician ||
    extrasBackline ||
    extrasNotes.trim().length > 0 ||
    selectedRecordingAddons.length > 0

  return (
    <div className="space-y-3 md:space-y-2">
      <p className="text-sm text-text-secondary md:text-[10px] md:leading-tight">
        Revisa los datos antes de enviar. El equipo de Turpial Sound confirmara disponibilidad y se pondra en contacto contigo.
      </p>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-2">
        <div className="space-y-3 md:space-y-2">
            <SummaryCard title="Servicio y Agenda">
              <div className="grid grid-cols-1 gap-2 md:gap-1.5 sm:grid-cols-2">
              <SummaryPair label="Servicio" value={service?.name ?? serviceSlug ?? 'Por definir'} />
              <SummaryPair label="Modalidad" value={variant?.name ?? variantSlug ?? 'Por definir'} />
              <SummaryPair label="Fecha" value={formatDate(eventDate)} />
              <SummaryPair label="Horario" value={`${startTime} - ${endTime}`} />
              </div>
            </SummaryCard>
        </div>

        <div className="space-y-3 md:space-y-2">
          <SummaryCard title="Extras y Contacto">
            {hasExtras ? (
              <div className="space-y-2 md:space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {extrasTechnician && <SummaryPill>Tecnico incluido</SummaryPill>}
                  {extrasBackline && <SummaryPill>Backline incluido</SummaryPill>}
                </div>
                {extrasNotes.trim() && (
                  <div className="space-y-1 rounded-md bg-brand-bg/30 px-2.5 py-2 md:px-2 md:py-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-text-muted md:text-[10px]">Notas</p>
                    <p className="text-sm text-text-primary md:text-[12px]">{extrasNotes.trim()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md bg-brand-bg/30 px-2.5 py-2 md:px-2 md:py-1.5">
                <p className="text-[12px] text-text-secondary md:text-[11px]">Sin requerimientos adicionales.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:gap-1.5 sm:grid-cols-2">
              <SummaryPair label="Nombre" value={requesterName} />
              <SummaryPair label="Correo" value={requesterEmail} />
              {requesterPhone.trim() && (
                <div className="sm:col-span-2">
                  <SummaryPair label="WhatsApp" value={requesterPhone.trim()} />
                </div>
              )}
            </div>
          </SummaryCard>
        </div>

        <div className="space-y-3 md:space-y-2">
          {selectedRecordingAddonVisualLines.length > 0 && (
            <SummaryCard title="Adicionales experimentales">
              <div className="space-y-2">
                <div className="rounded-md bg-brand-bg/30 px-2.5 py-2 md:px-2 md:py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">
                    Alcance del proyecto
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">
                    {getRecordingAddonVisualTopicLabel(projectTopicCount)}
                  </p>
                </div>

                <div className="space-y-2">
                  {selectedRecordingAddonVisualLines.map((line) => (
                    <div
                      key={line.addon.slug}
                      className="rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2.5 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary md:text-[12px]">
                            {line.addon.publicName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted md:text-[10px]">
                            {line.formulaLabel}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-accent-gold">
                          {line.lineTotalUsd} USD
                        </p>
                      </div>
                      {line.noteLabel && (
                        <p className="mt-1 text-[11px] text-amber-200 md:text-[10px]">
                          {line.noteLabel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-accent-gold/20 bg-accent-gold/10 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">
                    Subtotal visual experimental
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">
                    {recordingAddonPreviewTotalUsd} USD
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                    Este subtotal es experimental y no altera todavia el cobro real ni la persistencia.
                  </p>
                </div>
              </div>
            </SummaryCard>
          )}

          {estimate && estimate.lines.length > 0 && (
            <SummaryCard title="Estimado Preliminar">
              <div className="space-y-0">
                {estimate.lines.map((line) => {
                  const detail =
                    line.unitPriceUsd === 0
                      ? 'Incluido'
                      : line.unitPriceUsd !== null &&
                          (line.unit === 'hour' ||
                            line.label === 'Tecnico de sonido' ||
                            line.label === 'Backline / equipamiento')
                        ? `${getHourLabel(line.quantity)} x ${line.unitPriceUsd} USD`
                        : undefined

                  return (
                    <EstimateLine
                      key={`${line.label}-${line.unit}`}
                      label={line.label}
                      value={`${line.lineTotalUsd} USD`}
                      detail={detail}
                    />
                  )
                })}

                {estimate.adjustments.map((adjustment) => (
                  <EstimateLine
                    key={adjustment.label}
                    label={adjustment.label}
                    value={`${adjustment.amountUsd} USD`}
                    detail={
                      adjustment.label === 'Recargo de fin de semana' &&
                      variant?.weekendSurchargeUsd
                        ? `${getHourLabel(durationMinutes / 60)} x ${variant.weekendSurchargeUsd} USD`
                        : undefined
                    }
                  />
                ))}

                <EstimateLine
                  label="Total estimado"
                  value={`${estimate.estimatedTotalUsd} USD`}
                  emphasis
                />
              </div>
            </SummaryCard>
          )}

          {estimate && estimate.blockingIssues.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 md:px-2.5 md:py-1.5">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-red-400"
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300 md:text-[10px]">
                  Requiere ajuste antes de enviar
                </p>
              </div>
              <ul className="mt-1 space-y-1 text-[13px] text-red-200 md:text-[12px]">
                {estimate.blockingIssues.map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted md:text-[10px] md:leading-tight">
        Al enviar, tu solicitud quedara pendiente de revision interna. No es una reserva confirmada.
      </p>
    </div>
  )
}
