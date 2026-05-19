import {
  buildManualWhatsappDeepLink,
  sendWhatsappMessage,
  type OutboundWhatsappResult,
} from '@/lib/whatsapp/outbound-provider'

export type BookingWhatsappEvent =
  | 'verification_code'
  | 'whatsapp_secure_link'
  | 'return_link'
  | 'pending_payment'
  | 'payment_reported'
  | 'reminder_1_half_window'
  | 'reminder_2_10min'
  | 'booking_confirmed'
  | 'incidence'
  | 'booking_expired'

interface CustomerChannel {
  phone: string
  name: string
}

interface BookingContext {
  publicCode: string
  serviceName?: string | null
  variantName?: string | null
  resourceName?: string | null
  eventDate?: Date | null
  eventEndDate?: Date | null
  paymentWindowMinutes?: number
  reuploadUrl?: string | null
  incidenceReason?: string | null
  secureLinkUrl?: string | null
  secureLinkTtlMinutes?: number | null
}

export interface BookingWhatsappResult {
  sent: boolean
  provider: OutboundWhatsappResult['provider'] | 'manual_fallback'
  manualLink?: string | null
  reason?: string
  messageId?: string | null
}

interface SendBookingWhatsappOptions {
  allowManualFallback?: boolean
}

function logBookingWhatsappOutcome(payload: {
  event: BookingWhatsappEvent
  publicCode: string
  hasPhone: boolean
  provider: string
  result: 'ok' | 'reason'
  reason?: string | null
  messageId?: string | null
}): void {
  const logger = payload.result === 'ok' ? console.info : console.warn
  logger('[whatsapp.booking_event]', payload)
}

function formatDateOnlyCaracas(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
  }).format(value)
}

function formatTimeOnlyCaracas(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    timeStyle: 'short',
  }).format(value)
}

function formatMessage(
  event: BookingWhatsappEvent,
  customer: CustomerChannel,
  booking: BookingContext,
): string {
  const lines: string[] = []

  switch (event) {
    case 'verification_code':
      return ''
    case 'whatsapp_secure_link':
      lines.push(
        `Hola ${customer.name}, solicitaste continuar una reserva en Turpial Sound.`,
        '',
        'Toca aqui para seguir:',
        booking.secureLinkUrl ?? `${process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://www.turpialsound.com'}/reservas`,
        '',
        `Este enlace vence en ${booking.secureLinkTtlMinutes ?? 30} minutos.`,
        '',
        'Si no fuiste tu, ignora este mensaje.',
      )
      break
    case 'return_link':
      lines.push(
        `Hola ${customer.name}, verificamos tu WhatsApp.`,
        `Continua tu solicitud para ${booking.serviceName ?? 'Turpial Sound'}:`,
        `${process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'}/reservas`,
      )
      break
    case 'pending_payment':
      lines.push(
        `Hola ${customer.name}, recibimos tu solicitud ${booking.publicCode}.`,
        'Tu horario esta en espera de pago por 1 hora.',
        'Completa el pago y reporta el comprobante para que podamos revisarlo.',
      )
      break
    case 'payment_reported':
      lines.push(
        `Hola ${customer.name}, recibimos tu reporte de pago para ${booking.publicCode}.`,
        `Tu comprobante esta en revision. Te confirmaremos cuando el pago sea aprobado.`,
      )
      break
    case 'reminder_1_half_window':
      lines.push(
        `Hola ${customer.name}, tienes pendiente el pago de tu solicitud ${booking.publicCode}.`,
        `Reporta tu pago antes de que venza la ventana para asegurar tu horario.`,
      )
      break
    case 'reminder_2_10min':
      lines.push(
        `Hola ${customer.name}, quedan 10 minutos para reportar el pago de ${booking.publicCode}.`,
        `Si no reportas a tiempo, el horario quedara liberado.`,
      )
      break
    case 'booking_confirmed':
      const eventDate = formatDateOnlyCaracas(booking.eventDate)
      const startTime = formatTimeOnlyCaracas(booking.eventDate)
      const endTime = formatTimeOnlyCaracas(booking.eventEndDate)
      const schedule = startTime && endTime ? `${startTime} - ${endTime}` : startTime ?? null
      lines.push(
        `Hola ${customer.name}, tu reserva ${booking.publicCode} fue CONFIRMADA.`,
        eventDate ? `Fecha: ${eventDate}.` : '',
        schedule ? `Horario: ${schedule}.` : '',
        booking.resourceName ? `Sala/Recurso: ${booking.resourceName}.` : '',
        `Te esperamos en Turpial Sound.`,
      )
      break
    case 'incidence':
      if (booking.reuploadUrl) {
        lines.push(
          `Hola ${customer.name}, no pudimos visualizar el comprobante de ${booking.publicCode}.`,
          `Por favor reenvialo aqui: ${booking.reuploadUrl}`,
        )
      } else {
        lines.push(
          `Hola ${customer.name}, hubo un inconveniente con tu solicitud ${booking.publicCode}.`,
          booking.incidenceReason
            ? `Motivo: ${booking.incidenceReason}.`
            : 'El equipo te contactara pronto.',
        )
      }
      break
    case 'booking_expired':
      lines.push(
        `Hola ${customer.name}, la ventana de pago para ${booking.publicCode} vencio.`,
        `Puedes crear una nueva solicitud en turpialsound.com/reservas.`,
      )
      break
  }

  return lines.filter(Boolean).join('\n')
}

