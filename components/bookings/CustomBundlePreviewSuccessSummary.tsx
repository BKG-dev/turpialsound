'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/Button'
import type { CustomBundlePreviewSubmissionPublicResult } from '@/lib/bookings/custom-bundle-preview-submission-core'

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 min'
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 hora' : `${hours} horas`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  return `${hours}h ${String(remaining).padStart(2, '0')}m`
}

export interface CustomBundlePreviewSuccessSummaryProps {
  result: CustomBundlePreviewSubmissionPublicResult
  onContinueEditing: () => void
  onNewSimulation: () => void
}

export function CustomBundlePreviewSuccessSummary({
  result,
  onContinueEditing,
  onNewSimulation,
}: CustomBundlePreviewSuccessSummaryProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-3">
      <div className="mb-2.5 rounded-lg border border-brand-border/70 bg-brand-bg/30 px-2.5 py-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gold/10">
            <svg className="h-4 w-4 text-accent-gold" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold leading-tight text-text-primary md:text-base">
              Simulacion de apartado preparada
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
              Esta es una simulacion Preview. No se creo una reserva real.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="rounded-lg border border-accent-gold/35 bg-accent-gold/5 px-3 py-2 text-center shadow-[0_0_0_1px_rgba(255,191,0,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Codigo</p>
            <p className="font-display text-base font-bold tracking-[0.08em] text-accent-gold md:text-lg">
              {result.publicCode}
            </p>
          </div>

          <div className="rounded-lg border border-brand-border bg-brand-bg/30 px-2 py-1.5">
            <div className="space-y-1.5 text-[11px] leading-snug">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Total autoritativo</p>
                <p className="font-medium text-text-primary">{result.estimatedTotalUsd} USD</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Duracion total</p>
                <p className="font-medium text-text-primary">{formatDuration(result.totalDurationMinutes)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Items</p>
                <p className="font-medium text-text-primary">{result.itemCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Vence</p>
                <p className="font-medium text-text-primary">{result.holdExpiresAtIso}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
          <div className="space-y-1.5 text-[11px] leading-snug">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Estado</p>
              <p className="font-medium text-text-primary">Preview / simulacion segura</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Recuperacion</p>
              <p className="font-medium text-text-primary">
                <Link href={result.recoveryPath} className="font-semibold text-accent-gold underline underline-offset-4">
                  Continuar al pago simulado
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onContinueEditing}>
              Seguir editando
            </Button>
            <Button variant="primary" size="sm" onClick={onNewSimulation}>
              Nueva simulacion
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
