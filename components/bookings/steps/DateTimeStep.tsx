'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const START_TIMES: string[] = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

const SLOT_STATE_LABELS: Record<SlotState, string> = {
  available: 'Libre',
  pending_payment: 'Solicitado',
  payment_reported: 'Pago reportado',
  confirmed: 'Confirmado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  past: 'Pasado',
}

type SlotState =
  | 'available'
  | 'pending_payment'
  | 'payment_reported'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'past'

interface SlotAvailability {
  time: string
  state: SlotState
  isSelectable: boolean
  isStrongBlocked: boolean
  observedOperationalStatuses: string[]
}

interface SlotResponsePayload {
  ok: boolean
  slots?: SlotAvailability[]
  error?: string
}

export function deriveEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
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

function getTodayISOInCaracas(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

function formatDateForBlock(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function addOneHour(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const totalMinutes = hour * 60 + minute + 60
  const nextHour = Math.floor(totalMinutes / 60) % 24
  const nextMinute = totalMinutes % 60
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

function getStatusBadgeClass(state: SlotState): string {
  if (state === 'available') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
  if (state === 'pending_payment') return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
  if (state === 'payment_reported') return 'border-orange-400/40 bg-orange-500/10 text-orange-200'
  if (state === 'confirmed') return 'border-red-400/45 bg-red-500/10 text-red-200'
  if (state === 'past') return 'border-white/10 bg-white/5 text-text-muted'
  return 'border-white/10 bg-white/5 text-text-muted'
}

function getSlotButtonClass(slot: SlotAvailability, isSelected: boolean): string {
  if (!slot.isSelectable) {
    return cn(
      'border-white/10 bg-brand-bg/50 text-text-muted',
      slot.state === 'payment_reported' && 'border-orange-500/35 bg-orange-500/10 text-orange-200/80',
      slot.state === 'confirmed' && 'border-red-500/35 bg-red-500/10 text-red-200/80',
      slot.state === 'past' && 'opacity-75',
    )
  }

  if (isSelected) {
    return 'border-accent-gold bg-accent-gold/15 text-accent-gold'
  }

  if (slot.state === 'pending_payment') {
    return 'border-amber-400/40 bg-amber-500/10 text-amber-100 hover:border-amber-300/70'
  }

  return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/70'
}

function getAvailableEndTimes(
  startTime: string | null,
  slots: SlotAvailability[],
): string[] {
  if (!startTime) return []

  const startIndex = START_TIMES.indexOf(startTime)
  if (startIndex === -1) return []

  const slotByTime = new Map(slots.map((slot) => [slot.time, slot]))
  const options: string[] = []

  for (let index = startIndex + 1; index <= START_TIMES.length; index += 1) {
    if (index === START_TIMES.length) {
      options.push(addOneHour(START_TIMES[START_TIMES.length - 1]))
      break
    }

    const boundary = START_TIMES[index]
    options.push(boundary)

    const slotAtBoundary = slotByTime.get(boundary)
    if (slotAtBoundary?.isStrongBlocked) {
      break
    }
  }

  return options
}

interface DateTimeStepProps {
  serviceSlug: string | null
  variantSlug: string | null
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  onDateChange: (value: string | null) => void
  onStartTimeChange: (value: string | null) => void
  onDurationChange: (value: number | null) => void
}

export function DateTimeStep({
  serviceSlug,
  variantSlug,
  eventDate,
  startTime,
  durationMinutes,
  onDateChange,
  onStartTimeChange,
  onDurationChange,
}: DateTimeStepProps) {
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const endTime =
    startTime && durationMinutes !== null
      ? deriveEndTime(startTime, durationMinutes)
      : null
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!eventDate || !variantSlug) {
      setSlots([])
      setSlotsError(null)
      setIsLoadingSlots(false)
      return
    }

    const abortController = new AbortController()
    setIsLoadingSlots(true)
    setSlotsError(null)

    const query = new URLSearchParams({
      date: eventDate,
      variantSlug,
    })
    if (serviceSlug) {
      query.set('serviceSlug', serviceSlug)
    }

    void fetch(`/api/bookings/slots?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: abortController.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as SlotResponsePayload
        if (!response.ok || !payload.ok || !Array.isArray(payload.slots)) {
          throw new Error(payload.error || 'slots_unavailable')
        }
        setSlots(payload.slots)
      })
      .catch((error) => {
        if (abortController.signal.aborted) return
        console.error('[bookings.slots]', error)
        setSlots([])
        setSlotsError('No pudimos cargar la disponibilidad en este momento. Intenta de nuevo.')
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoadingSlots(false)
        }
      })

    return () => abortController.abort()
  }, [eventDate, serviceSlug, variantSlug])

  const slotByTime = useMemo(() => new Map(slots.map((slot) => [slot.time, slot])), [slots])
  const availableEndTimes = useMemo(
    () => getAvailableEndTimes(startTime, slots),
    [startTime, slots],
  )

  useEffect(() => {
    if (!startTime) return
    const selectedSlot = slotByTime.get(startTime)
    if (selectedSlot && !selectedSlot.isSelectable) {
      onStartTimeChange(null)
      onDurationChange(null)
    }
  }, [slotByTime, startTime, onDurationChange, onStartTimeChange])

  useEffect(() => {
    if (!startTime || durationMinutes === null) return
    const selectedEndTime = deriveEndTime(startTime, durationMinutes)
    if (!availableEndTimes.includes(selectedEndTime)) {
      onDurationChange(null)
    }
  }, [availableEndTimes, durationMinutes, onDurationChange, startTime])

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

  function handleStartSlotSelection(slot: SlotAvailability) {
    if (!slot.isSelectable) {
      return
    }

    onStartTimeChange(slot.time)
    onDurationChange(null)
  }

  return (
    <div className="space-y-4 md:space-y-3">
      <p className="text-sm text-text-secondary md:text-[11px]">
        Los horarios en revision o confirmados no estan disponibles. Las solicitudes pendientes de
        pago pueden liberarse si no reportan pago a tiempo.
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
              min={getTodayISOInCaracas()}
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
            Horario operativo en America/Caracas.
          </p>
        </div>

        <div className="md:col-span-2">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
                getStatusBadgeClass('available'),
              )}
            >
              Libre
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
                getStatusBadgeClass('pending_payment'),
              )}
            >
              Solicitado (tentativo)
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
                getStatusBadgeClass('payment_reported'),
              )}
            >
              Pago reportado
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
                getStatusBadgeClass('confirmed'),
              )}
            >
              Confirmado
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]',
                getStatusBadgeClass('past'),
              )}
            >
              Pasado
            </span>
          </div>
          {isLoadingSlots ? (
            <div className="rounded-lg border border-brand-border bg-brand-bg/35 px-3 py-2 text-[12px] text-text-muted">
              Cargando disponibilidad real...
            </div>
          ) : slotsError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
              {slotsError}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {START_TIMES.map((time) => {
                const slot = slotByTime.get(time) ?? {
                  time,
                  state: 'available' as SlotState,
                  isSelectable: false,
                  isStrongBlocked: false,
                  observedOperationalStatuses: [],
                }
                const isSelected = startTime === slot.time

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.isSelectable}
                    onClick={() => handleStartSlotSelection(slot)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-center text-[12px] font-medium transition-colors',
                      getSlotButtonClass(slot, isSelected),
                    )}
                  >
                    <span className="block leading-none">{slot.time}</span>
                    <span className="mt-1 block text-[10px] opacity-90">
                      {SLOT_STATE_LABELS[slot.state]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
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
          disabled={!startTime || isLoadingSlots}
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
          El bloque de cierre se limita automaticamente hasta el siguiente horario bloqueado.
        </p>
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
