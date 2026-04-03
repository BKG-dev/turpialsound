'use client'

// Turpial Sound — Shell del wizard de solicitud de reserva
// Fase 1B — Shell multi-step con estado local.
// Sin persistencia real todavía (se añade en siguientes microtareas).

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ServiceSelectStep } from '@/components/bookings/steps/ServiceSelectStep'
import { VariantSelectStep } from '@/components/bookings/steps/VariantSelectStep'
import { DateTimeStep } from '@/components/bookings/steps/DateTimeStep'
import { ExtrasStep } from '@/components/bookings/steps/ExtrasStep'
import { ContactStep, isValidEmail } from '@/components/bookings/steps/ContactStep'

// ─────────────────────────────────────────────────────────────────
// Definición de pasos
// ─────────────────────────────────────────────────────────────────

interface WizardStepDef {
  id: string
  label: string
  title: string
}

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'service',  label: 'Servicio',  title: '¿Qué tipo de servicio necesitas?' },
  { id: 'variant',  label: 'Modalidad', title: 'Elige la modalidad' },
  { id: 'date',     label: 'Fecha',     title: 'Fecha y bloque horario' },
  { id: 'extras',   label: 'Extras',    title: 'Requerimientos adicionales' },
  { id: 'contact',  label: 'Tus datos', title: 'Datos del solicitante' },
  { id: 'summary',  label: 'Resumen',   title: 'Revisa tu solicitud' },
]

// ─────────────────────────────────────────────────────────────────
// Estado del wizard
// ─────────────────────────────────────────────────────────────────

interface WizardData {
  serviceSlug: string | null
  variantSlug: string | null
  eventDate: string | null       // "YYYY-MM-DD"
  startTime: string | null       // "HH:MM"
  durationMinutes: number | null
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  requesterName: string
  requesterEmail: string
  requesterPhone: string
}

const INITIAL_DATA: WizardData = {
  serviceSlug: null,
  variantSlug: null,
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

  const totalSteps = WIZARD_STEPS.length
  const step = WIZARD_STEPS[currentStep]

  const canProceed =
    currentStep === 0 ? data.serviceSlug !== null :
    currentStep === 1 ? data.variantSlug !== null :
    currentStep === 2 ? data.eventDate !== null && data.startTime !== null && data.durationMinutes !== null :
    currentStep === 3 ? true :
    currentStep === 4 ? data.requesterName.trim() !== '' && isValidEmail(data.requesterEmail) :
    false

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

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface">
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
        <h2 className="mb-6 font-display text-xl font-bold text-text-primary">
          {step.title}
        </h2>

        {currentStep === 0 && (
          <ServiceSelectStep
            selected={data.serviceSlug}
            onChange={(slug) =>
              setData((d) => ({
                ...d,
                serviceSlug: slug,
                // Resetear variante si el servicio cambió
                variantSlug: d.serviceSlug === slug ? d.variantSlug : null,
              }))
            }
          />
        )}

        {currentStep === 1 && data.serviceSlug && (
          <VariantSelectStep
            serviceSlug={data.serviceSlug}
            selected={data.variantSlug}
            onChange={(slug) => setData((d) => ({ ...d, variantSlug: slug }))}
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

        {currentStep > 4 && (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-brand-border p-8 text-center">
            <p className="text-sm font-medium text-text-secondary">
              Resumen de la solicitud — próximamente.
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Aquí podrás revisar todos los datos antes de enviar.
            </p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between border-t border-brand-border px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          ← Anterior
        </Button>

        <span className="text-xs text-text-muted">
          Paso {currentStep + 1} de {totalSteps}
        </span>

        {currentStep < totalSteps - 1 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={!canProceed}
          >
            Continuar →
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled
          >
            Enviar solicitud
          </Button>
        )}
      </div>
    </div>
  )
}
