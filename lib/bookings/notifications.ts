import { getEnabledPaymentMethods } from '@/lib/bookings/payment-settings'
import type { OperationalBookingStatus } from '@/lib/bookings/operations'
import { Resend } from 'resend'
import { resolveReferenceRate } from '@/lib/bookings/reference-rate'
import { buildAdminPaymentProofUrl } from '@/lib/bookings/operational-links'

export type BookingNotificationEvent =
  | 'booking.pending_payment.created'
  | 'booking.payment_reported'
  | 'booking.confirmed'
  | 'booking.expired'
  | 'booking.cancelled'

export interface BookingNotificationPayload {
  publicCode: string
  paymentProofId?: string | null
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
  bcvRate?: number | null
  bcvAsOf?: Date | string | null
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

function getBookingsEmailFrom(): string | null {
  const value = process.env.BOOKINGS_EMAIL_FROM?.trim()
  return value ? value : null
}

function getBookingsEmailReplyTo(): string | null {
  const value = process.env.BOOKINGS_EMAIL_REPLY_TO?.trim()
  return value ? value : null
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return new Resend(apiKey)
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

function formatBsReferenceAmount(payload: BookingNotificationPayload): string | null {
  const currency = payload.currency?.trim().toUpperCase() || 'USD'
  if (currency !== 'USD') {
    return null
  }

  if (typeof payload.estimatedTotal !== 'number' || !Number.isFinite(payload.estimatedTotal)) {
    return null
  }

  if (typeof payload.bcvRate !== 'number' || !Number.isFinite(payload.bcvRate)) {
    return null
  }

  const bsAmount = payload.estimatedTotal * payload.bcvRate
  return `Bs. ${bsAmount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatBcvReference(payload: BookingNotificationPayload): string | null {
  if (typeof payload.bcvRate !== 'number' || !Number.isFinite(payload.bcvRate)) {
    return null
  }

  const rateLabel = payload.bcvRate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
  const asOfLabel = payload.bcvAsOf ? ` (asOf: ${formatDateTime(payload.bcvAsOf)})` : ''

  return `Referencia BCV: 1 USD = Bs. ${rateLabel}${asOfLabel}`
}

function buildCommonLines(payload: BookingNotificationPayload): string[] {
  const lines = [
    `Codigo: ${payload.publicCode}`,
    `Servicio: ${payload.serviceName ?? 'Por confirmar'}`,
    `Modalidad: ${payload.variantName ?? 'Por confirmar'}`,
    `Horario: ${formatSchedule(payload.startAt, payload.endAt)}`,
    `Sala: ${payload.resourceName ?? 'Por asignar'}`,
    `Monto: ${formatAmount(payload)}`,
  ]

  const bsReferenceAmount = formatBsReferenceAmount(payload)
  if (bsReferenceAmount) {
    lines.push(`Monto referencial Bs: ${bsReferenceAmount}`)
  }

  const bcvReference = formatBcvReference(payload)
  if (bcvReference) {
    lines.push(bcvReference)
  }

  return lines
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
  const paymentProofUrl = buildAdminPaymentProofUrl(payload.publicCode, payload.paymentProofId)

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
    paymentProofUrl ? `Ver comprobante: ${paymentProofUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')
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
  const resendClient = getResendClient()
  const emailFrom = getBookingsEmailFrom()

  if (!resendClient) {
    console.warn('[bookings.notifications] skipped email: missing RESEND_API_KEY', {
      event,
      to: message.to,
      subject: message.subject,
    })
    return
  }

  if (!emailFrom) {
    console.warn('[bookings.notifications] skipped email: missing BOOKINGS_EMAIL_FROM', {
      event,
      to: message.to,
      subject: message.subject,
    })
    return
  }

  const replyTo = getBookingsEmailReplyTo()

  try {
    const result = await resendClient.emails.send({
      from: emailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(replyTo ? { replyTo } : {}),
    })

    if (result.error) {
      console.error('[bookings.notifications] resend send failed', {
        event,
        to: message.to,
        error: result.error,
      })
    }
  } catch (error) {
    console.error('[bookings.notifications] resend send error', {
      event,
      to: message.to,
      error,
    })
  }
}

async function enrichPayloadWithReferenceRate(
  event: BookingNotificationEvent,
  payload: BookingNotificationPayload,
): Promise<BookingNotificationPayload> {
  if (
    event !== 'booking.pending_payment.created' &&
    event !== 'booking.payment_reported' &&
    event !== 'booking.confirmed'
  ) {
    return payload
  }

  if (typeof payload.bcvRate === 'number' && Number.isFinite(payload.bcvRate)) {
    return payload
  }

  const currency = payload.currency?.trim().toUpperCase() || 'USD'
  if (currency !== 'USD') {
    return payload
  }

  if (typeof payload.estimatedTotal !== 'number' || !Number.isFinite(payload.estimatedTotal)) {
    return payload
  }

  try {
    const rate = await resolveReferenceRate()
    return {
      ...payload,
      bcvRate: rate.rate,
      bcvAsOf: rate.asOf,
    }
  } catch {
    return payload
  }
}

export async function sendBookingNotifications(
  event: BookingNotificationEvent,
  payload: BookingNotificationPayload,
): Promise<void> {
  const enrichedPayload = await enrichPayloadWithReferenceRate(event, payload)
  const messages = buildMessages(event, enrichedPayload)
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
