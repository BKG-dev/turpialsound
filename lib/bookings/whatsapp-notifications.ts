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

const DEFAULT_TIMEOUT_MS = 1500

function isBridgeEnabled(): boolean {
  const raw = process.env.BOOKINGS_WHATSAPP_BRIDGE_ENABLED?.trim().toLowerCase() ?? ''
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function normalizeBridgePhone(value: string): string {
  return value.replace(/[+\s\-()]/g, '').replace(/[^\d]/g, '')
}

export async function sendBookingWhatsappNotification(
  input: SendBookingWhatsappNotificationInput,
): Promise<SendBookingWhatsappNotificationResult> {
  if (!isBridgeEnabled()) {
    return { status: 'skipped', reason: 'bridge_disabled' }
  }

  const bridgeUrl = process.env.BOOKINGS_WHATSAPP_BRIDGE_URL?.trim()
  const bridgeSecret = process.env.BOOKINGS_WHATSAPP_BRIDGE_SECRET?.trim()

  if (!bridgeUrl || !bridgeSecret) {
    return { status: 'skipped', reason: 'missing_bridge_config' }
  }

  const normalizedPhone = normalizeBridgePhone(input.phone)
  if (!normalizedPhone) {
    return { status: 'failed', reason: 'missing_phone' }
  }

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bridgeSecret}`,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        event: input.event,
        publicCode: input.publicCode,
        message: input.message,
      }),
      cache: 'no-store',
      signal: abortController.signal,
    })

    if (!response.ok) {
      return {
        status: 'failed',
        reason: 'bridge_rejected',
        responseStatus: response.status,
      }
    }

    return {
      status: 'sent',
      responseStatus: response.status,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'failed', reason: 'timeout' }
    }

    return { status: 'failed', reason: 'bridge_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
