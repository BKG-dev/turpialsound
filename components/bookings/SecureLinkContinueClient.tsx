'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const BOOKING_DRAFT_STORAGE_KEY = 'turpial_booking_draft_v1'
const BOOKING_DRAFT_TTL_MS = 2 * 60 * 60 * 1000

interface SecureLinkContinueClientProps {
  token: string
}

type ContinueState = 'loading' | 'expired' | 'invalid' | 'error'

interface ConsumedDraftPayload {
  ok: true
  verifiedAt: string
  phoneE164: string
  draft: {
    currentStep: number
    furthestStep: number
    data: {
      selectedItems: Array<{
        serviceSlug: string
        variantSlug: string | null
        quantity: number
      }>
      eventDate: string | null
      startTime: string | null
      durationMinutes: number | null
      extrasNotes: string
      extrasTechnician: boolean
      extrasBackline: boolean
      requesterName: string
      requesterEmail: string
      requesterPhone: string
      whatsappConsentAccepted: boolean
    }
  }
}

export function SecureLinkContinueClient({ token }: SecureLinkContinueClientProps) {
  const router = useRouter()
  const [state, setState] = useState<ContinueState>('loading')

  const hasToken = useMemo(() => token.trim().length > 0, [token])

  useEffect(() => {
    if (!hasToken) {
      setState('invalid')
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const response = await fetch('/api/bookings/whatsapp-secure-link/consume', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
          cache: 'no-store',
        })

        if (cancelled) return

        if (!response.ok) {
          if (response.status === 410) {
            setState('expired')
            return
          }
          if (response.status === 404) {
            setState('invalid')
            return
          }
          setState('error')
          return
        }

        const payload = (await response.json()) as ConsumedDraftPayload
        if (!payload.ok || !payload.draft?.data) {
          setState('invalid')
          return
        }

        const restoredDraft = {
          savedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + BOOKING_DRAFT_TTL_MS).toISOString(),
          currentStep: 5,
          furthestStep: Math.max(5, payload.draft.furthestStep ?? 5),
          data: {
            ...payload.draft.data,
            requesterPhone: payload.draft.data.requesterPhone || payload.phoneE164,
          },
          whatsappVerification: {
            status: 'verified',
            challengeId: `secure-link:${token.slice(0, 6)}`,
            code: null,
            expiresAt: null,
            verifiedAt: payload.verifiedAt,
            phone: payload.phoneE164,
            error: null,
          },
        }

        window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(restoredDraft))
        router.replace('/reservas?waFlow=secure-link&restored=1')
      } catch {
        if (!cancelled) {
          setState('error')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [hasToken, router, token])

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-brand-border bg-brand-surface p-6">
      <h1 className="font-display text-xl text-text-primary">Continuar solicitud de reserva</h1>
      {state === 'loading' && (
        <p className="mt-3 text-sm text-text-secondary">
          Estamos verificando tu enlace seguro de WhatsApp...
        </p>
      )}
      {state === 'expired' && (
        <p className="mt-3 text-sm text-amber-300">
          Este enlace vencio. Solicita uno nuevo o usa la verificacion manual por codigo.
        </p>
      )}
      {state === 'invalid' && (
        <p className="mt-3 text-sm text-red-300">
          Este enlace no es valido. Solicita un enlace nuevo desde el paso de contacto.
        </p>
      )}
      {state === 'error' && (
        <p className="mt-3 text-sm text-red-300">
          No pudimos continuar la verificacion en este momento. Intenta nuevamente.
        </p>
      )}
    </div>
  )
}
