'use client'

import { useEffect, useMemo, useState } from 'react'

type LabStatus = 'idle' | 'loading' | 'pending' | 'verified' | 'failed' | 'expired' | 'not_found'

interface StatusResponse {
  status: 'pending' | 'verified' | 'failed' | 'expired' | 'not_found'
  challengeId: string
  expiresAt: string | null
  verifiedAt: string | null
  failedReason: string | null
}

export default function WhatsappReservaTokenLabClient({ secret }: { secret: string }) {
  const [phone, setPhone] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [numberLabel, setNumberLabel] = useState<string>('WhatsApp conectado de Turpial Sound')
  const [status, setStatus] = useState<LabStatus>('idle')
  const [failedReason, setFailedReason] = useState<string | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canGenerate = useMemo(() => phone.trim().length > 0 && status !== 'loading', [phone, status])

  async function refreshStatus(currentChallengeId: string) {
    const response = await fetch(
      `/api/whatsapp/lab/status?challengeId=${encodeURIComponent(currentChallengeId)}&secret=${encodeURIComponent(secret)}`,
      { method: 'GET', cache: 'no-store' },
    )
    if (!response.ok) return
    const payload = (await response.json()) as StatusResponse

    setStatus(payload.status)
    setFailedReason(payload.failedReason)
    setVerifiedAt(payload.verifiedAt)
    setExpiresAt(payload.expiresAt)
  }

  useEffect(() => {
    if (!challengeId || status === 'verified' || status === 'failed' || status === 'expired') return

    const timer = window.setInterval(() => {
      refreshStatus(challengeId).catch(() => undefined)
    }, 4000)

    return () => window.clearInterval(timer)
  }, [challengeId, status])

  async function onGenerateCode() {
    setError(null)
    setStatus('loading')
    setFailedReason(null)
    setVerifiedAt(null)

    const response = await fetch(`/api/whatsapp/lab/challenge?secret=${encodeURIComponent(secret)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone }),
    })

    if (!response.ok) {
      setStatus('idle')
      setError('No se pudo generar el codigo. Verifica el telefono e intenta de nuevo.')
      return
    }

    const payload = (await response.json()) as {
      challengeId: string
      code: string
      expiresAt: string
      whatsappNumberLabel: string
    }

    setChallengeId(payload.challengeId)
    setCode(payload.code)
    setExpiresAt(payload.expiresAt)
    setNumberLabel(payload.whatsappNumberLabel)
    setStatus('pending')
  }

  return (
    <main className="container-base py-12">
      <div className="mx-auto max-w-3xl rounded-xl border border-cyan-500/40 bg-black/30 p-6 text-white">
        <h1 className="font-display text-3xl">Lab WhatsApp Reserva Token</h1>
        <p className="mt-3 text-sm text-zinc-200">
          LAB / No crea reservas reales / No bloquea calendario / No toca pagos.
        </p>

        <div className="mt-6 grid gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4">
          <label className="text-sm font-semibold" htmlFor="phone">
            WhatsApp del usuario
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+58 416 801 7844"
            className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => onGenerateCode().catch(() => setError('Error inesperado generando challenge.'))}
            className="w-fit rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generar codigo
          </button>
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}
        </div>

        {code ? (
          <section className="mt-8 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Codigo</p>
            <p className="mt-1 font-mono text-4xl font-bold text-cyan-300">{code}</p>
            <p className="mt-2 text-sm text-zinc-300">
              Envía este código por WhatsApp al número conectado de Turpial Sound.
            </p>
            <p className="mt-1 text-sm text-zinc-400">{numberLabel}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Expira: {expiresAt ? new Date(expiresAt).toLocaleString('es-VE') : '-'}
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4">
          <h2 className="text-lg font-semibold">Estado</h2>
          <p className="mt-2 text-sm text-zinc-300">status: {status}</p>
          {verifiedAt ? (
            <p className="mt-1 text-sm text-emerald-300">
              WhatsApp verificado. En el flujo real aquí se permitiría crear la solicitud
              pending_payment.
            </p>
          ) : null}
          {failedReason ? <p className="mt-1 text-sm text-amber-300">failed_reason: {failedReason}</p> : null}
          {status === 'expired' ? (
            <p className="mt-1 text-sm text-amber-300">
              El código expiró. Genera uno nuevo para reintentar.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}