export async function sendBookingWhatsapp(
  event: BookingWhatsappEvent,
  customer: CustomerChannel,
  booking: BookingContext,
  options?: SendBookingWhatsappOptions,
): Promise<BookingWhatsappResult> {
  const allowManualFallback = options?.allowManualFallback ?? true
  const configuredProvider = process.env.WHATSAPP_OUTBOUND_PROVIDER?.trim() ?? 'disabled'
  const hasPhone = Boolean(customer.phone?.trim())

  if (!customer.phone) {
    logBookingWhatsappOutcome({
      event,
      publicCode: booking.publicCode,
      hasPhone,
      provider: configuredProvider,
      result: 'reason',
      reason: 'missing_phone',
      messageId: null,
    })
    return { sent: false, provider: 'disabled', reason: 'missing_phone' }
  }

  const message = formatMessage(event, customer, booking)
  if (!message) {
    logBookingWhatsappOutcome({
      event,
      publicCode: booking.publicCode,
      hasPhone,
      provider: configuredProvider,
      result: 'reason',
      reason: 'empty_message',
      messageId: null,
    })
    return { sent: false, provider: 'disabled', reason: 'empty_message' }
  }

  const outbound = await sendWhatsappMessage({
    to: customer.phone,
    message,
    event,
    publicCode: booking.publicCode,
  })

  if (outbound.ok) {
    logBookingWhatsappOutcome({
      event,
      publicCode: booking.publicCode,
      hasPhone,
      provider: outbound.provider,
      result: 'ok',
      reason: null,
      messageId: outbound.messageId ?? null,
    })
    return {
      sent: true,
      provider: outbound.provider,
      messageId: outbound.messageId ?? null,
    }
  }

  if (!allowManualFallback) {
    logBookingWhatsappOutcome({
      event,
      publicCode: booking.publicCode,
      hasPhone,
      provider: outbound.provider,
      result: 'reason',
      reason: outbound.reason ?? 'outbound_failed',
      messageId: outbound.messageId ?? null,
    })
    return {
      sent: false,
      provider: outbound.provider,
      reason: outbound.reason ?? 'outbound_failed',
      messageId: outbound.messageId ?? null,
    }
  }

  const manualLink = buildManualWhatsappDeepLink(customer.phone, message)
  logBookingWhatsappOutcome({
    event,
    publicCode: booking.publicCode,
    hasPhone,
    provider: 'manual_fallback',
    result: 'reason',
    reason: outbound.reason ?? 'outbound_failed',
    messageId: outbound.messageId ?? null,
  })
  return {
    sent: false,
    provider: 'manual_fallback',
    reason: outbound.reason ?? 'outbound_failed',
    manualLink,
    messageId: outbound.messageId ?? null,
  }
}

interface BookingConfirmedWhatsappPayload {
  publicCode: string
  requesterName: string
  requesterPhone?: string | null
  serviceName?: string | null
  variantName?: string | null
  resourceName?: string | null
  eventDate?: Date | null
  eventEndDate?: Date | null
}

export async function sendBookingConfirmedWhatsapp(
  payload: BookingConfirmedWhatsappPayload,
): Promise<BookingWhatsappResult> {
  const phone = payload.requesterPhone?.trim() ?? ''
  const hasPhone = phone.length > 0
  const configuredProvider = process.env.WHATSAPP_OUTBOUND_PROVIDER?.trim() ?? 'disabled'

  if (!hasPhone) {
    console.info('[whatsapp.booking_confirmed]', {
      event: 'booking_confirmed',
      publicCode: payload.publicCode,
      hasPhone,
      provider: configuredProvider,
      result: 'reason',
      reason: 'missing_phone',
      messageId: null,
    })

    return { sent: false, provider: 'disabled', reason: 'missing_phone' }
  }

  try {
    const result = await sendBookingWhatsapp(
      'booking_confirmed',
      { phone, name: payload.requesterName },
      {
        publicCode: payload.publicCode,
        serviceName: payload.serviceName ?? null,
        variantName: payload.variantName ?? null,
        resourceName: payload.resourceName ?? null,
        eventDate: payload.eventDate ?? null,
        eventEndDate: payload.eventEndDate ?? null,
      },
      { allowManualFallback: false },
    )

    const logLevel = result.sent ? console.info : console.warn
    logLevel('[whatsapp.booking_confirmed]', {
      event: 'booking_confirmed',
      publicCode: payload.publicCode,
      hasPhone,
      provider: configuredProvider,
      result: result.sent ? 'ok' : 'reason',
      reason: result.sent ? null : (result.reason ?? 'unknown'),
      messageId: result.messageId ?? null,
    })

    return result
  } catch (error) {
    console.error('[whatsapp.booking_confirmed]', {
      event: 'booking_confirmed',
      publicCode: payload.publicCode,
      hasPhone,
      provider: configuredProvider,
      result: 'reason',
      reason: 'unexpected_error',
      messageId: null,
      errorType: error instanceof Error ? error.name : typeof error,
    })

    return { sent: false, provider: 'disabled', reason: 'unexpected_error' }
  }
}

export function buildReturnLink(publicCode?: string): string {
  const base = process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://turpialsong.com'
  return publicCode
    ? `${base}/reservas?code=${encodeURIComponent(publicCode)}`
    : `${base}/reservas`
}
