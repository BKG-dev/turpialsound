import { getEnabledPaymentMethods } from '@/lib/bookings/payment-settings'
import { isPreviewDeployment } from '@/lib/bookings/environment'
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
  clientWhatsapp?: string | null
  serviceName?: string | null
  variantName?: string | null
  resourceName?: string | null
  requestCreatedAt?: Date | string | null
  startAt?: Date | string | null
  endAt?: Date | string | null
  deadlineAt?: Date | string | null
  paymentReportedAt?: Date | string | null
  estimatedTotal?: number | null
  currency?: string | null
  currencyDisplay?: string | null
  bcvRate?: number | null
  bcvAsOf?: Date | string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  status?: OperationalBookingStatus | null
  notes?: string | null
}

interface BookingEmailMessage {
  to: string
  subject: string
  text: string
  html?: string
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

function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
  }).format(date)
}

function formatTimeOnly(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    timeStyle: 'short',
  }).format(date)
}

function mapPaymentMethodLabel(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'pago_movil') return 'Pago Movil'
  if (normalized === 'transferencia') return 'Transferencia Bancaria'
  if (normalized === 'binance') return 'Binance Pay'
  if (normalized === 'efectivo') return 'Efectivo'
  return value?.trim() || 'No especificado'
}

function mapOperationalStatusLabel(value: OperationalBookingStatus | null | undefined): string {
  if (value === 'payment_reported') return 'Pago reportado'
  if (value === 'confirmed') return 'Confirmada'
  if (value === 'expired') return 'Vencida'
  if (value === 'cancelled') return 'Cancelada'
  if (value === 'pending_payment') return 'Pendiente de pago'
  if (value === 'payment_verified') return 'Pago verificado'
  if (value === 'submitted') return 'Enviada'
  return 'En revision'
}

