import { sendWhatsappMessage } from '@/lib/whatsapp/outbound-provider'

export type BookingWhatsappBridgeEvent = 'payment_reported'

export interface SendBookingWhatsappNotificationInput {
  phone: string
  publicCode: string
  event: BookingWhatsappBridgeEvent
  message: string
}

export interface SendBookingWhatsappNotificationResult {
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  responseStatus?: number
}

function mapOutboundFailureToStatus(reason?: string): 'skipped' | 'failed' {
  if (!reason) return 'failed'
  if (reason === 'outbound_disabled') return 'skipped'
  if (reason === 'missing_provider') return 'skipped'
  if (reason === 'missing_bridge_url') return 'skipped'
  if (reason === 'missing_api_key') return 'skipped'
  if (reason.startsWith('unsupported_provider:')) return 'skipped'
  return 'failed'
}

// Non-destructive QA hardening: do not toggle/disable bridge infra from app code.
// Failure tolerance is validated through non-throwing result statuses from the
// legacy outbound provider that is already used by pending_payment.

export async function sendBookingWhatsappNotification(
  input: SendBookingWhatsappNotificationInput,
): Promise<SendBookingWhatsappNotificationResult> {
  const normalizedPhone = input.phone.replace(/[+\s\-()]/g, '').replace(/[^\d]/g, '')
  if (!normalizedPhone) {
    return { status: 'failed', reason: 'missing_phone' }
  }

  try {
    const outbound = await sendWhatsappMessage({
      to: normalizedPhone,
      message: input.message,
      event: input.event,
      publicCode: input.publicCode,
    })

    if (outbound.ok) {
      return {
        status: 'sent',
        responseStatus: outbound.bridgeResponseCode,
      }
    }

    return {
      status: mapOutboundFailureToStatus(outbound.reason),
      reason: outbound.reason ?? 'unknown',
      responseStatus: outbound.bridgeResponseCode,
    }
  } catch {
    return { status: 'failed', reason: 'bridge_network_error' }
  }
}
