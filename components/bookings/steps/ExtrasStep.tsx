'use client'

import { cn } from '@/lib/utils'

const EXTRA_OPTIONS = [
  {
    key: 'technician' as const,
    label: 'Tecnico de sonido incluido',
    description: 'Acompanamiento tecnico durante la sesion.',
    priceLabel: '5 USD',
  },
  {
    key: 'backline' as const,
    label: 'Backline / equipamiento adicional incluido',
    description: 'Instrumentos, amplificadores u otro equipo del estudio.',
    priceLabel: '5 USD',
  },
]

type ExtraKey = (typeof EXTRA_OPTIONS)[number]['key']

interface ExtrasStepProps {
  notes: string
  technician: boolean
  backline: boolean
  onNotesChange: (value: string) => void
  onTechnicianChange: (value: boolean) => void
  onBacklineChange: (value: boolean) => void
}

export function ExtrasStep({
  notes,
  technician,
  backline,
  onNotesChange,
}: ExtrasStepProps) {
  const values: Record<ExtraKey, boolean> = { technician, backline }

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Esta version incluye tecnico de sonido y backline como cargos fijos dentro del estimado.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2">
          {EXTRA_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              aria-pressed={values[opt.key]}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-200 md:min-h-[6.5rem] md:px-3.5 md:py-3',
                'border-accent-gold bg-accent-gold/5',
              )}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent-gold bg-accent-gold text-brand-bg transition-colors"
                aria-hidden="true"
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span className="flex flex-col">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-text-primary md:text-[13px]">
                  <span>{opt.label}</span>
                  <span className="text-[11px] font-semibold text-accent-gold">{opt.priceLabel}</span>
                </span>
                <span className="mt-0.5 text-xs text-text-secondary md:text-[10px] md:leading-4">
                  {opt.description}
                </span>
                <span className="mt-1 text-[11px] text-text-muted">
                  Incluido automaticamente en esta solicitud.
                </span>
              </span>
            </div>
          ))}
        </div>

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
            placeholder="Numero de integrantes, estilo musical, equipamiento propio que traes, referencias, preguntas..."
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
