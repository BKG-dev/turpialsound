'use client'

// Turpial Sound — Paso 4 del wizard: requerimientos adicionales
// Extras son 100% opcionales: el paso siempre permite avanzar.
// Incluye 2 toggles de opciones frecuentes + textarea de notas libres.

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────
// OPCIONES DE TOGGLE
// ─────────────────────────────────────────────────────────────────

const EXTRA_OPTIONS = [
  {
    key: 'technician' as const,
    label: 'Necesito técnico de sonido',
    description: 'Asistencia de un ingeniero de grabación durante la sesión.',
  },
  {
    key: 'backline' as const,
    label: 'Necesito backline / equipamiento adicional',
    description: 'Instrumentos, amplificadores u otro equipo del estudio.',
  },
]

type ExtraKey = (typeof EXTRA_OPTIONS)[number]['key']

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────

interface ExtrasStepProps {
  notes: string
  technician: boolean
  backline: boolean
  onNotesChange: (value: string) => void
  onTechnicianChange: (value: boolean) => void
  onBacklineChange: (value: boolean) => void
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────

export function ExtrasStep({
  notes,
  technician,
  backline,
  onNotesChange,
  onTechnicianChange,
  onBacklineChange,
}: ExtrasStepProps) {
  const values: Record<ExtraKey, boolean> = { technician, backline }
  const handlers: Record<ExtraKey, (v: boolean) => void> = {
    technician: onTechnicianChange,
    backline: onBacklineChange,
  }

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Indica si necesitas algo adicional para tu sesión. Todos los campos son opcionales —
        puedes continuar sin completarlos.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-3">
        {/* Toggles de opciones frecuentes */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2">
          {EXTRA_OPTIONS.map((opt) => {
            const isChecked = values[opt.key]
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={isChecked}
                onClick={() => handlers[opt.key](!isChecked)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-200 md:min-h-[6.5rem] md:px-3.5 md:py-3',
                  isChecked
                    ? 'border-accent-gold bg-accent-gold/5'
                    : 'border-brand-border bg-brand-surface hover:border-accent-gold/40',
                )}
              >
                {/* Indicador visual del check */}
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    isChecked
                      ? 'border-accent-gold bg-accent-gold text-brand-bg'
                      : 'border-brand-border bg-brand-surface',
                  )}
                  aria-hidden="true"
                >
                  {isChecked && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>

                <span className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary md:text-[13px]">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 text-xs text-text-secondary md:text-[10px] md:leading-4">
                    {opt.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Notas adicionales libres */}
        <div>
          <label
            htmlFor="extras-notes"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Notas adicionales
            <span className="ml-1.5 text-xs font-normal text-text-muted">(opcional)</span>
          </label>
          <textarea
            id="extras-notes"
            rows={3}
            placeholder="Número de integrantes, estilo musical, equipamiento propio que traes, referencias, preguntas…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className={cn(
              'w-full resize-none rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              notes.trim() ? 'border-accent-gold/50' : 'border-brand-border',
            )}
          />
        </div>
      </div>
    </div>
  )
}
