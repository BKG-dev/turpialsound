'use client'

// Turpial Sound — Shell del wizard de solicitud de reserva
// Fase 1B — Shell multi-step con estado local.
// Persistencia mínima real conectada al submit final del wizard.

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ServiceSelectStep } from '@/components/bookings/steps/ServiceSelectStep'
import { VariantSelectStep } from '@/components/bookings/steps/VariantSelectStep'
import { DateTimeStep } from '@/components/bookings/steps/DateTimeStep'
import { ExtrasStep } from '@/components/bookings/steps/ExtrasStep'
import { ContactStep, isValidEmail } from '@/components/bookings/steps/ContactStep'
import { SummaryStep } from '@/components/bookings/steps/SummaryStep'
import { submitBookingRequest } from '@/lib/bookings/actions'
import { buildBookingEstimate } from '@/lib/bookings/estimate'
import type { SelectedBookingItem } from '@/lib/bookings/types'

// ─────────────────────────────────────────────────────────────────
// Definición de pasos
// ─────────────────────────────────────────────────────────────────

interface WizardStepDef {
  id: string
  label: string
  title: string
}

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'service', label: 'Servicio', title: '¿Qué tipo de servicio necesitas?' },
  { id: 'variant', label: 'Modalidad', title: 'Elige la modalidad' },
  { id: 'date', label: 'Fecha', title: 'Fecha y bloque horario' },
  { id: 'extras', label: 'Extras', title: 'Requerimientos adicionales' },
  { id: 'contact', label: 'Tus datos', title: 'Datos del solicitante' },
  { id: 'summary', label: 'Resumen', title: 'Revisa tu solicitud' },
]

// ─────────────────────────────────────────────────────────────────
// Estado del wizard
// ─────────────────────────────────────────────────────────────────

interface WizardData {
  selectedItems: SelectedBookingItem[]
  eventDate: string | null // "YYYY-MM-DD"
  startTime: string | null // "HH:MM"
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
  extrasTechnician: false,
  extrasBackline: false,
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
}

// ─────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────

export function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [publicCode, setPublicCode] = useState<string | null>(null)
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
              ? data.requesterName.trim() !== '' && isValidEmail(data.requesterEmail)
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
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  function resetWizard() {
    setCurrentStep(0)
    setData(INITIAL_DATA)
    setSubmissionState('idle')
    setPublicCode(null)
    setSubmitError(null)
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
      requesterPhone: data.requesterPhone,
    })

    if (result.success && result.publicCode) {
      setPublicCode(result.publicCode)
      setSubmissionState('success')
    } else {
      setSubmitError(result.error ?? 'Error al enviar. Intenta de nuevo.')
      setSubmissionState('error')
    }
  }

  if (submissionState === 'success' && publicCode) {
    return (
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 text-center">
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
        <h2 className="mb-2 font-display text-xl font-bold text-text-primary">Solicitud enviada</h2>
        <p className="mb-6 text-sm text-text-secondary">
          Tu solicitud fue recibida y quedó pendiente de revisión interna. El equipo de Turpial
          Sound confirmará disponibilidad y se pondrá en contacto contigo.
        </p>
        <div className="mb-6 inline-block rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-6 py-3">
          <p className="mb-1 text-xs text-text-muted">Código de referencia</p>
          <p className="font-display text-2xl font-bold tracking-wider text-accent-gold">
            {publicCode}
          </p>
        </div>
        <p className="mx-auto max-w-md text-xs text-text-muted">
          Guarda este código para hacer seguimiento de tu solicitud. Esta confirmación no significa
          reserva instantánea: primero revisaremos disponibilidad y condiciones.
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
      {/* Indicador de pasos */}
      <div className="border-b border-brand-border px-6 py-4">
        <ol className="flex items-center gap-1 overflow-x-auto" aria-label="Pasos del formulario">
          {WIZARD_STEPS.map((s, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            return (
              <li key={s.id} className="flex items-center gap-1">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isCompleted
                      ? 'bg-accent-gold text-brand-bg'
                      : isCurrent
                        ? 'border-2 border-accent-gold text-accent-gold'
                        : 'border border-brand-border text-text-muted',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
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
                <span
                  className={cn(
                    'hidden text-xs sm:inline',
                    isCurrent ? 'font-medium text-text-primary' : 'text-text-muted',
                  )}
                >
                  {s.label}
                </span>
                {index < totalSteps - 1 && (
                  <span className="mx-1 text-brand-border" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Contenido del paso */}
      <div className="p-6 md:p-8">
        <h2 className="mb-6 font-display text-xl font-bold text-text-primary">{step.title}</h2>

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
                  confirmación.
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
                // Si cambia el servicio, la variante actual deja de ser válida.
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
            onStartTimeChange={(value) => setData((d) => ({ ...d, startTime: value }))}
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
              requesterPhone={data.requesterPhone}
              estimate={bookingEstimate}
            />
          )}
      </div>

      {/* Error de envío */}
      {submitError && (
        <div className="border-t border-brand-border bg-red-500/5 px-6 py-3">
          <p className="text-sm font-medium text-red-300">No pudimos registrar tu solicitud.</p>
          <p className="mt-1 text-xs text-red-200/90">
            {submitError} Revisa los datos e intenta de nuevo.
          </p>
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center justify-between border-t border-brand-border px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0 || submissionState === 'loading'}
        >
          ← Anterior
        </Button>

        <span className="text-xs text-text-muted">
          Paso {currentStep + 1} de {totalSteps}
        </span>

        {currentStep < totalSteps - 1 ? (
          <Button variant="primary" size="sm" onClick={handleNext} disabled={!canProceed}>
            Continuar →
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submissionState === 'loading' || bookingEstimate.isBlocked}
          >
            {submissionState === 'loading'
              ? 'Enviando solicitud…'
              : bookingEstimate.isBlocked
                ? 'Corrige la solicitud'
                : 'Enviar solicitud'}
          </Button>
        )}
      </div>
    </div>
  )
}
