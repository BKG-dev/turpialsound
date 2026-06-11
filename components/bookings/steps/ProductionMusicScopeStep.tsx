'use client'

import { cn } from '@/lib/utils'
import { PRODUCTION_MUSIC_BASE } from '@/lib/bookings/production-music'

interface ToggleCardProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

function ToggleCard({ label, value, onChange }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'rounded-xl border px-3 py-2 text-left transition-colors',
        value
          ? 'border-accent-gold bg-accent-gold/10 text-text-primary'
          : 'border-brand-border bg-brand-surface text-text-secondary hover:border-accent-gold/35',
      )}
      aria-pressed={value}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="mt-1 block text-[11px] text-text-muted">
        {value ? 'Incluido en la revision comercial' : 'Sin seleccionar'}
      </span>
    </button>
  )
}

function ThemeCounter({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const canDecrease = value > 1
  const canIncrease = value < 12
  const estimatedHours = value * PRODUCTION_MUSIC_BASE.includedHoursPerTheme

  return (
    <section className="rounded-2xl border border-accent-gold/25 bg-accent-gold/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
            Produccion por tema
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-text-primary">
            Selecciona el alcance base
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-snug text-text-secondary">
            Cada tema incluye direccion de produccion, enfoque sonoro, estructura,
            asesoria creativa, grabacion principal y edicion basica.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-surface p-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, value - 1))}
            disabled={!canDecrease}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold transition-colors',
              canDecrease
                ? 'text-text-primary hover:bg-brand-bg/40 hover:text-accent-gold'
                : 'cursor-not-allowed text-text-muted/40',
            )}
            aria-label="Disminuir cantidad de temas"
          >
            -
          </button>
          <div className="min-w-[7rem] px-3 text-center">
            <p className="text-xl font-semibold text-text-primary">{value}</p>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">
              {value === 1 ? 'tema' : 'temas'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(Math.min(12, value + 1))}
            disabled={!canIncrease}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold transition-colors',
              canIncrease
                ? 'text-text-primary hover:bg-brand-bg/40 hover:text-accent-gold'
                : 'cursor-not-allowed text-text-muted/40',
            )}
            aria-label="Aumentar cantidad de temas"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Temas</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{value}</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Horas operativas</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{estimatedHours}</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">Base estimada</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {(value * PRODUCTION_MUSIC_BASE.basePriceUsd).toLocaleString('en-US')} USD
          </p>
        </div>
      </div>
    </section>
  )
}

interface ProductionMusicScopeStepProps {
  themeCount: number
  genre: string
  references: string
  tentativeDate: string
  hasLyrics: boolean
  hasDemo: boolean
  needsMusicians: boolean
  needsArrangement: boolean
  needsMix: boolean
  needsMaster: boolean
  onThemeCountChange: (value: number) => void
  onGenreChange: (value: string) => void
  onReferencesChange: (value: string) => void
  onTentativeDateChange: (value: string) => void
  onHasLyricsChange: (value: boolean) => void
  onHasDemoChange: (value: boolean) => void
  onNeedsMusiciansChange: (value: boolean) => void
  onNeedsArrangementChange: (value: boolean) => void
  onNeedsMixChange: (value: boolean) => void
  onNeedsMasterChange: (value: boolean) => void
}

export function ProductionMusicScopeStep({
  themeCount,
  genre,
  references,
  tentativeDate,
  hasLyrics,
  hasDemo,
  needsMusicians,
  needsArrangement,
  needsMix,
  needsMaster,
  onThemeCountChange,
  onGenreChange,
  onReferencesChange,
  onTentativeDateChange,
  onHasLyricsChange,
  onHasDemoChange,
  onNeedsMusiciansChange,
  onNeedsArrangementChange,
  onNeedsMixChange,
  onNeedsMasterChange,
}: ProductionMusicScopeStepProps) {
  return (
    <div className="space-y-4">
      <ThemeCounter value={themeCount} onChange={onThemeCountChange} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-4">
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              Contexto creativo
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Comparte el genero, referencias y cualquier urgencia o fecha tentativa.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Genero musical
              </span>
              <input
                type="text"
                value={genre}
                onChange={(event) => onGenreChange(event.target.value)}
                placeholder="Ej: pop latino, salsa, worship, indie"
                className="w-full rounded-xl border border-brand-border bg-brand-bg/20 px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-gold/50"
              />
            </label>

            <label className="space-y-1.5 md:col-span-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Fecha tentativa o urgencia
              </span>
              <input
                type="text"
                value={tentativeDate}
                onChange={(event) => onTentativeDateChange(event.target.value)}
                placeholder="Ej: julio 2026, urgente esta semana"
                className="w-full rounded-xl border border-brand-border bg-brand-bg/20 px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-gold/50"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Referencias musicales
              </span>
              <textarea
                rows={4}
                value={references}
                onChange={(event) => onReferencesChange(event.target.value)}
                placeholder="Comparte artistas, canciones, atmosfera, referencias de sonido o links."
                className="w-full rounded-xl border border-brand-border bg-brand-bg/20 px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-gold/50"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-4">
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              Alcance de produccion
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Marca solo lo que quieres que revisemos dentro del alcance final.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleCard label="Ya tiene letra" value={hasLyrics} onChange={onHasLyricsChange} />
            <ToggleCard label="Ya tiene maqueta" value={hasDemo} onChange={onHasDemoChange} />
            <ToggleCard
              label="Necesita musicos"
              value={needsMusicians}
              onChange={onNeedsMusiciansChange}
            />
            <ToggleCard
              label="Necesita arreglos"
              value={needsArrangement}
              onChange={onNeedsArrangementChange}
            />
            <ToggleCard label="Necesita mezcla" value={needsMix} onChange={onNeedsMixChange} />
            <ToggleCard
              label="Necesita master"
              value={needsMaster}
              onChange={onNeedsMasterChange}
            />
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-bg/20 px-3 py-3 text-sm leading-snug text-text-secondary">
            Este servicio no se agenda automaticamente por calendario. Nuestro equipo revisara
            el alcance y coordinara contigo por WhatsApp antes de confirmar la produccion.
          </div>
        </section>
      </div>
    </div>
  )
}
