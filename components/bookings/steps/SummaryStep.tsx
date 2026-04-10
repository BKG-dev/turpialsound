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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2.5 text-sm">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="text-right font-medium text-text-primary">{value}</span>
    </div>
  )
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      <div className="divide-y divide-brand-border rounded-lg border border-brand-border">
        {children}
      </div>
    </section>
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
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Revisa los datos antes de enviar. El equipo de Turpial Sound confirmará disponibilidad y se pondrá en contacto contigo.
      </p>

      <SummarySection title="Servicio">
        <SummaryRow label="Servicio" value={service?.name ?? serviceSlug} />
        <SummaryRow label="Modalidad" value={variant?.name ?? variantSlug} />
      </SummarySection>

      <SummarySection title="Fecha y horario">
        <SummaryRow label="Fecha" value={formatDate(eventDate)} />
        <SummaryRow label="Hora" value={`${startTime} – ${endTime}`} />
        <SummaryRow label="Duración" value={durationLabel} />
      </SummarySection>

      {hasExtras && (
        <SummarySection title="Requerimientos adicionales">
          {extrasTechnician && (
            <SummaryRow label="Técnico de sonido" value="Requerido" />
          )}
          {extrasBackline && (
            <SummaryRow label="Backline / equipamiento" value="Requerido" />
          )}
          {extrasNotes.trim() && (
            <SummaryRow label="Notas" value={extrasNotes.trim()} />
          )}
        </SummarySection>
      )}

      <SummarySection title="Datos del solicitante">
        <SummaryRow label="Nombre" value={requesterName} />
        <SummaryRow label="Correo" value={requesterEmail} />
        {requesterPhone.trim() && (
          <SummaryRow label="Teléfono" value={requesterPhone.trim()} />
        )}
      </SummarySection>

      {estimate && estimate.lines.length > 0 && (
        <SummarySection title="Estimado preliminar">
          {estimate.lines.map((line) => {
            const amountLabel =
              line.unitPriceUsd === null
                ? 'A coordinar'
                : `${line.lineTotalUsd} USD`

            return (
              <SummaryRow
                key={`${line.label}-${line.unit}`}
                label={`${line.label} x${line.quantity}`}
                value={amountLabel}
              />
            )
          })}

          {estimate.adjustments.map((adjustment) => (
            <SummaryRow
              key={adjustment.label}
              label={adjustment.label}
              value={`${adjustment.amountUsd} USD`}
            />
          ))}

          <SummaryRow
            label="Total estimado"
            value={`${estimate.estimatedTotalUsd} USD`}
          />
        </SummarySection>
      )}

      {estimate && estimate.blockingIssues.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
            Requiere ajuste antes de enviar
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-200">
            {estimate.blockingIssues.map((issue) => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Al enviar, tu solicitud quedará pendiente de revisión interna. No es una reserva confirmada.
      </p>
    </div>
  )
}
