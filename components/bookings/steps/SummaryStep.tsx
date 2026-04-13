'use client'

// Turpial Sound — Paso 6 del wizard: resumen de la solicitud
// Fase 1B.5 — Componente de solo lectura. No recibe callbacks.
// Muestra todos los datos recopilados antes del envío final.

import type { ReactNode } from 'react'
import { CATALOG_SERVICES, CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { DURATION_OPTIONS, deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import type { BookingEstimate } from '@/lib/bookings/types'

// ─────────────────────────────────────────────────────────────────
// HELPERS LOCALES
// ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  // T12:00:00 evita que UTC midnight cruce al día anterior en zonas UTC-N
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-brand-border bg-brand-surface px-3.5 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </h3>
      {children}
    </section>
  )
}

function SummaryPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 rounded-md bg-brand-bg/30 px-2.5 py-2">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="break-words text-sm font-medium text-text-primary md:text-[13px]">{value}</p>
    </div>
  )
}

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-brand-border px-2 py-0.5 text-[10px] text-text-secondary">
      {children}
    </span>
  )
}

function EstimateLine({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-border/70 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className={emphasis ? 'text-[11px] font-semibold uppercase tracking-wide text-text-primary' : 'text-[12px] text-text-secondary'}>
        {label}
      </span>
      <span className={emphasis ? 'text-sm font-semibold text-accent-gold md:text-[15px]' : 'text-sm font-medium text-text-primary md:text-[13px]'}>
        {value}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────

interface SummaryStepProps {
  serviceSlug: string
  variantSlug: string
  eventDate: string
  startTime: string
  durationMinutes: number
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  estimate?: BookingEstimate
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────

export function SummaryStep({
  serviceSlug,
  variantSlug,
  eventDate,
  startTime,
  durationMinutes,
  extrasNotes,
  extrasTechnician,
  extrasBackline,
  requesterName,
  requesterEmail,
  requesterPhone,
  estimate,
}: SummaryStepProps) {
  const service = CATALOG_SERVICES.find((s) => s.slug === serviceSlug)
  const variant = CATALOG_VARIANTS.find((v) => v.slug === variantSlug)
  const endTime = deriveEndTime(startTime, durationMinutes)
  const durationLabel =
    DURATION_OPTIONS.find((d) => d.value === durationMinutes)?.label ?? `${durationMinutes} min`

  const hasExtras = extrasTechnician || extrasBackline || extrasNotes.trim().length > 0

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Revisa los datos antes de enviar. El equipo de Turpial Sound confirmará disponibilidad y se pondrá en contacto contigo.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-3">
        <div className="space-y-4 md:space-y-3">
          <SummaryCard title="Servicio y Agenda">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SummaryPair label="Servicio" value={service?.name ?? serviceSlug} />
              <SummaryPair label="Modalidad" value={variant?.name ?? variantSlug} />
              <SummaryPair label="Fecha" value={formatDate(eventDate)} />
              <SummaryPair label="Hora" value={`${startTime} – ${endTime}`} />
              <SummaryPair label="Duración" value={durationLabel} />
            </div>
          </SummaryCard>
        </div>

        <div className="space-y-4 md:space-y-3">
          <SummaryCard title="Extras y Contacto">
            {hasExtras ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {extrasTechnician && <SummaryPill>Técnico requerido</SummaryPill>}
                  {extrasBackline && <SummaryPill>Backline requerido</SummaryPill>}
                  {!extrasTechnician && !extrasBackline && <SummaryPill>Sin extras marcados</SummaryPill>}
                </div>
                {extrasNotes.trim() && (
                  <div className="space-y-1 rounded-md bg-brand-bg/30 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-muted">Notas</p>
                    <p className="text-sm text-text-primary md:text-[13px]">{extrasNotes.trim()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md bg-brand-bg/30 px-2.5 py-2">
                <p className="text-[12px] text-text-secondary">Sin requerimientos adicionales.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SummaryPair label="Nombre" value={requesterName} />
              <SummaryPair label="Correo" value={requesterEmail} />
              {requesterPhone.trim() && (
                <div className="sm:col-span-2">
                  <SummaryPair label="Teléfono" value={requesterPhone.trim()} />
                </div>
              )}
            </div>
          </SummaryCard>
        </div>

        <div className="space-y-4 md:space-y-3">
          {estimate && estimate.lines.length > 0 && (
            <SummaryCard title="Estimado Preliminar">
              <div className="space-y-0">
                {estimate.lines.map((line) => {
                  const amountLabel =
                    line.unitPriceUsd === null ? 'A coordinar' : `${line.lineTotalUsd} USD`

                  return (
                    <EstimateLine
                      key={`${line.label}-${line.unit}`}
                      label={`${line.label} x${line.quantity}`}
                      value={amountLabel}
                    />
                  )
                })}

                {estimate.adjustments.map((adjustment) => (
                  <EstimateLine
                    key={adjustment.label}
                    label={adjustment.label}
                    value={`${adjustment.amountUsd} USD`}
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
                Requiere ajuste antes de enviar
              </p>
              <ul className="mt-1.5 space-y-1 text-[13px] text-red-200">
                {estimate.blockingIssues.map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted md:text-[11px]">
        Al enviar, tu solicitud quedará pendiente de revisión interna. No es una reserva confirmada.
      </p>
    </div>
  )
}
