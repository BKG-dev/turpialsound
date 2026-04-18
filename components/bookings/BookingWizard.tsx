'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ServiceSelectStep } from '@/components/bookings/steps/ServiceSelectStep'
import { VariantSelectStep } from '@/components/bookings/steps/VariantSelectStep'
import { DateTimeStep, deriveEndTime } from '@/components/bookings/steps/DateTimeStep'
import { ExtrasStep } from '@/components/bookings/steps/ExtrasStep'
import {
  ContactStep,
  isValidEmail,
  isValidWhatsappVe,
  normalizeWhatsappVe,
} from '@/components/bookings/steps/ContactStep'
import { SummaryStep } from '@/components/bookings/steps/SummaryStep'
import { PaymentCountdownCTA } from '@/components/bookings/PaymentCountdownCTA'
import { CATALOG_SERVICES, CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { submitBookingRequest } from '@/lib/bookings/actions'
import { buildBookingEstimate } from '@/lib/bookings/estimate'
import {
  formatUsdByCurrency,
  useBcvRate,
} from '@/lib/bookings/currency-display'
import {
  getEnabledPaymentMethods,
  getPaymentWindowMinutes,
  getPrimaryPaymentMethod,
  type BookingPaymentMethodSlug,
} from '@/lib/bookings/payment-settings'
import type { SelectedBookingItem } from '@/lib/bookings/types'

interface WizardStepDef {
  id: string
  label: string
  title: string
}

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'service', label: 'Servicio', title: 'Que tipo de servicio necesitas?' },
  { id: 'variant', label: 'Modalidad', title: 'Elige la modalidad' },
  { id: 'date', label: 'Fecha', title: 'Fecha y bloque horario' },
  { id: 'extras', label: 'Extras', title: 'Requerimientos adicionales' },
  { id: 'contact', label: 'Tus datos', title: 'Datos del solicitante' },
  { id: 'summary', label: 'Resumen', title: 'Revisa tu solicitud' },
]

interface WizardData {
  selectedItems: SelectedBookingItem[]
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  requesterName: string
  requesterEmail: string
  requesterPhone: string
}

const INITIAL_DATA: WizardData = {
  selectedItems: [],
  eventDate: null,
  startTime: null,
  durationMinutes: null,
  extrasNotes: '',
  extrasTechnician: true,
  extrasBackline: true,
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
}

const PRIMARY_PAYMENT_METHOD = getPrimaryPaymentMethod()
const ENABLED_PAYMENT_METHODS = getEnabledPaymentMethods()
const PAYMENT_WINDOW_MINUTES = getPaymentWindowMinutes()

function formatBookingDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

interface BookingWizardProps {
  onSubmissionStateChange?: (state: 'idle' | 'loading' | 'success' | 'error') => void
}

