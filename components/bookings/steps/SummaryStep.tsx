'use client'

import type { ReactNode } from 'react'
import { CATALOG_SERVICES, CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import type { BookingEstimate } from '@/lib/bookings/types'

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
        <span className={emphasis ? 'text-[11px] font-semibold uppercase tracking-wide text-text-primary md:text-[10px]' : 'text-[12px] text-text-secondary md:text-[11px]'}>
          {label}
        </span>
        {detail && <span className="mt-0.5 block text-[11px] text-text-muted md:text-[10px]">{detail}</span>}
      </span>
      <span className={emphasis ? 'text-sm font-semibold text-accent-gold md:text-[14px]' : 'text-sm font-medium text-text-primary md:text-[12px]'}>
        {value}
      </span>
    </div>
  )
}

function getHourLabel(quantity: number): string {
  return quantity === 1 ? '1 hora' : `${quantity} horas`
}

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
  const hasExtras = extrasTechnician || extrasBackline || extrasNotes.trim().length > 0

  return (
    <div className="space-y-3 md:space-y-2">
      <p className="text-sm text-text-secondary md:text-[10px] md:leading-tight">
        Revisa los datos antes de enviar. El equipo de Turpial Sound confirmara disponibilidad y se pondra en contacto contigo.
      </p>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-2">
        <div className="space-y-3 md:space-y-2">
          <SummaryCard title="Servicio y Agenda">
            <div className="grid grid-cols-1 gap-2 md:gap-1.5 sm:grid-cols-2">
              <SummaryPair label="Servicio" value={service?.name ?? serviceSlug} />
              <SummaryPair label="Modalidad" value={variant?.name ?? variantSlug} />
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
          {estimate && estimate.lines.length > 0 && (
            <SummaryCard title="Estimado Preliminar">
              <div className="space-y-0">
                {estimate.lines.map((line) => {
                  const detail =
                    line.unitPriceUsd !== null && (line.unit === 'hour' || line.label === 'Tecnico' || line.label === 'Backline')
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300 md:text-[10px]">
                Requiere ajuste antes de enviar
              </p>
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