function computeTemporalStatusLabel(payload: BookingNotificationPayload): string {
  if (!payload.deadlineAt || !payload.paymentReportedAt) {
    return 'Sin contexto temporal suficiente'
  }

  const deadline = payload.deadlineAt instanceof Date ? payload.deadlineAt : new Date(payload.deadlineAt)
  const reportedAt =
    payload.paymentReportedAt instanceof Date
      ? payload.paymentReportedAt
      : new Date(payload.paymentReportedAt)

  if (Number.isNaN(deadline.getTime()) || Number.isNaN(reportedAt.getTime())) {
    return 'Sin contexto temporal suficiente'
  }

  const deltaMs = reportedAt.getTime() - deadline.getTime()
  if (deltaMs <= 0) {
    return 'Reportado dentro del plazo'
  }

  const deltaMinutes = Math.round(deltaMs / 60000)
  return `Reportado ${deltaMinutes} min despues del vencimiento`
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

function formatResourceName(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
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
    `Sala: ${formatResourceName(payload.resourceName, 'Por asignar')}`,
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
  const paymentReviewUrl = buildAdminPaymentProofUrl(payload.publicCode, payload.paymentProofId)
  const paymentMethodLabel = mapPaymentMethodLabel(payload.paymentMethod)
  const temporalStatus = computeTemporalStatusLabel(payload)
  const bsReferenceAmount = formatBsReferenceAmount(payload)
  const bcvReference = formatBcvReference(payload)

  return [
    'VERIFICAR PAGO',
    '',
    `Codigo: ${payload.publicCode}`,
    `Estado operativo: ${mapOperationalStatusLabel(payload.status)}`,
    `Cliente: ${payload.clientName ?? 'N/A'}`,
    `Email cliente: ${payload.clientEmail ?? 'N/A'}`,
    `WhatsApp cliente: ${payload.clientWhatsapp ?? 'No disponible'}`,
    `Servicio: ${payload.serviceName ?? 'Por confirmar'}`,
    `Modalidad: ${payload.variantName ?? 'Por confirmar'}`,
    `Sala/recurso: ${formatResourceName(payload.resourceName, 'por confirmar')}`,
    `Fecha reservada: ${formatDateOnly(payload.startAt)}`,
    `Bloque horario: ${formatTimeOnly(payload.startAt)} - ${formatTimeOnly(payload.endAt)}`,
    `Monto USD: ${formatAmount(payload)}`,
    bcvReference ?? 'Referencia BCV: No disponible',
    bsReferenceAmount ? `Monto esperado Bs: ${bsReferenceAmount}` : 'Monto esperado Bs: No disponible',
    `Metodo reportado: ${paymentMethodLabel}`,
    `Referencia operativa: ${payload.paymentReference ?? 'No especificada'}`,
    `Solicitud creada: ${formatDateTime(payload.requestCreatedAt)}`,
    `Vencimiento de pago: ${formatDateTime(payload.deadlineAt)}`,
    `Pago reportado: ${formatDateTime(payload.paymentReportedAt)}`,
    `Estado temporal: ${temporalStatus}`,
    paymentReviewUrl
      ? `Enlace de revision: ${paymentReviewUrl}`
      : 'Enlace de revision: no disponible por configuracion incompleta.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildActionButtonHtml(label: string, href: string, bgColor: string): string {
  return `<a href="${href}" style="display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;color:#ffffff;background:${bgColor};">${label}</a>`
}

function buildPaymentReportedAdminHtml(payload: BookingNotificationPayload): string | null {
  const reviewUrl = buildAdminPaymentProofUrl(payload.publicCode, payload.paymentProofId)
  if (!reviewUrl) return null
  const confirmUrl = `${reviewUrl}&intent=confirm`
  const incidenceUrl = `${reviewUrl}&intent=incidence`

  const paymentMethodLabel = mapPaymentMethodLabel(payload.paymentMethod)
  const temporalStatus = computeTemporalStatusLabel(payload)
  const bcvReference = formatBcvReference(payload) ?? 'Referencia BCV: No disponible'
  const bsReferenceAmount = formatBsReferenceAmount(payload) ?? 'No disponible'

  return `
  <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">VERIFICAR PAGO</p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">${payload.publicCode}</h1>
      <p style="margin:0 0 14px;font-size:14px;color:#334155;">Estado operativo: <strong>${mapOperationalStatusLabel(payload.status)}</strong></p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;">Cliente</td><td style="padding:6px 0;">${payload.clientName ?? 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${payload.clientEmail ?? 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">WhatsApp</td><td style="padding:6px 0;">${payload.clientWhatsapp ?? 'No disponible'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Servicio</td><td style="padding:6px 0;">${payload.serviceName ?? 'Por confirmar'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Modalidad</td><td style="padding:6px 0;">${payload.variantName ?? 'Por confirmar'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Sala / recurso</td><td style="padding:6px 0;">${formatResourceName(payload.resourceName, 'Por confirmar')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Fecha reservada</td><td style="padding:6px 0;">${formatDateOnly(payload.startAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Bloque horario</td><td style="padding:6px 0;">${formatTimeOnly(payload.startAt)} - ${formatTimeOnly(payload.endAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Metodo reportado</td><td style="padding:6px 0;">${paymentMethodLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Monto USD</td><td style="padding:6px 0;">${formatAmount(payload)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Referencia BCV</td><td style="padding:6px 0;">${bcvReference}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Monto esperado Bs</td><td style="padding:6px 0;">${bsReferenceAmount}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Referencia operativa</td><td style="padding:6px 0;">${payload.paymentReference ?? 'No especificada'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Solicitud creada</td><td style="padding:6px 0;">${formatDateTime(payload.requestCreatedAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Vencimiento de pago</td><td style="padding:6px 0;">${formatDateTime(payload.deadlineAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Pago reportado</td><td style="padding:6px 0;">${formatDateTime(payload.paymentReportedAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Estado temporal</td><td style="padding:6px 0;"><strong>${temporalStatus}</strong></td></tr>
      </table>

      <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap;">
        ${buildActionButtonHtml('Ver comprobante y aprobar', reviewUrl, '#0f172a')}
        ${buildActionButtonHtml('Abrir revision', reviewUrl, '#334155')}
        ${buildActionButtonHtml('Confirmar pago', confirmUrl, '#065f46')}
        ${buildActionButtonHtml('Marcar incidencia', incidenceUrl, '#9a3412')}
      </div>
    </div>
  </div>`
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
    `Sala: ${formatResourceName(payload.resourceName, 'Por asignar')}`,
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
      const adminHtml = buildPaymentReportedAdminHtml(payload)
      messages.push({
        to: adminEmail,
        subject: `VERIFICAR PAGO - ${payload.publicCode}`,
        text: buildPaymentReportedAdminText(payload),
        html: adminHtml ?? undefined,
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
      ...(message.html ? { html: message.html } : {}),
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
  if (isPreviewDeployment()) {
    return
  }

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
