import 'server-only'

import { sendWhatsappMessage } from '@/lib/whatsapp/outbound-provider'
import { buildPaymentRecoveryPath } from '@/lib/bookings/payment-recovery-token'

export type PaymentReminderKind = 'payment_reminder_10m' | 'payment_reminder_50m'

export interface PaymentReminderSendResult {
  sent: boolean
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  responseStatus?: number
  provider?: string
  messageId?: string | null
}

export interface ScheduledPaymentReminderJob {
  reminderKind: PaymentReminderKind
  dueAtIso: string
}

function normalizePhone(value: string): string {
  return value.replace(/[+\s\-()]/g, '').replace(/[^\d]/g, '')
}

function baseAppUrl(): string {
  return (process.env.APP_URL?.trim() || 'https://turpialsong.com').replace(/\/+$/, '')
}

export function buildPaymentReminderMessage(input: {
  reminderKind: PaymentReminderKind
  clientName: string
  publicCode: string
  token: string
}): string {
  const recoveryLink = `${baseAppUrl()}${buildPaymentRecoveryPath({
    publicCode: input.publicCode,
    token: input.token,
  })}`
  const customerName = input.clientName.trim() || 'cliente'

  if (input.reminderKind === 'payment_reminder_10m') {
    return [
      `Hola, ${customerName}. Tu solicitud ${input.publicCode} sigue pendiente de pago.`,
      '',
      'Puedes completar el pago y reportar el comprobante aqui:',
      recoveryLink,
      '',
      'Tu horario estara reservado durante la ventana de pago.',
    ].join('\n')
  }

  return [
    `Hola, ${customerName}. Tu solicitud ${input.publicCode} esta por vencer.`,
    '',
    'Si ya realizaste el pago, reporta el comprobante aqui:',
    recoveryLink,
    '',
    'Si no reportas el pago a tiempo, el horario puede liberarse.',
  ].join('\n')
}

export async function sendPaymentReminderWhatsapp(input: {
  reminderKind: PaymentReminderKind
  phone: string
  clientName: string
  publicCode: string
  token: string
}): Promise<PaymentReminderSendResult> {
  const normalizedPhone = normalizePhone(input.phone)
  if (!normalizedPhone) {
    return { sent: false, status: 'failed', reason: 'missing_phone' }
  }

  const message = buildPaymentReminderMessage({
    reminderKind: input.reminderKind,
    clientName: input.clientName,
    publicCode: input.publicCode,
    token: input.token,
  })

  try {
    const outbound = await sendWhatsappMessage({
      to: normalizedPhone,
      message,
      event: input.reminderKind,
      publicCode: input.publicCode,
    })

    if (outbound.ok) {
      return {
        sent: true,
        status: 'sent',
        responseStatus: outbound.bridgeResponseCode,
        provider: outbound.provider,
        messageId: outbound.messageId ?? null,
      }
    }

    const isSkippedReason =
      outbound.reason === 'outbound_disabled' ||
      outbound.reason === 'missing_provider' ||
      outbound.reason === 'missing_bridge_url' ||
      outbound.reason === 'missing_api_key' ||
      Boolean(outbound.reason?.startsWith('unsupported_provider:'))

    return {
      sent: false,
      status: isSkippedReason ? 'skipped' : 'failed',
      reason: outbound.reason ?? 'unknown',
      responseStatus: outbound.bridgeResponseCode,
      provider: outbound.provider,
      messageId: outbound.messageId ?? null,
    }
  } catch {
    return { sent: false, status: 'failed', reason: 'bridge_network_error' }
  }
}

export function buildScheduledPaymentReminderJobs(createdAt: Date): ScheduledPaymentReminderJob[] {
  return [
    {
      reminderKind: 'payment_reminder_10m',
      dueAtIso: new Date(createdAt.getTime() + 10 * 60 * 1000).toISOString(),
    },
    {
      reminderKind: 'payment_reminder_50m',
      dueAtIso: new Date(createdAt.getTime() + 50 * 60 * 1000).toISOString(),
    },
  ]
}
