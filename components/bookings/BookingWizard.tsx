'use client'

import { useMemo, useState } from 'react'
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
  const [selectedPaymentMethodSlug, setSelectedPaymentMethodSlug] =
    useState<BookingPaymentMethodSlug>(PRIMARY_PAYMENT_METHOD.slug)
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
  const selectedPaymentMethod =
    ENABLED_PAYMENT_METHODS.find((method) => method.slug === selectedPaymentMethodSlug) ??
    PRIMARY_PAYMENT_METHOD
  const paymentDeadlineLabel = useMemo(() => {
    if (!paymentDeadlineIso) {
      return null
    }

    const parsedDeadline = new Date(paymentDeadlineIso)
    if (Number.isNaN(parsedDeadline.getTime())) {
      return null
    }

    return new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(parsedDeadline)
  }, [paymentDeadlineIso])

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
    setSelectedPaymentMethodSlug(PRIMARY_PAYMENT_METHOD.slug)
    setSubmitError(null)
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
          {paymentWindowLabel} mientras verificamos tu pago manualmente.
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
              {bookingEstimate.estimatedTotalUsd} USD
            </span>
          </p>
          <p className="text-sm text-text-secondary sm:col-span-2">
            Tiempo limite para pagar:{' '}
            <span className="font-medium text-text-primary">
              {paymentDeadlineLabel
                ? `${paymentDeadlineLabel} (GMT-4 / America-Caracas)`
                : `Dentro de ${paymentWindowLabel} (GMT-4 / America-Caracas)`}
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Instrucciones de pago</h3>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
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
          <p className="text-sm text-text-secondary">
            Metodo seleccionado:{' '}
            <span className="font-medium text-text-primary">{selectedPaymentMethod.name}</span>
          </p>
          {selectedPaymentMethod.details?.beneficiaryName && (
            <p className="mt-1 text-sm text-text-secondary">
              Beneficiario:{' '}
              <span className="font-medium text-text-primary">
                {selectedPaymentMethod.details.beneficiaryName}
              </span>
            </p>
          )}
          {selectedPaymentMethod.details?.beneficiaryDocument && (
            <p className="mt-1 text-sm text-text-secondary">
              Identificacion:{' '}
              <span className="font-medium text-text-primary">
                {selectedPaymentMethod.details.beneficiaryDocument}
              </span>
            </p>
          )}
          {selectedPaymentMethod.details?.bankName && (
            <p className="mt-1 text-sm text-text-secondary">
              Banco:{' '}
              <span className="font-medium text-text-primary">
                {selectedPaymentMethod.details.bankName}
              </span>
            </p>
          )}
          {selectedPaymentMethod.details?.phoneNumber && (
            <p className="mt-1 text-sm text-text-secondary">
              Telefono:{' '}
              <span className="font-medium text-text-primary">
                {selectedPaymentMethod.details.phoneNumber}
              </span>
            </p>
          )}
          <p className="mt-3 text-xs text-text-muted">{selectedPaymentMethod.referenceHint}</p>
          <p className="mt-1 text-xs text-text-muted">{selectedPaymentMethod.customerMessage}</p>
          <p className="mt-1 text-xs text-text-muted">
            Tiempo limite para reportar el pago: {paymentWindowLabel}.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" type="button" disabled>
              Reportar pago
            </Button>
          </div>
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

