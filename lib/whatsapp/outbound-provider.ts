export interface OutboundWhatsappPayload {
  to: string
  message: string
  event: string
  publicCode?: string | null
}

export interface OutboundWhatsappResult {
  ok: boolean
  provider: 'bridge' | 'disabled'
  messageId?: string | null
  reason?: string
  bridgeResponseCode?: number
}

const SUPPORTED_PROVIDERS = new Set(['baileys_bridge'])

export async function sendWhatsappMessage(
  payload: OutboundWhatsappPayload,
): Promise<OutboundWhatsappResult> {
  const enabled = process.env.WHATSAPP_OUTBOUND_ENABLED?.trim()
  if (!enabled || enabled === 'false' || enabled === '0') {
    return { ok: false, provider: 'disabled', reason: 'outbound_disabled' }
  }

  const provider = process.env.WHATSAPP_OUTBOUND_PROVIDER?.trim()
  if (!provider) {
    return { ok: false, provider: 'disabled', reason: 'missing_provider' }
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return { ok: false, provider: 'disabled', reason: `unsupported_provider:${provider}` }
  }

  const bridgeUrl = process.env.WHATSAPP_BRIDGE_SEND_URL?.trim()
  const apiKey = process.env.WHATSAPP_BRIDGE_API_KEY?.trim()
  const instance = process.env.WHATSAPP_BRIDGE_INSTANCE?.trim()

  if (!bridgeUrl) {
    return { ok: false, provider: 'disabled', reason: 'missing_bridge_url' }
  }

  if (!apiKey) {
    return { ok: false, provider: 'disabled', reason: 'missing_api_key' }
  }

  try {
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        instance: instance || undefined,
        to: payload.to.replace(/[^\d+]/g, ''),
        message: payload.message,
        event: payload.event,
        publicCode: payload.publicCode || undefined,
      }),
      cache: 'no-store',
    })

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      messageId?: string
    } | null

    if (response.ok && body?.ok === true) {
      return {
        ok: true,
        provider: 'bridge',
        messageId: body.messageId ?? null,
        bridgeResponseCode: response.status,
      }
    }

    return {
      ok: false,
      provider: 'bridge',
      reason: 'bridge_rejected',
      bridgeResponseCode: response.status,
    }
  } catch (error) {
    console.error('[whatsapp-outbound]', error)
    return { ok: false, provider: 'bridge', reason: 'bridge_network_error' }
  }
}

export function buildManualWhatsappDeepLink(phone: string, message: string): string {
  const encoded = encodeURIComponent(message)
  const clean = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${clean}?text=${encoded}`
}
