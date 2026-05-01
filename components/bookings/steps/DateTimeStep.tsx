'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

const START_TIMES: string[] = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
]

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
]

export function deriveEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function getAvailableEndTimes(startTime: string | null): string[] {
  if (!startTime) return []

  const [startHour] = startTime.split(':').map(Number)
  const options: string[] = []

  for (let hour = startHour + 1; hour <= 20; hour += 1) {
    options.push(`${String(hour).padStart(2, '0')}:00`)
  }

  return options
}

function getDurationFromRange(startTime: string, endTime: string): number | null {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)

  return durationMinutes > 0 ? durationMinutes : null
}

function getDurationLabel(durationMinutes: number): string {
  const hours = durationMinutes / 60
  return hours === 1 ? '1 hora' : `${hours} horas`
}

function getTodayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateForBlock(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

interface DateTimeStepProps {
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  onDateChange: (value: string | null) => void
  onStartTimeChange: (value: string | null) => void
  onDurationChange: (value: number | null) => void
}

export function DateTimeStep({
  eventDate,
  startTime,
  durationMinutes,
  onDateChange,
  onStartTimeChange,
  onDurationChange,
}: DateTimeStepProps) {
  const endTime =
    startTime && durationMinutes !== null
      ? deriveEndTime(startTime, durationMinutes)
      : null
  const dateInputRef = useRef<HTMLInputElement>(null)
  const availableEndTimes = getAvailableEndTimes(startTime)

  function openNativeDatePicker() {
    const input = dateInputRef.current
    if (!input) return

    input.focus()

    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.click()
  }

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Selecciona la fecha y el bloque horario que necesitas. La disponibilidad se confirma durante
        la revision interna; no es reserva inmediata.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-2">
        <div>
          <label
            htmlFor="event-date"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Fecha
          </label>
          <button
            type="button"
            onClick={openNativeDatePicker}
            className={cn(
              'relative block w-full rounded-lg border bg-brand-surface text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/40',
              eventDate ? 'border-accent-gold/50' : 'border-brand-border',
            )}
          >
            <input
              ref={dateInputRef}
              id="event-date"
              type="date"
              min={getTodayISO()}
              value={eventDate ?? ''}
              onChange={(e) => onDateChange(e.target.value || null)}
              className="w-full cursor-pointer rounded-lg border-0 bg-transparent px-3.5 py-2.5 pr-11 text-sm text-text-primary outline-none md:text-[13px]"
            />
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-accent-gold/80"
              aria-hidden="true"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 2.75v2.5M14 2.75v2.5M3.75 7.25h12.5M5.75 4.5h8.5A1.5 1.5 0 0 1 15.75 6v8.25a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          <p className="mt-1 text-[11px] text-text-muted">
            Abre el calendario nativo de tu navegador para elegir la fecha.
          </p>
        </div>

        <div>
          <label
            htmlFor="start-time"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Hora de inicio
          </label>
          <select
            id="start-time"
            value={startTime ?? ''}
            onChange={(e) => onStartTimeChange(e.target.value || null)}
            className={cn(
              'w-full rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              startTime ? 'border-accent-gold/50' : 'border-brand-border',
            )}
          >
            <option value="">- Elige una hora -</option>
            {START_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="end-time"
            className="mb-1.5 block text-sm font-medium text-text-primary md:text-[11px]"
          >
            Hora de finalizacion
          </label>
          <select
            id="end-time"
            value={endTime ?? ''}
            onChange={(e) =>
              onDurationChange(
                startTime && e.target.value ? getDurationFromRange(startTime, e.target.value) : null,
              )
            }
            disabled={!startTime}
            className={cn(
              'w-full rounded-lg border bg-brand-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors md:text-[13px]',
              'focus:border-accent-gold',
              endTime ? 'border-accent-gold/50' : 'border-brand-border',
            )}
          >
            <option value="">- Elige una hora de finalizacion -</option>
            {availableEndTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-text-muted">
            Primero elige la hora de inicio para ver opciones de cierre.
          </p>
        </div>
      </div>

      {eventDate && startTime && endTime && durationMinutes !== null && (
        <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-3.5 py-2.5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            Bloque solicitado
          </p>
          <p className="text-sm font-semibold text-text-primary md:text-[13px]">
            {formatDateForBlock(eventDate)} · {startTime} - {endTime}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {getDurationLabel(durationMinutes)}
          </p>
        </div>
      )}
    </div>
  )
}
