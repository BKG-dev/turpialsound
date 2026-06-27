'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { CustomBundlePaymentRecoveryForm } from '@/components/bookings/CustomBundlePaymentRecoveryForm'
import { shouldClearInitialRecoveryToken } from '@/lib/bookings/custom-bundle-payment-recovery-client-session'
import type { CustomBundlePaymentRecoveryUiFlowResult } from '@/lib/bookings/custom-bundle-payment-recovery-ui-flow'
import type { CustomBundlePaymentRecoveryUiSession } from '@/lib/bookings/custom-bundle-payment-recovery-ui-contract'

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

interface PaymentRecoveryGatewayClientProps {
  code: string
}

interface PaymentRecoverySessionResponse {
  ok?: boolean
  state?: RecoveryState
  reason?: string
  session?: CustomBundlePaymentRecoveryUiSession
  publicCode?: string
  operationalStatus?: string
}

function isValidCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

export function PaymentRecoveryGatewayClient({ code }: PaymentRecoveryGatewayClientProps) {
  const [state, setState] = useState<RecoveryState>('checking')
  const [detail, setDetail] = useState<string | null>(null)
  const [session, setSession] = useState<CustomBundlePaymentRecoveryUiSession | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const tokenRef = useRef<string | null>(null)
  const tokenInitializedRef = useRef(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (tokenInitializedRef.current) {
      return
    }

    tokenInitializedRef.current = true
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')?.trim() ?? ''
    if (token.length > 0) {
      tokenRef.current = token
    }

    if (url.searchParams.has('token')) {
      url.searchParams.delete('token')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestId = ++requestIdRef.current

    const run = async () => {
      const normalizedCode = normalizeCode(code)
      if (!isValidCode(normalizedCode)) {
        if (!cancelled && requestId === requestIdRef.current) {
          setSession(null)
          setState('unavailable')
          setDetail('Debes usar un enlace valido con codigo publico.')
        }
        return
      }

      if (!cancelled && requestId === requestIdRef.current) {
        setState('checking')
        setDetail(null)
      }

      try {
        const requestBody: { code: string; token?: string } = { code: normalizedCode }
        if (tokenRef.current) {
          requestBody.token = tokenRef.current
        }

        const response = await fetch('/api/bookings/payment-recovery/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify(requestBody),
        })

        const responsePayload = (await response.json().catch(() => null)) as PaymentRecoverySessionResponse | null
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        const responseData = responsePayload
        const responseState = typeof responsePayload?.state === 'string' ? (responsePayload.state as RecoveryState) : null
        const hasValidPendingSession =
          responseState === 'pending_payment' && Boolean(responseData?.session)
        if (
          shouldClearInitialRecoveryToken({
            responseOk: response.ok,
            responseState,
            hasValidPendingSession,
          })
        ) {
          tokenRef.current = null
        }

        if (!response.ok || !responseState || responseData === null) {
          setState('unavailable')
          setSession(null)
          setDetail('No pudimos validar tu enlace seguro. Intenta nuevamente.')
          return
        }

        if (responseState === 'pending_payment' && responseData.session) {
          setSession(responseData.session)
          setState('pending_payment')
          setDetail(null)
          return
        }

        if (responseState === 'pending_payment') {
          setSession(null)
          setState('unavailable')
          setDetail('No pudimos validar tu enlace seguro. Intenta nuevamente.')
          return
        }

        setSession(null)
        setState(responseState)

        switch (responseState) {
          case 'invalid_link':
            setDetail(
              responseData.reason === 'expired_token'
                ? 'Este enlace seguro vencio. Solicita uno nuevo desde /reservas.'
                : 'No pudimos validar este enlace seguro.',
            )
            break
          case 'not_found':
            setDetail('No encontramos una solicitud valida para este enlace.')
            break
          case 'expired':
            setDetail('La ventana de pago de esta solicitud vencio.')
            break
          case 'cancelled':
            setDetail('Esta solicitud ya no esta disponible para reporte de pago.')
            break
          case 'payment_reported':
            setDetail('Esta solicitud ya tiene el pago reportado y se encuentra en revision manual.')
            break
          case 'confirmed':
            setDetail('Esta reserva ya fue confirmada por el equipo de Turpial Sound.')
            break
          default:
            setDetail('No pudimos validar este enlace seguro.')
        }
      } catch {
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        setSession(null)
        setState('unavailable')
        setDetail('No pudimos validar tu enlace seguro. Intenta nuevamente.')
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [code, retryNonce])

  const handleRecoveryStateChange = (result: CustomBundlePaymentRecoveryUiFlowResult) => {
    if (result.ok) {
      if (result.stage === 'reported' || result.stage === 'replayed') {
        setState('payment_reported')
        setDetail(result.message)
      } else if (result.stage === 'simulated') {
        setDetail(result.message)
      }
      return
    }

    if (result.stage === 'authorization_error') {
      setState('invalid_link')
      setSession(null)
      setDetail('No pudimos validar este enlace seguro.')
      return
    }

    setDetail(result.message)
  }

  const showCustomBundleForm = state === 'pending_payment' && session?.paymentUiMode === 'preview_simulation'
  const showLegacyFallback = state === 'pending_payment' && session?.paymentUiMode === 'disabled'

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-brand-border bg-brand-surface p-6">
      <h1 className="font-display text-xl text-text-primary">Recuperar pago de reserva</h1>
      {state === 'checking' && (
        <p className="mt-3 text-sm text-text-secondary">Estamos validando tu acceso seguro...</p>
      )}

      {showCustomBundleForm && session ? (
        <div className="mt-4">
          <CustomBundlePaymentRecoveryForm
            session={session}
            onPaymentStateChange={handleRecoveryStateChange}
          />
        </div>
      ) : null}

      {showLegacyFallback && (
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRetryNonce((value) => value + 1)}
              className="inline-flex rounded-md border border-accent-gold bg-accent-gold/10 px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-accent-gold/20"
            >
              Reintentar validación
            </button>
            <Link
              href="/reservas"
              className="inline-flex rounded-md border border-brand-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent-gold/50 hover:text-text-primary"
            >
              Ir a /reservas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
