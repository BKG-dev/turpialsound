import type { OperationalBookingStatus } from '@/lib/bookings/operations'

interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  calendarId: string
  timezone: string
}

export interface BookingCalendarSyncInput {
  publicCode: string
  serviceName: string
  variantName: string
  resourceName: string | null
  requesterName: string
  requesterPhone: string | null
  eventDate: Date
  eventEndDate: Date | null
  paymentDeadline: Date | null
  operationalStatus: OperationalBookingStatus
  existingCalendarEventId: string | null
}

type SyncAction = 'create' | 'update' | 'delete' | 'noop'

export interface BookingCalendarSyncResult {
  ok: boolean
  action: SyncAction
  eventId: string | null
  reason?: string
}

function readGoogleCalendarConfig(): { config: GoogleCalendarConfig | null; missing: string[] } {
  const config: GoogleCalendarConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN?.trim() ?? '',
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() ?? '',
    timezone: process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() ?? '',
  }

  const missing: string[] = []
  if (!config.clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!config.clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!config.refreshToken) missing.push('GOOGLE_REFRESH_TOKEN')
  if (!config.calendarId) missing.push('GOOGLE_CALENDAR_ID')
  if (!config.timezone) missing.push('GOOGLE_CALENDAR_TIMEZONE')

  return {
    config: missing.length === 0 ? config : null,
    missing,
  }
}

async function getGoogleAccessToken(config: GoogleCalendarConfig): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`token_request_failed_${response.status}`)
  }

  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) {
    throw new Error('token_missing_access_token')
  }

  return payload.access_token
}

function buildEventPayload(input: BookingCalendarSyncInput, timezone: string) {
  const normalizedEndDate =
    input.eventEndDate ?? new Date(input.eventDate.getTime() + 60 * 60 * 1000)

  const summary = `${input.publicCode} | ${input.serviceName} - ${input.variantName}`
  const description = [
    `Codigo: ${input.publicCode}`,
    `Estado operativo: ${input.operationalStatus}`,
    `Sala asignada: ${input.resourceName ?? 'No asignada'}`,
    `Solicitante: ${input.requesterName}`,
    `WhatsApp: ${input.requesterPhone ?? 'No disponible'}`,
    `Servicio: ${input.serviceName}`,
    `Modalidad: ${input.variantName}`,
    `Limite de pago: ${input.paymentDeadline ? input.paymentDeadline.toISOString() : 'N/A'}`,
  ].join('\n')

  return {
    summary,
    description,
    colorId: getGoogleCalendarColorIdByStatus(input.operationalStatus),
    start: {
      dateTime: input.eventDate.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: normalizedEndDate.toISOString(),
      timeZone: timezone,
    },
  }
}

function getGoogleCalendarColorIdByStatus(status: OperationalBookingStatus): string {
  switch (status) {
    case 'pending_payment':
      return '5'
    case 'payment_reported':
      return '6'
    case 'payment_verified':
      return '10'
    case 'confirmed':
      return '2'
    case 'cancelled':
      return '11'
    case 'expired':
      return '8'
    case 'submitted':
    default:
      return '1'
  }
}

async function googleCalendarRequest(
  config: GoogleCalendarConfig,
  accessToken: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}${path}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  return response
}

function shouldMaintainCalendarEvent(status: OperationalBookingStatus): boolean {
  return (
    status === 'pending_payment' ||
    status === 'payment_reported' ||
    status === 'payment_verified' ||
    status === 'confirmed' ||
    status === 'cancelled' ||
    status === 'expired'
  )
}

export async function syncBookingToGoogleCalendar(
  input: BookingCalendarSyncInput,
): Promise<BookingCalendarSyncResult> {
  const { config, missing } = readGoogleCalendarConfig()
  if (!config) {
    return {
      ok: false,
      action: 'noop',
      eventId: input.existingCalendarEventId,
      reason: `missing_env:${missing.join(',')}`,
    }
  }

  try {
    const accessToken = await getGoogleAccessToken(config)
    const shouldHaveEvent = shouldMaintainCalendarEvent(input.operationalStatus)

    if (!shouldHaveEvent) {
      if (!input.existingCalendarEventId) {
        return { ok: true, action: 'noop', eventId: null }
      }

      const deleteResponse = await googleCalendarRequest(
        config,
        accessToken,
        'DELETE',
        `/events/${encodeURIComponent(input.existingCalendarEventId)}`,
      )

      if (deleteResponse.status === 404 || deleteResponse.ok) {
        return { ok: true, action: 'delete', eventId: null }
      }

      return {
        ok: false,
        action: 'delete',
        eventId: input.existingCalendarEventId,
        reason: `delete_failed_${deleteResponse.status}`,
      }
    }

    const eventPayload = buildEventPayload(input, config.timezone)

    if (!input.existingCalendarEventId && (input.operationalStatus === 'cancelled' || input.operationalStatus === 'expired')) {
      return { ok: true, action: 'noop', eventId: null }
    }

    if (input.existingCalendarEventId) {
      const patchResponse = await googleCalendarRequest(
        config,
        accessToken,
        'PATCH',
        `/events/${encodeURIComponent(input.existingCalendarEventId)}`,
        eventPayload,
      )

      if (patchResponse.ok) {
        return {
          ok: true,
          action: 'update',
          eventId: input.existingCalendarEventId,
        }
      }

      if (patchResponse.status !== 404) {
        return {
          ok: false,
          action: 'update',
          eventId: input.existingCalendarEventId,
          reason: `update_failed_${patchResponse.status}`,
        }
      }
    }

    const createResponse = await googleCalendarRequest(config, accessToken, 'POST', '/events', eventPayload)

    if (!createResponse.ok) {
      return {
        ok: false,
        action: 'create',
        eventId: input.existingCalendarEventId,
        reason: `create_failed_${createResponse.status}`,
      }
    }

    const created = (await createResponse.json()) as { id?: string }
    if (!created.id) {
      return {
        ok: false,
        action: 'create',
        eventId: input.existingCalendarEventId,
        reason: 'create_missing_event_id',
      }
    }

    return {
      ok: true,
      action: 'create',
      eventId: created.id,
    }
  } catch (error) {
    console.error('[syncBookingToGoogleCalendar]', error)
    return {
      ok: false,
      action: 'noop',
      eventId: input.existingCalendarEventId,
      reason: 'unexpected_error',
    }
  }
}
