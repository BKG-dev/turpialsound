import { getEnabledPaymentMethods } from '@/lib/bookings/payment-settings'
import type { OperationalBookingStatus } from '@/lib/bookings/operations'

export type BookingNotificationEvent =
  | 'booking.pending_payment.created'
  | 'booking.payment_reported'
  | 'booking.confirmed'
  | 'booking.expired'
  | 'booking.cancelled'

export interface BookingNotificationPayload {
  publicCode: string
  clientName?: string | null
  clientEmail?: string | null
  serviceName?: string | null
  variantName?: string | null
  resourceName?: string | null
  startAt?: Date | string | null
  endAt?: Date | string | null
  deadlineAt?: Date | string | null
  estimatedTotal?: number | null
  currency?: string | null
  currencyDisplay?: string | null
  paymentMethod?: string | null
  status?: OperationalBookingStatus | null
  notes?: string | null
}

interface BookingEmailMessage {
  to: string
  subject: string
  text: string
}

function getBookingAdminNotificationsEmail(): string | null {
  const value = process.env.BOOKINGS_ADMIN_NOTIFICATIONS_EMAIL?.trim()
  return value ? value : null
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized ? normalized : null
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatSchedule(
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
): string {
  const startLabel = formatDateTime(startAt)
  const endLabel = formatDateTime(endAt)
  if (endLabel === 'Por confirmar' || startLabel === endLabel) {
    return startLabel
  }
  return `${startLabel} - ${endLabel}`
}

function formatAmount(payload: BookingNotificationPayload): string {
  if (payload.currencyDisplay?.trim()) {
    return payload.currencyDisplay.trim()
  }

  if (typeof payload.estimatedTotal === 'number') {
    const currency = payload.currency?.trim().toUpperCase() || 'USD'
    return `${currency} ${payload.estimatedTotal.toFixed(2)}`
  }

  return 'Por confirmar'
}

function buildCommonLines(payload: BookingNotificationPayload): string[] {
  return [
    `Codigo: ${payload.publicCode}`,
    `Servicio: ${payload.serviceName ?? 'Por confirmar'}`,
    `Modalidad: ${payload.variantName ?? 'Por confirmar'}`,
    `Horario: ${formatSchedule(payload.startAt, payload.endAt)}`,
    `Sala: ${payload.resourceName ?? 'Por asignar'}`,
    `Monto: ${formatAmount(payload)}`,
  ]
}

function buildPendingPaymentCustomerText(payload: BookingNotificationPayload): string {
  const paymentMethods = getEnabledPaymentMethods().map((method) => method.name)
  const paymentMethodsSection =
    paymentMethods.length > 0
      ? `\nMetodos de pago habilitados:\n${paymentMethods.map((method) => `- ${method}`).join('\n')}`
      : ''

  return [
    `Hola ${payload.clientName ?? 'cliente'},`,
    '',
    'Recibimos tu solicitud de reserva y quedo en espera de pago/verificacion manual.',
    ...buildCommonLines(payload),
    `Limite de pago: ${formatDateTime(payload.deadlineAt)}`,
    paymentMethodsSection,
    '',
    'Cuando reportes tu pago, el equipo continuara con la verificacion operativa.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

function buildPaymentReportedCustomerText(payload: BookingNotificationPayload): string {
  return [
    `Hola ${payload.clientName ?? 'cliente'},`,
    '',
    'Recibimos tu reporte de pago y ya esta en proceso de verificacion manual.',
    ...buildCommonLines(payload),
    '',
    'Te notificaremos cuando el pago quede verificado.',
  ].join('\n')
}

function buildPaymentReportedAdminText(payload: BookingNotificationPayload): string {
  return [
    'VERIFICAR PAGO',
    '',
    `Codigo: ${payload.publicCode}`,
    `Cliente: ${payload.clientName ?? 'N/A'}`,
    `Email cliente: ${payload.clientEmail ?? 'N/A'}`,
    `Servicio: ${payload.serviceName ?? 'Por confirmar'}`,
    `Modalidad: ${payload.variantName ?? 'Por confirmar'}`,
    `Horario: ${formatSchedule(payload.startAt, payload.endAt)}`,
    `Sala: ${payload.resourceName ?? 'Por asignar'}`,
    `Monto: ${formatAmount(payload)}`,
    `Metodo reportado: ${payload.paymentMethod ?? 'No especificado'}`,
  ].join('\n')
}

function buildConfirmedCustomerText(payload: BookingNotificationPayload): string {
  return [
    `Hola ${payload.clientName ?? 'cliente'},`,
    '',
    'Tu pago fue verificado y tu reserva quedo confirmada.',
    ...buildCommonLines(payload),
    '',
    'Proximo paso: conserva este codigo y llega con antelacion a tu horario.',
  ].join('\n')
}

function buildConfirmedAdminText(payload: BookingNotificationPayload): string {
  return [
    'Reserva confirmada',
    '',
    `Codigo: ${payload.publicCode}`,
    `Cliente: ${payload.clientName ?? 'N/A'}`,
    `Servicio: ${payload.serviceName ?? 'Por confirmar'}`,
    `Modalidad: ${payload.variantName ?? 'Por confirmar'}`,
    `Horario: ${formatSchedule(payload.startAt, payload.endAt)}`,
    `Sala: ${payload.resourceName ?? 'Por asignar'}`,
    `Monto: ${formatAmount(payload)}`,
  ].join('\n')
}

function buildExpiredCustomerText(payload: BookingNotificationPayload): string {
  return [
    `Hola ${payload.clientName ?? 'cliente'},`,
    '',
    'Tu solicitud expiro porque no se verifico el pago a tiempo y el horario fue liberado.',
    `Codigo: ${payload.publicCode}`,
    'Puedes crear una nueva solicitud si deseas apartar otra fecha.',
  ].join('\n')
}

function buildCancelledCustomerText(payload: BookingNotificationPayload): string {
  return [
    `Hola ${payload.clientName ?? 'cliente'},`,
    '',
    'Tu reserva fue cancelada.',
    `Codigo: ${payload.publicCode}`,
    payload.notes?.trim() ? `Motivo: ${payload.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildMessages(
  event: BookingNotificationEvent,
  payload: BookingNotificationPayload,
): BookingEmailMessage[] {
  const clientEmail = normalizeEmail(payload.clientEmail)
  const adminEmail = normalizeEmail(getBookingAdminNotificationsEmail())
  const messages: BookingEmailMessage[] = []

  if (event === 'booking.pending_payment.created' && clientEmail) {
    messages.push({
      to: clientEmail,
      subject: `Recibimos tu solicitud de reserva - ${payload.publicCode}`,
      text: buildPendingPaymentCustomerText(payload),
    })
  }

  if (event === 'booking.payment_reported') {
    if (clientEmail) {
      messages.push({
        to: clientEmail,
        subject: `Estamos verificando tu pago - ${payload.publicCode}`,
        text: buildPaymentReportedCustomerText(payload),
      })
    }
    if (adminEmail) {
      messages.push({
        to: adminEmail,
        subject: `VERIFICAR PAGO - ${payload.publicCode}`,
        text: buildPaymentReportedAdminText(payload),
      })
    }
  }

  if (event === 'booking.confirmed') {
    if (clientEmail) {
      messages.push({
        to: clientEmail,
        subject: `Pago verificado - Reserva confirmada - ${payload.publicCode}`,
        text: buildConfirmedCustomerText(payload),
      })
    }
    if (adminEmail) {
      messages.push({
        to: adminEmail,
        subject: `Reserva confirmada - ${payload.publicCode}`,
        text: buildConfirmedAdminText(payload),
      })
    }
  }

  if (event === 'booking.expired' && clientEmail) {
    messages.push({
      to: clientEmail,
      subject: `Tu solicitud expiro y el horario fue liberado - ${payload.publicCode}`,
      text: buildExpiredCustomerText(payload),
    })
  }

  if (event === 'booking.cancelled' && clientEmail) {
    messages.push({
      to: clientEmail,
      subject: `Tu reserva fue cancelada - ${payload.publicCode}`,
      text: buildCancelledCustomerText(payload),
    })
  }

  return messages
}

async function sendEmailMessage(
  message: BookingEmailMessage,
  event: BookingNotificationEvent,
): Promise<void> {
  const webhookUrl = process.env.BOOKINGS_EMAIL_WEBHOOK_URL?.trim()
  if (!webhookUrl) {
    console.warn('[bookings.notifications] skipped email: missing BOOKINGS_EMAIL_WEBHOOK_URL', {
      event,
      to: message.to,
      subject: message.subject,
    })
    return
  }

  const webhookToken = process.env.BOOKINGS_EMAIL_WEBHOOK_TOKEN?.trim()

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify({
        to: message.to,
        subject: message.subject,
        text: message.text,
        from: process.env.BOOKINGS_EMAIL_FROM?.trim() || null,
        event,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[bookings.notifications] email webhook failed', {
        event,
        status: response.status,
        to: message.to,
      })
    }
  } catch (error) {
    console.error('[bookings.notifications] email webhook error', {
      event,
      to: message.to,
      error,
    })
  }
}

export async function sendBookingNotifications(
  event: BookingNotificationEvent,
  payload: BookingNotificationPayload,
): Promise<void> {
  const messages = buildMessages(event, payload)
  if (messages.length === 0) {
    return
  }

  for (const message of messages) {
    await sendEmailMessage(message, event)
  }
}

export function getBookingNotificationEventForOperationalStatus(
  status: OperationalBookingStatus,
): BookingNotificationEvent | null {
  switch (status) {
    case 'pending_payment':
      return 'booking.pending_payment.created'
    case 'payment_reported':
      return 'booking.payment_reported'
    case 'confirmed':
      return 'booking.confirmed'
    case 'expired':
      return 'booking.expired'
    case 'cancelled':
      return 'booking.cancelled'
    default:
      return null
  }
}