export function BookingWizard({ onSubmissionStateChange }: BookingWizardProps = {}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [publicCode, setPublicCode] = useState<string | null>(null)
  const [assignedResourceName, setAssignedResourceName] = useState<string | null>(null)
  const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | null>(null)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [selectedPaymentMethodSlug, setSelectedPaymentMethodSlug] =
    useState<BookingPaymentMethodSlug>(PRIMARY_PAYMENT_METHOD.slug)
  const [copyStatusKey, setCopyStatusKey] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalSteps = WIZARD_STEPS.length
  const step = WIZARD_STEPS[currentStep]
  const primaryItem = data.selectedItems[0] ?? null
  const selectedServiceSlug = primaryItem?.serviceSlug ?? null
  const selectedVariantSlug = primaryItem?.variantSlug ?? null
  const bookingEstimate = useMemo(
    () =>
      buildBookingEstimate({
        selectedItems: data.selectedItems,
        eventDate: data.eventDate,
        durationMinutes: data.durationMinutes,
        extrasTechnician: data.extrasTechnician,
        extrasBackline: data.extrasBackline,
      }),
    [
      data.selectedItems,
      data.eventDate,
      data.durationMinutes,
      data.extrasTechnician,
      data.extrasBackline,
    ],
  )
  const paymentWindowLabel =
    PAYMENT_WINDOW_MINUTES === 60 ? '1 hora' : `${PAYMENT_WINDOW_MINUTES} minutos`
  const bcvState = useBcvRate()
  const estimatedTotalUsdLabel = formatUsdByCurrency(bookingEstimate.estimatedTotalUsd, 'usd', bcvState.rate)
  const estimatedTotalBsLabel = formatUsdByCurrency(bookingEstimate.estimatedTotalUsd, 'bs', bcvState.rate)
  const selectedPaymentMethod =
    ENABLED_PAYMENT_METHODS.find((method) => method.slug === selectedPaymentMethodSlug) ??
    PRIMARY_PAYMENT_METHOD
  const selectedServiceName =
    CATALOG_SERVICES.find((service) => service.slug === selectedServiceSlug)?.name ??
    selectedServiceSlug ??
    ''
  const selectedVariantName =
    CATALOG_VARIANTS.find((variant) => variant.slug === selectedVariantSlug)?.name ??
    selectedVariantSlug ??
    ''
  const bookingDateLabel = data.eventDate ? formatBookingDate(data.eventDate) : null
  const bookingEndTime =
    data.startTime && data.durationMinutes !== null
      ? deriveEndTime(data.startTime, data.durationMinutes)
      : null
  const durationLabel =
    data.durationMinutes !== null
      ? data.durationMinutes % 60 === 0
        ? `${data.durationMinutes / 60} hora${data.durationMinutes / 60 === 1 ? '' : 's'}`
        : `${Math.floor(data.durationMinutes / 60)}h ${String(data.durationMinutes % 60).padStart(2, '0')}m`
      : null
  const selectedExtras = [
    data.extrasTechnician ? 'Tecnico incluido' : null,
    data.extrasBackline ? 'Backline incluido' : null,
  ].filter(Boolean) as string[]
  const hasPurchaseExtras = selectedExtras.length > 0 || data.extrasNotes.trim().length > 0
  const activeAmountLabel = estimatedTotalBsLabel
  const secondaryAmountLabel = estimatedTotalUsdLabel
  const paymentDeadlineMs = useMemo(() => {
    if (!paymentDeadlineIso) return null
    const parsedDeadline = new Date(paymentDeadlineIso).getTime()
    return Number.isNaN(parsedDeadline) ? null : parsedDeadline
  }, [paymentDeadlineIso])
  const countdownStartSeconds = useMemo(() => {
    if (paymentDeadlineMs === null) {
      return PAYMENT_WINDOW_MINUTES * 60
    }
    return Math.max(0, Math.floor((paymentDeadlineMs - Date.now()) / 1000))
  }, [paymentDeadlineMs])
  const bcvCompactLabel = useMemo(() => {
    if (bcvState.loading) {
      return 'TASA BCV = Bs. --.-- (actualizada: --)'
    }

    const dateLabel = bcvState.asOf
      ? new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
          .format(new Date(bcvState.asOf))
          .replace('T', ' ')
      : '--'

    const rateLabel = bcvState.rate.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    if (bcvState.mode === 'live') {
      return `TASA BCV = Bs. ${rateLabel} (actualizada: ${dateLabel})`
    }

    return `TASA REFERENCIAL = Bs. ${rateLabel} (actualizada: ${dateLabel})`
  }, [bcvState])

  useEffect(() => {
    onSubmissionStateChange?.(submissionState)
  }, [onSubmissionStateChange, submissionState])

  const canProceed =
    currentStep === 0
      ? selectedServiceSlug !== null
      : currentStep === 1
        ? selectedVariantSlug !== null
        : currentStep === 2
          ? data.eventDate !== null && data.startTime !== null && data.durationMinutes !== null
          : currentStep === 3
            ? true
            : currentStep === 4
              ? data.requesterName.trim() !== '' &&
                isValidEmail(data.requesterEmail) &&
                isValidWhatsappVe(data.requesterPhone)
              : currentStep === 5
                ? true
                : false

  function setPrimaryItem(
    updater: (currentItem: SelectedBookingItem | null) => SelectedBookingItem | null,
  ) {
    setData((currentData) => {
      const nextItem = updater(currentData.selectedItems[0] ?? null)
      return {
        ...currentData,
        selectedItems: nextItem ? [nextItem] : [],
      }
    })
  }

  function handleNext() {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setFurthestStep((currentFurthestStep) => Math.max(currentFurthestStep, nextStep))
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  function resetWizard() {
    setCurrentStep(0)
    setFurthestStep(0)
    setData(INITIAL_DATA)
    setSubmissionState('idle')
    setPublicCode(null)
    setAssignedResourceName(null)
    setPaymentDeadlineIso(null)
    setShowPaymentOptions(false)
    setSelectedPaymentMethodSlug(PRIMARY_PAYMENT_METHOD.slug)
    setCopyStatusKey(null)
    setSubmitError(null)
  }

  function markCopied(key: string) {
    setCopyStatusKey(key)
    window.setTimeout(() => {
      setCopyStatusKey((currentKey) => (currentKey === key ? null : currentKey))
    }, 1800)
  }

  async function handleCopy(key: string, value: string | undefined) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      markCopied(key)
    } catch {
      // noop
    }
  }

  function handleStepClick(stepIndex: number) {
    if (submissionState === 'loading' || stepIndex > furthestStep || stepIndex === currentStep) {
      return
    }

    setCurrentStep(stepIndex)
  }

  async function handleSubmit() {
    if (submissionState === 'loading') return

    if (
      bookingEstimate.isBlocked ||
      !selectedServiceSlug ||
      !selectedVariantSlug ||
      !data.eventDate ||
      !data.startTime ||
      !data.durationMinutes
    ) {
      setSubmitError('La solicitud requiere ajustes antes de enviarse.')
      setSubmissionState('error')
      return
    }

    setSubmissionState('loading')
    setPublicCode(null)
    setAssignedResourceName(null)
    setPaymentDeadlineIso(null)
    setShowPaymentOptions(false)
    setSubmitError(null)

    const result = await submitBookingRequest({
      serviceSlug: selectedServiceSlug,
      variantSlug: selectedVariantSlug,
      eventDate: data.eventDate,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      extrasNotes: data.extrasNotes,
      extrasTechnician: data.extrasTechnician,
      extrasBackline: data.extrasBackline,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      requesterPhone: normalizeWhatsappVe(data.requesterPhone),
    })

    if (result.success && result.publicCode) {
      setPublicCode(result.publicCode)
      setAssignedResourceName(result.assignedResourceName ?? null)
      setPaymentDeadlineIso(result.paymentDeadlineIso ?? null)
      setShowPaymentOptions(false)
      setSelectedPaymentMethodSlug(PRIMARY_PAYMENT_METHOD.slug)
      setSubmissionState('success')
    } else {
      setSubmitError(result.error ?? 'Error al enviar. Intenta de nuevo.')
      setSubmissionState('error')
    }
  }

  if (submissionState === 'success' && publicCode) {
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
                Solicitud enviada
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
                Tu solicitud quedo en estado pendiente de pago. El bloque quedo apartado por{' '}
                {paymentWindowLabel} mientras confirmamos el pago.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="rounded-lg border border-brand-border bg-brand-bg/30 px-2 py-1.5">
                <PaymentCountdownCTA
                  initialSeconds={countdownStartSeconds}
                  onClick={() => setShowPaymentOptions((currentState) => !currentState)}
                />
              </div>

              <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-2.5 py-1.5 text-center sm:max-w-[19rem]">
                <p className="mb-0.5 text-[10px] text-text-muted">Codigo de solicitud</p>
                <p className="font-display text-sm font-bold tracking-wider text-accent-gold md:text-base">
                  {publicCode}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
              <div className="space-y-1.5 text-[11px] leading-snug">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Servicio</p>
                  <p className="font-medium text-text-primary">{selectedServiceName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">Modalidad</p>
                  <p className="font-medium text-text-primary">{selectedVariantName}</p>
                </div>
                {(bookingDateLabel || data.startTime || durationLabel) && (
                  <div className="grid gap-1 sm:grid-cols-3">
                    {bookingDateLabel && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Fecha</p>
                        <p className="text-text-secondary">{bookingDateLabel}</p>
                      </div>
                    )}
                    {data.startTime && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Horario</p>
                        <p className="text-text-secondary">
                          {data.startTime}
                          {bookingEndTime ? ` - ${bookingEndTime}` : ''}
                        </p>
                      </div>
                    )}
                    {durationLabel && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Duracion</p>
                        <p className="text-text-secondary">{durationLabel}</p>
                      </div>
                    )}
                  </div>
                )}
                {hasPurchaseExtras && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Extras incluidos</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {selectedExtras.map((extraLabel) => (
                        <span
                          key={extraLabel}
                          className="rounded-full border border-brand-border bg-brand-bg/30 px-1.5 py-0.5 text-[10px] text-text-secondary"
                        >
                          {extraLabel}
                        </span>
                      ))}
                    </div>
                    {data.extrasNotes.trim() && (
                      <p className="mt-0.5 text-text-secondary">Notas: {data.extrasNotes.trim()}</p>
                    )}
                  </div>
                )}
                {assignedResourceName && (
                  <p className="text-[10px] text-text-muted">Sala asignada: {assignedResourceName}</p>
                )}
              </div>

              <div className="mt-1.5 text-[11px] leading-snug text-text-muted">
                <p className="mb-0.5 text-[10px] uppercase tracking-wide text-text-muted">Monto a pagar</p>
                <p className="font-medium text-text-primary">{activeAmountLabel}</p>
                <p>
                  USD:{' '}
                  <span className="font-medium text-text-primary">{secondaryAmountLabel}</span>
                </p>
                <p>{bcvCompactLabel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-2">
            {showPaymentOptions && (
              <div>
                <div className="mb-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {ENABLED_PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.slug}
                      type="button"
                      onClick={() => setSelectedPaymentMethodSlug(method.slug)}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[10px] font-medium leading-tight transition-colors',
                        selectedPaymentMethod.slug === method.slug
                          ? 'border-accent-gold bg-accent-gold/10 text-text-primary'
                          : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/50',
                      )}
                      aria-pressed={selectedPaymentMethod.slug === method.slug}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {selectedPaymentMethod.slug === 'pago_movil' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Pago movil</p>
                      <p className="text-[10px] text-text-muted">Envia tu pago a estos datos:</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {estimatedTotalBsLabel}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-amount', estimatedTotalBsLabel)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Banco: {selectedPaymentMethod.details?.bankName ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('pm-bank', selectedPaymentMethod.details?.bankName)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Telefono: {selectedPaymentMethod.details?.phoneNumber ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('pm-phone', selectedPaymentMethod.details?.phoneNumber)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Cedula / RIF: {selectedPaymentMethod.details?.beneficiaryDocument ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('pm-doc', selectedPaymentMethod.details?.beneficiaryDocument)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Referencia: {publicCode}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-ref', publicCode)}>
                          Copiar
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Importante: En el concepto del pago, coloca: {publicCode}
                      </p>
                      {selectedPaymentMethod.details?.qrImageUrl ? (
                        <img
                          src={selectedPaymentMethod.details.qrImageUrl}
                          alt="QR Pago Movil"
                          className="h-16 w-16 rounded-md border border-brand-border object-contain"
                        />
                      ) : (
                        <div className="h-10 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-1 text-[10px] text-text-muted">
                          Espacio QR preparado. Disponible cuando se configure la fuente real.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'transferencia' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Transferencia</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {estimatedTotalBsLabel}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-amount', estimatedTotalBsLabel)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Banco: {selectedPaymentMethod.details?.bankName ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-bank', selectedPaymentMethod.details?.bankName)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Cuenta: {selectedPaymentMethod.details?.accountNumber ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-account', selectedPaymentMethod.details?.accountNumber)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Titular: {selectedPaymentMethod.details?.accountHolder ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-holder', selectedPaymentMethod.details?.accountHolder)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          RIF / Cedula: {selectedPaymentMethod.details?.beneficiaryDocument ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('tr-doc', selectedPaymentMethod.details?.beneficiaryDocument)}
                        >
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">Referencia: {publicCode}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-ref', publicCode)}>
                          Copiar
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'binance' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Binance</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {estimatedTotalUsdLabel}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('bn-amount', estimatedTotalUsdLabel)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-text-secondary">
                          Pay ID: {selectedPaymentMethod.details?.payId ?? 'Por definir'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy('bn-payid', selectedPaymentMethod.details?.payId)}
                        >
                          Copiar
                        </Button>
                      </div>
                      {selectedPaymentMethod.details?.qrImageUrl ? (
                        <img
                          src={selectedPaymentMethod.details.qrImageUrl}
                          alt="QR Binance"
                          className="h-16 w-16 rounded-md border border-brand-border object-contain"
                        />
                      ) : (
                        <div className="h-10 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-1 text-[10px] text-text-muted">
                          Espacio QR preparado. Disponible cuando se configure la fuente real.
                        </div>
                      )}
                      <p className="text-[10px] text-text-muted">Envia captura del comprobante al finalizar.</p>
                    </div>
                  )}

                  {selectedPaymentMethod.slug === 'efectivo' && (
                    <div className="space-y-1 rounded-lg border border-brand-border bg-brand-surface p-1.5">
                      <p className="text-[11px] font-semibold text-text-primary">Efectivo</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-accent-gold/20 bg-accent-gold/5 px-2 py-1 text-[10px]">
                        <span className="text-text-secondary">Monto a pagar: {estimatedTotalUsdLabel}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy('cash-amount', estimatedTotalUsdLabel)}>
                          Copiar
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        Solo valido para pago presencial dentro de la ventana activa del apartado.
                      </p>
                      <p className="text-[10px] text-text-muted">
                        El bloque sigue sujeto a la ventana de {paymentWindowLabel} para completar el pago.
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-1 text-center text-[10px] text-text-muted">
                  {copyStatusKey ? 'Dato copiado.' : selectedPaymentMethod.referenceHint}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-brand-border/70 pt-1.5">
          <p className="text-[10px] leading-snug text-text-muted">
            Guarda tu codigo de solicitud para reportar el pago y hacer seguimiento.
          </p>
          <Button variant="ghost" size="sm" onClick={resetWizard}>
            Crear una nueva solicitud
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-brand-border bg-brand-surface"
      aria-busy={submissionState === 'loading'}
    >
      <div className="border-b border-brand-border px-5 py-3 md:px-6 md:py-3">
        <ol
          className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:gap-2 xl:gap-3 lg:overflow-visible lg:pb-0"
          aria-label="Pasos del formulario"
        >
          {WIZARD_STEPS.map((s, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isVisited = index <= furthestStep
            const isClickable = isVisited && !isCurrent && submissionState !== 'loading'
            return (
              <li key={s.id} className="min-w-[8.5rem] flex-1 lg:min-w-0">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-2.5 py-3 text-left transition-colors',
                    isCurrent
                      ? 'border-accent-gold bg-accent-gold/5'
                      : isCompleted
                        ? 'border-accent-gold/30 bg-accent-gold/5'
                        : 'border-brand-border bg-transparent',
                    isClickable
                      ? 'cursor-pointer hover:border-accent-gold/50 hover:bg-accent-gold/5'
                      : 'cursor-default',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isCompleted
                        ? 'bg-accent-gold text-brand-bg'
                        : isCurrent
                          ? 'border-2 border-accent-gold text-accent-gold'
                          : isVisited
                            ? 'border border-brand-border text-text-secondary'
                            : 'border border-brand-border text-text-muted',
                    )}
                  >
                    {isCompleted ? (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[11px] font-medium leading-tight xl:text-xs',
                        isCurrent || isCompleted ? 'text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div
        className={cn(
          'p-4 md:px-6 md:py-3',
          currentStep === 5 && 'md:py-2.5 lg:py-2',
        )}
      >
        <div
          className={cn(
            'mb-4 md:mb-3',
            (currentStep === 0 ||
              currentStep === 1 ||
              currentStep === 2 ||
              currentStep === 3 ||
              currentStep === 4 ||
              currentStep === 5) &&
              'md:hidden',
          )}
        >
          <h2 className="font-display text-lg font-bold text-text-primary md:text-xl">
            {step.title}
          </h2>
        </div>

        {currentStep === totalSteps - 1 && submissionState === 'loading' && (
          <div className="mb-6 rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold"
                aria-hidden="true"
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-text-primary">Enviando tu solicitud</p>
                <p className="text-text-secondary">
                  Estamos registrando tus datos. No cierres esta ventana hasta recibir la
                  confirmacion.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 0 && (
          <ServiceSelectStep
            selected={selectedServiceSlug}
            onChange={(slug) =>
              setPrimaryItem((currentItem) => ({
                serviceSlug: slug,
                variantSlug: currentItem?.serviceSlug === slug ? currentItem.variantSlug : null,
                quantity: currentItem?.quantity ?? 1,
              }))
            }
          />
        )}

        {currentStep === 1 && selectedServiceSlug && (
          <VariantSelectStep
            serviceSlug={selectedServiceSlug}
            selected={selectedVariantSlug}
            onChange={(slug) =>
              setPrimaryItem((currentItem) => ({
                serviceSlug: currentItem?.serviceSlug ?? selectedServiceSlug,
                variantSlug: slug,
                quantity: currentItem?.quantity ?? 1,
              }))
            }
          />
        )}

        {currentStep === 2 && (
          <DateTimeStep
            eventDate={data.eventDate}
            startTime={data.startTime}
            durationMinutes={data.durationMinutes}
            onDateChange={(value) => setData((d) => ({ ...d, eventDate: value }))}
            onStartTimeChange={(value) => setData((d) => ({ ...d, startTime: value, durationMinutes: null }))}
            onDurationChange={(value) => setData((d) => ({ ...d, durationMinutes: value }))}
          />
        )}

        {currentStep === 3 && (
          <ExtrasStep
            notes={data.extrasNotes}
            technician={data.extrasTechnician}
            backline={data.extrasBackline}
            onNotesChange={(value) => setData((d) => ({ ...d, extrasNotes: value }))}
            onTechnicianChange={(value) => setData((d) => ({ ...d, extrasTechnician: value }))}
            onBacklineChange={(value) => setData((d) => ({ ...d, extrasBackline: value }))}
          />
        )}

        {currentStep === 4 && (
          <ContactStep
            name={data.requesterName}
            email={data.requesterEmail}
            phone={data.requesterPhone}
            onNameChange={(value) => setData((d) => ({ ...d, requesterName: value }))}
            onEmailChange={(value) => setData((d) => ({ ...d, requesterEmail: value }))}
            onPhoneChange={(value) => setData((d) => ({ ...d, requesterPhone: value }))}
          />
        )}

        {currentStep === 5 &&
          selectedServiceSlug &&
          selectedVariantSlug &&
          data.eventDate &&
          data.startTime &&
          data.durationMinutes && (
            <SummaryStep
              serviceSlug={selectedServiceSlug}
              variantSlug={selectedVariantSlug}
              eventDate={data.eventDate}
              startTime={data.startTime}
              durationMinutes={data.durationMinutes}
              extrasNotes={data.extrasNotes}
              extrasTechnician={data.extrasTechnician}
              extrasBackline={data.extrasBackline}
              requesterName={data.requesterName}
              requesterEmail={data.requesterEmail}
              requesterPhone={normalizeWhatsappVe(data.requesterPhone)}
              estimate={bookingEstimate}
            />
          )}
      </div>

      {submitError && (
        <div className="border-t border-brand-border bg-red-500/5 px-6 py-3">
          <p className="text-sm font-medium text-red-300">No pudimos registrar tu solicitud.</p>
          <p className="mt-1 text-xs text-red-200/90">
            {submitError} Revisa los datos e intenta de nuevo.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-brand-border px-5 py-3 md:px-6 md:py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0 || submissionState === 'loading'}
        >
          Anterior
        </Button>

        <span className="text-xs text-text-muted">
          Paso {currentStep + 1} de {totalSteps}
        </span>

        {currentStep < totalSteps - 1 ? (
          <Button variant="primary" size="sm" onClick={handleNext} disabled={!canProceed}>
            Continuar
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submissionState === 'loading' || bookingEstimate.isBlocked}
          >
            {submissionState === 'loading'
              ? 'Enviando solicitud...'
              : bookingEstimate.isBlocked
                ? 'Corrige la solicitud'
                : 'Enviar solicitud'}
          </Button>
        )}
      </div>
    </div>
  )
}

