export const CARACAS_TIME_ZONE = 'America/Caracas' as const
export const CARACAS_UTC_OFFSET = '-04:00' as const

const CARACAS_UTC_OFFSET_MINUTES = -4 * 60

function isStrictDateMatch(value: string): boolean {
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(value)
}

function isStrictTimeMatch(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function parseCaracasLocalDateTime(
  eventDate: string,
  startTime: string,
): Date | null {
  if (typeof eventDate !== 'string' || typeof startTime !== 'string') {
    return null
  }

  if (!isStrictDateMatch(eventDate) || !isStrictTimeMatch(startTime)) {
    return null
  }

  const [yearRaw, monthRaw, dayRaw] = eventDate.split('-')
  const [hoursRaw, minutesRaw] = startTime.split(':')

  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const utcEpochMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    CARACAS_UTC_OFFSET_MINUTES * 60 * 1000
  const candidate = new Date(utcEpochMs)

  if (!Number.isFinite(candidate.getTime())) {
    return null
  }

  const roundTrip = new Date(utcEpochMs + CARACAS_UTC_OFFSET_MINUTES * 60 * 1000)
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day ||
    roundTrip.getUTCHours() !== hours ||
    roundTrip.getUTCMinutes() !== minutes
  ) {
    return null
  }

  return candidate
}

export function addMinutesToDate(start: Date, minutes: number): Date | null {
  if (!(start instanceof Date) || !Number.isFinite(start.getTime())) {
    return null
  }

  if (!Number.isFinite(minutes) || minutes < 0) {
    return null
  }

  const candidate = new Date(start.getTime() + minutes * 60 * 1000)
  return Number.isFinite(candidate.getTime()) ? candidate : null
}
