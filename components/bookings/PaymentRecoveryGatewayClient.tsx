'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const BOOKING_PENDING_PAYMENT_STORAGE_KEY = 'turpial_booking_pending_payment_v1'

type RecoveryState =
  | 'checking'
  | 'pending_payment'
  | 'payment_reported'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'invalid_link'
  | 'not_found'
  | 'unavailable'

interface PendingSessionPayload {
  version: 1
  publicCode: string
  operationalStatus: 'pending_payment'
  serviceSlug: string | null
  variantSlug: string | null
  serviceName: string
  variantName: string
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  paymentDeadlineIso: string | null
  selectedPaymentMethodSlug: 'pago_movil' | 'transferencia' | 'binance' | 'efectivo'
  paymentReference: string
  amountUsd: number
  amountBs: number
  amountUsdLabel: string
  amountBsLabel: string
  bcvRate: number
}

interface PaymentRecoveryGatewayClientProps {
  code: string
  token: string
}

export function PaymentRecoveryGatewayClient({
  code,
  token,
}: PaymentRecoveryGatewayClientProps) {
  const [state, setState] = useState<RecoveryState>('checking')
  const [detail, setDetail] = useState<string | null>(null)

  const hasParams = useMemo(
    () => code.trim().length > 0 && token.trim().length > 0,
    [code, token],
  )

  useEffect(() => {
    let cancelled = false

    if (!hasParams) {
      setState('unavailable')
      setDetail('Debes usar un enlace valido con codigo y token.')
      return
    }

    const run = async () => {
      try {
        const response = await fetch('/api/bookings/payment-recovery/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, token }),
        })

        const payload = (await response.json().catch(() => null)) as
          | {
              state?: RecoveryState
              reason?: string
              session?: PendingSessionPayload
            }
          | null

        if (cancelled) return
        if (!response.ok || !payload?.state) {
          setState('unavailable')
          setDetail('No pudimos validar tu enlace seguro. Intenta nuevamente.')
          return
        }

        if (payload.state === 'pending_payment' && payload.session) {
          const pendingPaymentSession = {
            ...payload.session,
            savedAt: new Date().toISOString(),
          }
          window.localStorage.setItem(
            BOOKING_PENDING_PAYMENT_STORAGE_KEY,
            JSON.stringify(pendingPaymentSession),
          )
          setState('pending_payment')
          setDetail(null)
          return
        }

        setState(payload.state)

        if (payload.state === 'invalid_link') {
          if (payload.reason === 'expired_token') {
            setDetail('Este enlace seguro vencio. Solicita uno nuevo desde /reservas.')
          } else {
            setDetail('No pudimos validar este enlace seguro.')
          }
        }
      } catch {
        if (cancelled) return
        setState('unavailable')
        setDetail('No pudimos validar tu enlace seguro. Intenta nuevamente.')
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [code, hasParams])

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-brand-border bg-brand-surface p-6">
      <h1 className="font-display text-xl text-text-primary">Recuperar pago de reserva</h1>
      {state === 'checking' && (
        <p className="mt-3 text-sm text-text-secondary">Estamos validando tu acceso seguro...</p>
      )}
      {state === 'pending_payment' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-text-secondary">
            Detectamos una solicitud pendiente de pago para {code}. Puedes continuar el reporte del
            comprobante desde reservas.
          </p>
          <Link
            href="/reservas"
            className="inline-flex rounded-md border border-accent-gold bg-accent-gold/10 px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-accent-gold/20"
          >
            Continuar con mi pago pendiente
          </Link>
        </div>
      )}
      {state === 'payment_reported' && (
        <p className="mt-3 text-sm text-text-secondary">
          Esta solicitud ya tiene el pago reportado y se encuentra en revision manual.
        </p>
      )}
      {state === 'confirmed' && (
        <p className="mt-3 text-sm text-text-secondary">
          Esta reserva ya fue confirmada por el equipo de Turpial Sound.
        </p>
      )}
      {state === 'expired' && (
        <p className="mt-3 text-sm text-text-secondary">
          La ventana de pago de esta solicitud vencio. Puedes crear una nueva solicitud en
          /reservas.
        </p>
      )}
      {state === 'cancelled' && (
        <p className="mt-3 text-sm text-text-secondary">
          Esta solicitud ya no esta disponible para reporte de pago.
        </p>
      )}
      {(state === 'invalid_link' || state === 'not_found' || state === 'unavailable') && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-amber-300">{detail ?? 'No pudimos validar este enlace.'}</p>
          <p className="text-xs text-text-muted">
            Por seguridad no mostramos datos de pago solo con codigo publico.
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
