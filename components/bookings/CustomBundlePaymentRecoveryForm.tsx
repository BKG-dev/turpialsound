'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { reportCustomBundlePaymentProtectedAction } from '@/lib/bookings/custom-bundle-payment-action'
import {
  submitCustomBundlePaymentRecoveryUiFlow,
  type CustomBundlePaymentRecoveryUiFile,
  type CustomBundlePaymentRecoveryUiFlowResult,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-flow'
import type {
  CustomBundlePaymentRecoveryUiMethod,
  CustomBundlePaymentRecoveryUiSession,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-contract'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'

type PaymentRecoveryVisualState =
  | 'idle'
  | 'validating'
  | 'creating_intent'
  | 'uploading'
  | 'reporting'
  | 'simulated'
  | 'reported'
  | 'replayed'
  | 'error'

export interface CustomBundlePaymentRecoveryFormProps {
  session: CustomBundlePaymentRecoveryUiSession
  onPaymentStateChange(result: CustomBundlePaymentRecoveryUiFlowResult): void
}

function getMethodBySlug(
  methods: CustomBundlePaymentRecoveryUiMethod[],
  slug: BookingPaymentMethodSlug,
): CustomBundlePaymentRecoveryUiMethod | null {
  return methods.find((method) => method.slug === slug) ?? null
}

function formatIsoDate(value: string | null): string {
  if (!value) return 'Por definir'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function buildPublicResultMessage(result: CustomBundlePaymentRecoveryUiFlowResult): string {
  if (!result.ok) {
    return result.message
  }

  if (result.stage === 'simulated') {
    return 'Simulación completada. No se registró el pago ni se subió el comprobante.'
  }

  if (result.stage === 'replayed') {
    return 'El pago ya había sido reportado.'
  }

  return 'Pago reportado correctamente. Revisión manual pendiente.'
}

export function CustomBundlePaymentRecoveryForm({
  session,
  onPaymentStateChange,
}: CustomBundlePaymentRecoveryFormProps) {
  const [selectedMethodSlug, setSelectedMethodSlug] = useState<BookingPaymentMethodSlug>(
    session.selectedPaymentMethodSlug,
  )
  const [reference, setReference] = useState(session.paymentReference)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [visualState, setVisualState] = useState<PaymentRecoveryVisualState>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [announcement, setAnnouncement] = useState<string>('Listo para preparar el reporte seguro.')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const errorSummaryRef = useRef<HTMLDivElement | null>(null)
  const submittingRef = useRef(false)

  const selectedMethod = useMemo(
    () => getMethodBySlug(session.paymentMethods, selectedMethodSlug),
    [session.paymentMethods, selectedMethodSlug],
  )

  const requiresProof = selectedMethod?.proofRequired ?? false

  useEffect(() => {
    if (!errorMessage) {
      return
    }

    errorSummaryRef.current?.focus()
  }, [errorMessage])

  useEffect(() => {
    if (selectedMethodSlug === session.selectedPaymentMethodSlug) {
      return
    }

    setSelectedFile(null)
  }, [selectedMethodSlug, session.selectedPaymentMethodSlug])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) {
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage(null)
    setVisualState('validating')
    setAnnouncement('Validando datos seguros...')

    try {
      const currentMethod = getMethodBySlug(session.paymentMethods, selectedMethodSlug)
      if (!currentMethod) {
        throw new Error('Método de pago no disponible.')
      }

      const flowResult = await submitCustomBundlePaymentRecoveryUiFlow({
        paymentUiMode: session.paymentUiMode,
        publicCode: session.publicCode,
        paymentMethod: selectedMethodSlug,
        paymentReference: reference,
        file: selectedFile
          ? ({
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              value: selectedFile,
            } satisfies CustomBundlePaymentRecoveryUiFile)
          : null,
        dependencies: {
          async createUploadIntent(input) {
            setVisualState('creating_intent')
            setAnnouncement('Preparando el intento de subida protegido...')
            const response = await fetch('/api/bookings/custom-bundle-payment-proof/intent', {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                publicCode: input.publicCode,
                paymentMethod: input.paymentMethod,
                paymentReference: input.paymentReference,
                originalFilename: input.originalFilename,
                declaredMimeType: input.declaredMimeType,
                declaredSizeBytes: input.declaredSizeBytes,
              }),
            })

            const payload = (await response.json().catch(() => null)) as
              | { ok?: boolean; uploadIntent?: string; code?: string; message?: string }
              | null
            if (!response.ok || !payload?.ok || typeof payload.uploadIntent !== 'string') {
              return {
                ok: false as const,
                code: payload?.code ?? 'INVALID_REQUEST',
                message: payload?.message ?? 'No pudimos preparar el intento de subida.',
              }
            }

            return {
              ok: true as const,
              uploadIntent: payload.uploadIntent,
            }
          },
          async uploadProof(input) {
            setVisualState('uploading')
            setAnnouncement('Subiendo el comprobante protegido...')
            const response = await fetch('/api/bookings/custom-bundle-payment-proof/upload', {
              method: 'PUT',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: {
                'content-type': input.file.type,
                'x-turpial-payment-upload-intent': input.uploadIntent,
              },
              body: input.file.value as BodyInit,
            })

            const payload = (await response.json().catch(() => null)) as
              | { ok?: boolean; simulated?: boolean; uploadReceipt?: string | null; code?: string; message?: string }
              | null
            if (!response.ok || !payload?.ok) {
              return {
                ok: false as const,
                code: payload?.code ?? 'PAYMENT_UPLOAD_EXECUTION_FAILED',
                message: payload?.message ?? 'No pudimos subir el comprobante protegido.',
              }
            }

            return {
              ok: true as const,
              simulated: Boolean(payload.simulated),
              uploadReceipt: payload.uploadReceipt ?? null,
            }
          },
          async reportPayment(input) {
            setVisualState('reporting')
            setAnnouncement('Enviando el reporte protegido...')
            const formData = new FormData()
            formData.append('publicCode', input.publicCode)
            formData.append('paymentMethod', input.paymentMethod)
            formData.append('paymentReference', input.paymentReference)
            if (input.uploadReceipt) {
              formData.append('uploadReceipt', input.uploadReceipt)
            }

            return reportCustomBundlePaymentProtectedAction(formData)
          },
        },
      })

      onPaymentStateChange(flowResult)

      if (!flowResult.ok) {
        setVisualState('error')
        setErrorMessage(flowResult.message)
        setAnnouncement(flowResult.message)
        return
      }

      setVisualState(flowResult.stage)
      setAnnouncement(buildPublicResultMessage(flowResult))

      if (flowResult.stage === 'simulated') {
        return
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : 'No pudimos completar la simulacion del pago.'
      setVisualState('error')
      setErrorMessage(message)
      setAnnouncement(message)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-6 shadow-soft" onSubmit={handleSubmit}>
      {session.paymentUiMode === 'preview_simulation' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-50">
          <p className="font-semibold">Modo de simulación Preview</p>
          <p className="mt-1">No se registrarán pagos ni se subirán archivos reales.</p>
        </div>
      )}

      <header className="space-y-2">
        <h1 className="font-display text-2xl text-text-primary">Recuperar pago de reserva</h1>
        <p className="text-sm text-text-secondary">
          Revisa el método, adjunta el comprobante si corresponde y simula el reporte seguro.
        </p>
      </header>

      <section className="grid gap-3 rounded-lg border border-brand-border/70 bg-black/10 p-4 text-sm text-text-secondary md:grid-cols-2">
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Código</span>
          <p className="text-text-primary">{session.publicCode}</p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Servicio</span>
          <p className="text-text-primary">{session.serviceName}</p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Modalidad</span>
          <p className="text-text-primary">{session.variantName}</p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Fecha y hora</span>
          <p className="text-text-primary">
            {session.eventDate && session.startTime
              ? `${session.eventDate} ${session.startTime}`
              : 'Por definir'}
          </p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Monto USD</span>
          <p className="text-text-primary">{session.amountUsdLabel}</p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Monto Bs</span>
          <p className="text-text-primary">{session.amountBsLabel}</p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Tasa BCV</span>
          <p className="text-text-primary">
            {session.bcvRate > 0 ? session.bcvRate.toFixed(2) : 'Por definir'}
          </p>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-text-muted">Fecha límite</span>
          <p className="text-text-primary">{formatIsoDate(session.paymentDeadlineIso)}</p>
        </div>
      </section>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-text-primary">Método de pago</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {session.paymentMethods.map((method) => (
            <label
              key={method.slug}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-border/70 bg-black/10 p-4 text-sm transition-colors hover:border-accent-gold/40"
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.slug}
                checked={selectedMethodSlug === method.slug}
                onChange={() => setSelectedMethodSlug(method.slug)}
                className="mt-1"
              />
              <span className="space-y-1">
                <span className="block font-medium text-text-primary">{method.name}</span>
                <span className="block text-xs text-text-secondary">{method.customerMessage}</span>
                <span className="block text-xs text-text-muted">
                  {method.proofRequired ? 'Requiere comprobante.' : 'Comprobante opcional.'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="space-y-2 rounded-lg border border-brand-border/70 bg-black/10 p-4">
        <h2 className="text-sm font-semibold text-text-primary">Instrucciones del método</h2>
        {selectedMethod ? (
          <>
            <p className="text-sm text-text-secondary">{selectedMethod.referenceHint}</p>
            {selectedMethod.details.length > 0 ? (
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                {selectedMethod.details.map((detail) => (
                  <div key={`${detail.key}-${detail.label}`} className="rounded-md border border-brand-border/50 bg-black/5 p-3">
                    <dt className="text-xs uppercase tracking-wide text-text-muted">{detail.label}</dt>
                    <dd className="text-text-primary">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-text-muted">No hay detalles operativos publicados para este método.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-text-muted">Selecciona un método para ver las instrucciones.</p>
        )}
      </section>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-primary">Referencia</span>
        <input
          type="text"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-gold"
          placeholder="Referencia de pago"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-primary">
          Comprobante {requiresProof ? '(requerido)' : '(opcional)'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-accent-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background"
        />
        {selectedFile ? (
          <p className="text-xs text-text-muted">{selectedFile.name}</p>
        ) : (
          <p className="text-xs text-text-muted">
            {requiresProof
              ? 'Debes seleccionar un comprobante antes de continuar.'
              : 'Si deseas, puedes adjuntar un comprobante.'}
          </p>
        )}
      </label>

      <div
        ref={errorSummaryRef}
        tabIndex={-1}
        aria-live="polite"
        className="min-h-6 rounded-md"
      >
        {errorMessage ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">{announcement}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-accent-gold px-4 py-2 text-sm font-semibold text-background transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {visualState === 'creating_intent'
          ? 'Creando intento...'
          : visualState === 'uploading'
            ? 'Subiendo comprobante...'
            : visualState === 'reporting'
              ? 'Enviando reporte...'
              : 'Simular reporte de pago'}
      </button>
    </form>
  )
}
