'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const BOOKING_PENDING_PAYMENT_STORAGE_KEY = 'turpial_booking_pending_payment_v1'

interface PendingSessionPayload {
  version?: number
  publicCode?: string
  operationalStatus?: 'pending_payment' | 'payment_reported'
  paymentDeadlineIso?: string | null
}

interface PaymentRecoveryGatewayClientProps {
  code: string
  token: string
}

type RecoveryState = 'checking' | 'ready' | 'unavailable'

export function PaymentRecoveryGatewayClient({
  code,
  token,
}: PaymentRecoveryGatewayClientProps) {
  const [state, setState] = useState<RecoveryState>('checking')

  const hasParams = useMemo(
    () => code.trim().length > 0 && token.trim().length > 0,
    [code, token],
  )

  useEffect(() => {
    if (!hasParams) {
      setState('unavailable')
      return
    }

    try {
      const raw = window.localStorage.getItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
      if (!raw) {
        setState('unavailable')
        return
      }

      const parsed = JSON.parse(raw) as PendingSessionPayload
      if (!parsed || parsed.version !== 1 || parsed.publicCode !== code.toUpperCase()) {
        setState('unavailable')
        return
      }

      const deadlineMs = parsed.paymentDeadlineIso
        ? new Date(parsed.paymentDeadlineIso).getTime()
        : Number.NaN
      const isExpired = Number.isFinite(deadlineMs) && deadlineMs <= Date.now()

      if (parsed.operationalStatus === 'pending_payment' && isExpired) {
        window.localStorage.removeItem(BOOKING_PENDING_PAYMENT_STORAGE_KEY)
        setState('unavailable')
        return
      }

      setState('ready')
    } catch {
      setState('unavailable')
    }
  }, [code, hasParams])

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-brand-border bg-brand-surface p-6">
      <h1 className="font-display text-xl text-text-primary">Recuperar pago de reserva</h1>
      {state === 'checking' && (
        <p className="mt-3 text-sm text-text-secondary">Estamos validando tu acceso seguro...</p>
      )}
      {state === 'ready' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-text-secondary">
            Detectamos una sesion local pendiente para {code}. Puedes continuar el reporte de pago
            desde reservas.
          </p>
          <Link
            href="/reservas"
            className="inline-flex rounded-md border border-accent-gold bg-accent-gold/10 px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-accent-gold/20"
          >
            Continuar con mi pago pendiente
          </Link>
        </div>
      )}
      {state === 'unavailable' && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-amber-300">
            No pudimos recuperar una sesion segura activa con este enlace.
          </p>
          <p className="text-xs text-text-muted">
            Por seguridad no mostramos datos de pago solo con codigo publico. Continua desde
            /reservas para crear o retomar tu solicitud.
          </p>
          <Link
            href="/reservas"
            className="inline-flex rounded-md border border-brand-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent-gold/50 hover:text-text-primary"
          >
            Ir a /reservas
          </Link>
        </div>
      )}
    </div>
  )
}
