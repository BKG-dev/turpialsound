'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getRecordingAddonFamilyDescription,
  getRecordingAddonFamilyLabel,
  getRecordingAddonUnitLabel,
  getSelectedRecordingAddonVisualLines,
  groupRecordingAddons,
  type RecordingAddonDefinition,
} from '@/lib/bookings/recording-addons'

const LEGACY_EXTRA_OPTIONS = [
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

type LegacyExtraKey = (typeof LEGACY_EXTRA_OPTIONS)[number]['key']

interface ExtrasStepProps {
  serviceSlug: string | null
  variantSlug: string | null
  notes: string
  technician: boolean
  backline: boolean
  availableRecordingAddons: RecordingAddonDefinition[]
  selectedRecordingAddonSlugs: string[]
  projectTopicCount: number
  onRecordingAddonToggle: (slug: string) => void
  onProjectTopicCountChange: (value: number) => void
  onNotesChange: (value: string) => void
  onTechnicianChange: (value: boolean) => void
  onBacklineChange: (value: boolean) => void
}

function clampTopicCount(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(10, Math.max(1, Math.trunc(value)))
}

function TopicScopeBlock({
  topicCount,
  onChange,
}: {
  topicCount: number
  onChange: (value: number) => void
}) {
  const canDecrease = topicCount > 1
  const canIncrease = topicCount < 10

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-[10px]">
            Alcance del proyecto
          </p>
          <p className="mt-0.5 text-xs leading-snug text-text-secondary md:text-[10px]">
            Indica cuantos temas quieres trabajar. Esto ajusta el estimado visual de los
            adicionales por tema.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-bg/30 p-1">
          <button
            type="button"
            onClick={() => onChange(clampTopicCount(topicCount - 1))}
            disabled={!canDecrease}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold transition-colors',
              canDecrease
                ? 'text-text-primary hover:bg-brand-surface hover:text-accent-gold'
                : 'cursor-not-allowed text-text-muted/40',
            )}
            aria-label="Disminuir cantidad de temas"
          >
            -
          </button>
          <span className="min-w-[4.5rem] px-2 text-center text-sm font-semibold text-text-primary">
            {topicCount} {topicCount === 1 ? 'tema' : 'temas'}
          </span>
          <button
            type="button"
            onClick={() => onChange(clampTopicCount(topicCount + 1))}
            disabled={!canIncrease}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold transition-colors',
              canIncrease
                ? 'text-text-primary hover:bg-brand-surface hover:text-accent-gold'
                : 'cursor-not-allowed text-text-muted/40',
            )}
            aria-label="Aumentar cantidad de temas"
          >
            +
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-text-muted md:text-[10px]">
        Valor experimental: minimo 1, maximo 10.
      </p>
    </section>
  )
}

function RecordingAddonAccordionCard({
  addon,
  selected,
  isExpanded,
  onToggleExpanded,
  onToggleSelection,
}: {
  addon: RecordingAddonDefinition
  selected: boolean
  isExpanded: boolean
  onToggleExpanded: (slug: string) => void
  onToggleSelection: (slug: string) => void
}) {
  const bodyId = `recording-addon-body-${addon.slug}`

  return (
    <section
      className={cn(
        'rounded-xl border bg-brand-surface transition-colors duration-200',
        selected ? 'border-accent-gold' : 'border-brand-border',
        isExpanded ? 'shadow-[0_0_0_1px_rgba(255,191,0,0.08)]' : '',
      )}
    >
      <button
        type="button"
        onClick={() => onToggleExpanded(addon.slug)}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        className={cn(
          'flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors',
          selected ? 'bg-accent-gold/5' : 'bg-transparent hover:bg-brand-bg/30',
        )}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight text-text-primary md:text-[13px]">
            {addon.publicName}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted md:text-[9px]">
            <span>{getRecordingAddonUnitLabel(addon.unit)}</span>
            {selected && (
              <span className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-2 py-0.5 text-accent-gold">
                Seleccionado
              </span>
            )}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-semibold text-accent-gold">
            {addon.priceUsd} USD
          </span>
          <svg
            className={cn('h-4 w-4 text-text-muted transition-transform', isExpanded && 'rotate-180')}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div
        id={bodyId}
        className={cn('grid gap-3 px-3 pb-3', isExpanded ? 'block' : 'hidden')}
      >
        <p className="text-xs leading-snug text-text-secondary md:text-[11px]">{addon.description}</p>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted md:text-[9px]">
          <span className="rounded-full border border-brand-border/70 bg-brand-bg/30 px-2 py-0.5">
            {getRecordingAddonUnitLabel(addon.unit)}
          </span>
          {addon.requiresReview ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-amber-200">
              Requiere revision
            </span>
          ) : (
            <span className="rounded-full border border-brand-border/70 bg-brand-bg/30 px-2 py-0.5">
              Seleccion opcional
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleSelection(addon.slug)}
          className={cn(
            'inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            selected
              ? 'border border-accent-gold/30 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/15'
              : 'border border-brand-border bg-brand-bg/30 text-text-primary hover:border-accent-gold/40 hover:text-accent-gold',
          )}
        >
          {selected ? 'Deseleccionar' : 'Seleccionar adicional'}
        </button>
      </div>
    </section>
  )
}

