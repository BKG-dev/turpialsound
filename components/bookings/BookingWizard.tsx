'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ServiceSelectStep } from '@/components/bookings/steps/ServiceSelectStep'
import { VariantSelectStep } from '@/components/bookings/steps/VariantSelectStep'
import { DateTimeStep } from '@/components/bookings/steps/DateTimeStep'
import { ExtrasStep } from '@/components/bookings/steps/ExtrasStep'
import {
  ContactStep,
  isValidEmail,
  isValidWhatsappVe,
  normalizeWhatsappVe,
} from '@/components/bookings/steps/ContactStep'
import { SummaryStep } from '@/components/bookings/steps/SummaryStep'
import { submitBookingRequest } from '@/lib/bookings/actions'
import { buildBookingEstimate } from '@/lib/bookings/estimate'
import {
  formatBcvReferenceLabel,
  formatUsdByCurrency,
  useBcvRate,
  type DisplayCurrency,
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

export function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [publicCode, setPublicCode] = useState<string | null>(null)
  const [assignedResourceName, setAssignedResourceName] = useState<string | null>(null)
  const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('bs')
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
  const estimatedTotalDisplay = formatUsdByCurrency(
    bookingEstimate.estimatedTotalUsd,
    displayCurrency,
    bcvState.rate,
  )
  const bcvReferenceLabel = formatBcvReferenceLabel(bcvState)
  const selectedPaymentMethod =
    ENABLED_PAYMENT_METHODS.find((method) => method.slug === selectedPaymentMethodSlug) ??
    PRIMARY_PAYMENT_METHOD
  const paymentDeadlineMs = useMemo(() => {
    if (!paymentDeadlineIso) return null
    const parsedDeadline = new Date(paymentDeadlineIso).getTime()
    return Number.isNaN(parsedDeadline) ? null : parsedDeadline
  }, [paymentDeadlineIso])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const remainingSeconds =
    paymentDeadlineMs === null ? null : Math.max(0, Math.floor((paymentDeadlineMs - nowMs) / 1000))
  const countdownLabel = useMemo(() => {
    if (remainingSeconds === null) {
      return `${String(PAYMENT_WINDOW_MINUTES).padStart(2, '0')}:00`
    }
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [remainingSeconds])
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
    if (paymentDeadlineMs === null) {
      return
    }

    setNowMs(Date.now())
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [paymentDeadlineMs])

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
    setDisplayCurrency('bs')
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
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-8">
        <div className="mb-4 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-gold/10">
            <svg
              className="h-7 w-7 text-accent-gold"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <h2 className="mb-2 text-center font-display text-xl font-bold text-text-primary">
          Solicitud enviada
        </h2>
        <p className="mb-6 text-center text-sm text-text-secondary">
          Tu solicitud quedo en estado pendiente de pago. El bloque quedo apartado por{' '}
          {paymentWindowLabel} mientras confirmamos el pago.
        </p>

        <div className="mb-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-6 py-4 text-center">
          <p className="mb-1 text-xs text-text-muted">Codigo de solicitud</p>
          <p className="font-display text-2xl font-bold tracking-wider text-accent-gold">{publicCode}</p>
        </div>

        <div className="mb-4 grid gap-3 rounded-lg border border-brand-border bg-brand-bg/40 p-4 sm:grid-cols-2">
          <p className="text-sm text-text-secondary">
            Sala asignada:{' '}
            <span className="font-medium text-text-primary">
              {assignedResourceName ?? 'Por confirmar'}
            </span>
          </p>
          <p className="text-sm text-text-secondary">
            Total:{' '}
            <span className="font-medium text-text-primary">
              {estimatedTotalDisplay}
            </span>
          </p>
          <p className="text-sm text-text-secondary sm:col-span-2">
            Tiempo limite para pagar:{' '}
            <span className="font-medium text-text-primary">{countdownLabel}</span>
          </p>
          <div className="text-xs text-text-muted sm:col-span-2">
            <div
              className="mb-2 flex rounded-lg border border-brand-border p-1"
              role="group"
              aria-label="Moneda del total"
            >
              <button
                type="button"
                onClick={() => setDisplayCurrency('usd')}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  displayCurrency === 'usd'
                    ? 'bg-accent-gold text-brand-bg'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                aria-pressed={displayCurrency === 'usd'}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency('bs')}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  displayCurrency === 'bs'
                    ? 'bg-accent-gold text-brand-bg'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                aria-pressed={displayCurrency === 'bs'}
              >
                Bs.
              </button>
            </div>
            <p>
              USD: <span className="font-medium text-text-primary">{estimatedTotalUsdLabel}</span>
            </p>
            <p className="mt-0.5">
              Bs: <span className="font-medium text-text-primary">{estimatedTotalBsLabel}</span>
            </p>
            <p className="mt-1">{bcvCompactLabel}</p>
          </div>
        </div>

        <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Inicia tu pago</h3>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => setShowPaymentOptions((currentState) => !currentState)}
          >
            Pagar en 3 seg
          </Button>

          {showPaymentOptions && (
            <div className="mt-4">
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                {ENABLED_PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.slug}
                    type="button"
                    onClick={() => setSelectedPaymentMethodSlug(method.slug)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
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

              {selectedPaymentMethod.slug === 'pago_movil' && (
                <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-semibold text-text-primary">Opcion A: Pago Movil</p>
                  <p className="text-xs text-text-muted">Envia tu pago a estos datos:</p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Banco: {selectedPaymentMethod.details?.bankName ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-bank', selectedPaymentMethod.details?.bankName)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Telefono: {selectedPaymentMethod.details?.phoneNumber ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-phone', selectedPaymentMethod.details?.phoneNumber)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Cedula / RIF: {selectedPaymentMethod.details?.beneficiaryDocument ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-doc', selectedPaymentMethod.details?.beneficiaryDocument)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Referencia: {publicCode}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('pm-ref', publicCode)}>Copiar</Button>
                  </div>
                  <p className="text-xs text-text-muted">Importante: En el concepto del pago, coloca: {publicCode}</p>
                  {selectedPaymentMethod.details?.qrImageUrl ? (
                    <img
                      src={selectedPaymentMethod.details.qrImageUrl}
                      alt="QR Pago Movil"
                      className="h-36 w-36 rounded-md border border-brand-border object-contain"
                    />
                  ) : (
                    <div className="h-24 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-3 text-xs text-text-muted">
                      Espacio QR preparado. Disponible cuando se configure la fuente real.
                    </div>
                  )}
                </div>
              )}

              {selectedPaymentMethod.slug === 'transferencia' && (
                <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-semibold text-text-primary">Opcion B: Transferencia Bancaria</p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Banco: {selectedPaymentMethod.details?.bankName ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-bank', selectedPaymentMethod.details?.bankName)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Cuenta: {selectedPaymentMethod.details?.accountNumber ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-account', selectedPaymentMethod.details?.accountNumber)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Titular: {selectedPaymentMethod.details?.accountHolder ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-holder', selectedPaymentMethod.details?.accountHolder)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">RIF / Cedula: {selectedPaymentMethod.details?.beneficiaryDocument ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-doc', selectedPaymentMethod.details?.beneficiaryDocument)}>Copiar</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Referencia: {publicCode}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('tr-ref', publicCode)}>Copiar</Button>
                  </div>
                </div>
              )}

              {selectedPaymentMethod.slug === 'binance' && (
                <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-semibold text-text-primary">Opcion C: Binance (USDT)</p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">Pay ID: {selectedPaymentMethod.details?.payId ?? 'Por definir'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('bn-payid', selectedPaymentMethod.details?.payId)}>Copiar</Button>
                  </div>
                  <p className="text-sm text-text-secondary">Monto exacto: {estimatedTotalDisplay}</p>
                  {selectedPaymentMethod.details?.qrImageUrl ? (
                    <img
                      src={selectedPaymentMethod.details.qrImageUrl}
                      alt="QR Binance"
                      className="h-36 w-36 rounded-md border border-brand-border object-contain"
                    />
                  ) : (
                    <div className="h-24 rounded-md border border-dashed border-brand-border/80 bg-brand-bg/30 p-3 text-xs text-text-muted">
                      Espacio QR preparado. Disponible cuando se configure la fuente real.
                    </div>
                  )}
                  <p className="text-xs text-text-muted">Envia captura del comprobante al finalizar.</p>
                </div>
              )}

              {selectedPaymentMethod.slug === 'efectivo' && (
                <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-semibold text-text-primary">Opcion D: Efectivo</p>
                  <p className="text-sm text-text-secondary">
                    Solo valido para pago presencial dentro de la ventana activa del apartado.
                  </p>
                  <p className="text-xs text-text-muted">
                    El bloque sigue sujeto a la ventana de {paymentWindowLabel} para completar el pago.
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs text-text-muted">
                {copyStatusKey ? 'Dato copiado.' : selectedPaymentMethod.referenceHint}
              </p>
            </div>
          )}
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-text-muted">
          Guarda tu codigo de solicitud para reportar el pago y hacer seguimiento.
        </p>
        <div className="mt-6">
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

      <div className="p-5 md:px-6 md:py-4">
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
            <>
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
              <div className="mt-4 rounded-lg border border-brand-border bg-brand-bg/40 p-4">
                <div className="mb-3 flex rounded-lg border border-brand-border p-1" role="group" aria-label="Moneda del total estimado">
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('usd')}
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                      displayCurrency === 'usd'
                        ? 'bg-accent-gold text-brand-bg'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                    aria-pressed={displayCurrency === 'usd'}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayCurrency('bs')}
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                      displayCurrency === 'bs'
                        ? 'bg-accent-gold text-brand-bg'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                    aria-pressed={displayCurrency === 'bs'}
                  >
                    Bs.
                  </button>
                </div>
                <p className="text-sm text-text-secondary">
                  Total estimado:{' '}
                  <span className="font-medium text-text-primary">{estimatedTotalDisplay}</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  USD: <span className="font-medium text-text-primary">{estimatedTotalUsdLabel}</span> | Bs:{' '}
                  <span className="font-medium text-text-primary">{estimatedTotalBsLabel}</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">{bcvReferenceLabel}</p>
              </div>
            </>
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

      <div className="flex items-center justify-between border-t border-brand-border px-5 py-3 md:px-6 md:py-4">
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

