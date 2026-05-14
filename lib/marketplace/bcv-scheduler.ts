/**
 * BCV Rate Refresh Scheduler
 *
 * Política de actualización:
 * - Lun-Vie 4pm-7pm VET (20:00-23:00 UTC): cada 30 min (horario pico BCV)
 * - Resto de horas: cada 60 min
 *
 * Formato VET (Venezuela Standard Time): UTC-4 todo el año (sin DST)
 */

const VET_OFFSET_HOURS = -4

function getVetNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + VET_OFFSET_HOURS * 3600_000)
}

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay()
  return day >= 1 && day <= 5 // Mon=1, Fri=5
}

function isPeakHours(date: Date): boolean {
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const timeMinutes = hours * 60 + minutes
  // Peak: 4pm-7pm VET = 20:00-23:00 UTC
  const peakStart = 20 * 60
  const peakEnd = 23 * 60
  return timeMinutes >= peakStart && timeMinutes < peakEnd
}

export function getCurrentRefreshIntervalMs(): number {
  const vetNow = getVetNow()
  if (isWeekday(vetNow) && isPeakHours(vetNow)) {
    return 30 * 60 * 1000 // 30 min peak
  }
  return 60 * 60 * 1000 // 60 min off-peak
}

export function isPeakWindow(): boolean {
  const vetNow = getVetNow()
  return isWeekday(vetNow) && isPeakHours(vetNow)
}

export function getScheduleDescription(): string {
  if (isPeakWindow()) {
    return 'PEAK: Lun-Vie 4pm-7pm VET — cada 30 min'
  }
  return 'OFF-PEAK: cada 60 min'
}

let lastRefreshTimestamp: number | null = null

export function shouldRefresh(): boolean {
  const now = Date.now()
  const interval = getCurrentRefreshIntervalMs()

  if (lastRefreshTimestamp === null) {
    lastRefreshTimestamp = now
    return true
  }

  const elapsed = now - lastRefreshTimestamp
  if (elapsed >= interval) {
    lastRefreshTimestamp = now
    return true
  }

  return false
}

export function markRefreshed(): void {
  lastRefreshTimestamp = Date.now()
}

export function getLastRefreshTimestamp(): number | null {
  return lastRefreshTimestamp
}