function RecordingAddonFamilyBlock({
  title,
  description,
  addons,
  selectedRecordingAddonSlugs,
  activeAddonSlug,
  onToggleExpanded,
  onToggleSelection,
}: {
  title: string
  description: string
  addons: RecordingAddonDefinition[]
  selectedRecordingAddonSlugs: string[]
  activeAddonSlug: string | null
  onToggleExpanded: (slug: string) => void
  onToggleSelection: (slug: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedCount = addons.filter((addon) => selectedRecordingAddonSlugs.includes(addon.slug)).length

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 text-left md:cursor-default"
      >
        <span className="min-w-0">
          <span className="block font-medium text-text-primary md:text-[13px]">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-text-secondary md:text-[10px]">
            {description}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 && (
            <span className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-semibold text-accent-gold">
              {selectedCount}
            </span>
          )}
          <svg
            className={cn('h-4 w-4 text-text-muted transition-transform md:hidden', isOpen && 'rotate-180')}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div className={cn('mt-3 space-y-2', isOpen ? 'block' : 'hidden', 'md:block')}>
        {addons.map((addon) => (
          <RecordingAddonAccordionCard
            key={addon.slug}
            addon={addon}
            selected={selectedRecordingAddonSlugs.includes(addon.slug)}
            isExpanded={activeAddonSlug === addon.slug}
            onToggleExpanded={onToggleExpanded}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </div>
    </section>
  )
}

function LegacyExtrasPanel({
  notes,
  technician,
  backline,
  onNotesChange,
}: {
  notes: string
  technician: boolean
  backline: boolean
  onNotesChange: (value: string) => void
}) {
  const values: Record<LegacyExtraKey, boolean> = { technician, backline }

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Esta version incluye tecnico de sonido y backline como cargos fijos dentro del estimado.
      </p>

      <div className="space-y-4 md:space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2">
          {LEGACY_EXTRA_OPTIONS.map((opt) => (
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

function ExperimentalSelectionSummary({
  selectedRecordingAddonSlugs,
  availableRecordingAddons,
  projectTopicCount,
  serviceSlug,
  variantSlug,
}: {
  selectedRecordingAddonSlugs: string[]
  availableRecordingAddons: RecordingAddonDefinition[]
  projectTopicCount: number
  serviceSlug: string | null
  variantSlug: string | null
}) {
  const selectedLines = useMemo(
    () =>
      getSelectedRecordingAddonVisualLines(
        selectedRecordingAddonSlugs,
        serviceSlug,
        variantSlug,
        projectTopicCount,
      ),
    [projectTopicCount, selectedRecordingAddonSlugs, serviceSlug, variantSlug],
  )
  const subtotalUsd = selectedLines.reduce((total, line) => total + line.lineTotalUsd, 0)

  if (selectedLines.length === 0) {
    return (
      <section className="rounded-xl border border-brand-border bg-brand-surface p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-[10px]">
          Seleccion actual
        </p>
        <p className="mt-2 text-sm text-text-secondary md:text-[11px]">
          Aun no seleccionas adicionales. El paso sigue siendo opcional.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-[10px]">
        Seleccion actual
      </p>

      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-brand-border bg-brand-bg/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Alcance del proyecto</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {projectTopicCount} {projectTopicCount === 1 ? 'tema' : 'temas'}
          </p>
        </div>

        <div className="space-y-2">
          {selectedLines.map((line) => (
            <div
              key={line.addon.slug}
              className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary md:text-[12px]">
                    {line.addon.publicName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted md:text-[10px]">
                    {line.formulaLabel}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-accent-gold">{line.lineTotalUsd} USD</p>
              </div>

              {line.noteLabel && (
                <p className="mt-1 text-[11px] text-amber-200 md:text-[10px]">{line.noteLabel}</p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">
            Subtotal visual experimental
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">{subtotalUsd} USD</p>
          <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
            Este subtotal es experimental y no altera todavia el cobro real ni la persistencia.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableRecordingAddons
            .filter((addon) => selectedRecordingAddonSlugs.includes(addon.slug))
            .map((addon) => (
              <span
                key={addon.slug}
                className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-2 py-0.5 text-[10px] text-accent-gold"
              >
                Seleccionado: {addon.publicName}
              </span>
            ))}
        </div>
      </div>
    </section>
  )
}

export function ExtrasStep({
  serviceSlug,
  variantSlug,
  notes,
  technician,
  backline,
  availableRecordingAddons,
  selectedRecordingAddonSlugs,
  projectTopicCount,
  onRecordingAddonToggle,
  onProjectTopicCountChange,
  onNotesChange,
}: ExtrasStepProps) {
  const isRecordingService = serviceSlug === 'grabacion' && availableRecordingAddons.length > 0
  const familyGroups = useMemo(
    () => groupRecordingAddons(availableRecordingAddons),
    [availableRecordingAddons],
  )
  const [showFamilies, setShowFamilies] = useState(false)
  const [activeAddonSlug, setActiveAddonSlug] = useState<string | null>(null)
  function handleToggleExpanded(slug: string) {
    setActiveAddonSlug((current) => (current === slug ? null : slug))
  }

  function handleToggleSelection(slug: string) {
    onRecordingAddonToggle(slug)
  }

  if (!isRecordingService) {
    return (
      <LegacyExtrasPanel
        notes={notes}
        technician={technician}
        backline={backline}
        onNotesChange={onNotesChange}
      />
    )
  }

  return (
    <div className="space-y-3 md:space-y-2">
      <div className="rounded-xl border border-accent-gold/20 bg-accent-gold/5 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-gold/25 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
            Vista experimental
          </span>
          <p className="text-sm text-text-secondary md:text-[11px]">
            Selecciona adicionales de grabacion de forma opcional. Esta vista no cambia el flujo
            real de reserva.
          </p>
        </div>
      </div>

      <TopicScopeBlock topicCount={projectTopicCount} onChange={onProjectTopicCountChange} />

      <ExperimentalSelectionSummary
        selectedRecordingAddonSlugs={selectedRecordingAddonSlugs}
        availableRecordingAddons={availableRecordingAddons}
        projectTopicCount={projectTopicCount}
        serviceSlug={serviceSlug}
        variantSlug={variantSlug}
      />

      <div className="rounded-xl border border-brand-border bg-brand-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-[10px]">
              Familias
            </p>
            <p className="mt-0.5 text-xs text-text-secondary md:text-[10px]">
              Usa {variantSlug ? 'el grupo correcto' : 'la familia correcta'} y abre mas opciones
              solo si realmente las necesitas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFamilies((current) => !current)}
            className="inline-flex items-center rounded-full border border-brand-border bg-brand-bg/30 px-3 py-1 text-[11px] font-medium text-text-primary transition-colors hover:border-accent-gold/40 hover:text-accent-gold md:hidden"
          >
            {showFamilies ? 'Ocultar instrumentos' : 'Ver mas instrumentos'}
          </button>
        </div>

        <div className={cn('mt-3 space-y-3', showFamilies ? 'block' : 'hidden', 'md:block')}>
          {familyGroups.map((group) => (
            <RecordingAddonFamilyBlock
              key={group.category}
              title={getRecordingAddonFamilyLabel(group.category)}
              description={getRecordingAddonFamilyDescription(group.category)}
              addons={group.addons}
              selectedRecordingAddonSlugs={selectedRecordingAddonSlugs}
              activeAddonSlug={activeAddonSlug}
              onToggleExpanded={handleToggleExpanded}
              onToggleSelection={handleToggleSelection}
            />
          ))}
        </div>
      </div>

      <LegacyExtrasPanel
        notes={notes}
        technician={technician}
        backline={backline}
        onNotesChange={onNotesChange}
      />

      <div className="rounded-xl border border-brand-border bg-brand-bg/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Incluidos base</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGACY_EXTRA_OPTIONS.map((opt) => (
            <span
              key={opt.key}
              className="rounded-full border border-brand-border bg-brand-surface px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {opt.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

