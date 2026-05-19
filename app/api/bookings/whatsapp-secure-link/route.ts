import { NextRequest, NextResponse } from 'next/server'
import { sendBookingWhatsapp } from '@/lib/whatsapp/booking-notifications'
import {
  createSecureLinkRequest,
  logSecureLinkSentResult,
  type SecureLinkDraftData,
} from '@/lib/whatsapp/secure-link-store'
import {
  getWhatsappVerificationConfigFromEnv,
  isSecureLinkPhoneAllowedByEnv,
  normalizeWhatsappVeForPolicy,
} from '@/lib/bookings/whatsapp-verify-config'

interface SecureLinkRequestPayload {
  requesterName?: string
  requesterEmail?: string
  requesterPhone?: string
  whatsappConsentAccepted?: boolean
  draft?: SecureLinkDraftData
  endTime?: string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^\+58(412|414|416|424|426)\d{7}$/

function isValidTime(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

function isDraftValid(draft: SecureLinkDraftData | undefined): draft is SecureLinkDraftData {
  if (!draft) return false
  if (!draft.data) return false

  const selected = draft.data.selectedItems[0]
  if (!selected?.serviceSlug || !selected.variantSlug) return false
  if (!draft.data.eventDate || !draft.data.startTime || typeof draft.data.durationMinutes !== 'number') {
    return false
  }

  return true
}

function canUseSecureLinkFlow(request: NextRequest): boolean {
  const config = getWhatsappVerificationConfigFromEnv()
  if (!config.secureLinkEnabled) return false
  if (config.mode === 'secure_link') return true
  return request.nextUrl.searchParams.get('waFlow') === 'secure-link'
}

export async function POST(request: NextRequest) {
  if (!canUseSecureLinkFlow(request)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const payload = (await request.json().catch(() => null)) as SecureLinkRequestPayload | null
  const requesterName = payload?.requesterName?.trim() ?? ''
  const requesterEmail = payload?.requesterEmail?.trim().toLowerCase() ?? ''
  const requesterPhone = normalizeWhatsappVeForPolicy(payload?.requesterPhone ?? '')
  const consentAccepted = payload?.whatsappConsentAccepted === true
  const draft = payload?.draft
  const endTime = payload?.endTime?.trim() ?? null

  if (!requesterName || !requesterEmail || !requesterPhone) {
    return NextResponse.json({ error: 'missing_contact' }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(requesterEmail)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(requesterPhone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  if (!consentAccepted) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 })
  }

  if (!isDraftValid(draft) || !isValidTime(endTime)) {
    return NextResponse.json({ error: 'invalid_draft' }, { status: 400 })
  }

  if (!isSecureLinkPhoneAllowedByEnv(requesterPhone)) {
    return NextResponse.json(
      {
        error: 'secure_link_not_allowed_for_phone',
        fallback: 'manual_code',
      },
      { status: 403 },
    )
  }

  console.info('[secure_link_requested]', {
    event: 'secure_link_requested',
    hasPhone: true,
    phoneMasked: `${requesterPhone.slice(0, 4)}***${requesterPhone.slice(-2)}`,
    variantSlug: draft.data.selectedItems[0]?.variantSlug ?? null,
  })

  const config = getWhatsappVerificationConfigFromEnv()
  const requestRecord = await createSecureLinkRequest({
    phoneE164: requesterPhone,
    requesterName,
    requesterEmail,
    draft,
    ttlMinutes: config.secureLinkTtlMinutes,
  })

  const result = await sendBookingWhatsapp(
    'whatsapp_secure_link',
    {
      phone: requesterPhone,
      name: requesterName,
    },
    {
      publicCode: `DRAFT-${requestRecord.secureLinkId.slice(0, 8).toUpperCase()}`,
      serviceName: draft.data.selectedItems[0]?.serviceSlug ?? null,
      variantName: draft.data.selectedItems[0]?.variantSlug ?? null,
      secureLinkUrl: requestRecord.url,
      secureLinkTtlMinutes: config.secureLinkTtlMinutes,
    },
    { allowManualFallback: false },
  )

  await logSecureLinkSentResult({
    secureLinkId: requestRecord.secureLinkId,
    ok: result.sent,
    reason: result.reason ?? null,
    provider: result.provider,
    messageId: result.messageId ?? null,
    phoneE164: requesterPhone,
  })

  if (!result.sent) {
    console.warn('[secure_link_sent_failed]', {
      event: 'secure_link_sent_failed',
      secureLinkId: requestRecord.secureLinkId,
      provider: result.provider,
      reason: result.reason ?? 'unknown',
      messageId: result.messageId ?? null,
    })
    return NextResponse.json({ error: 'send_failed', fallback: 'manual_code' }, { status: 503 })
  }

  console.info('[secure_link_sent_ok]', {
    event: 'secure_link_sent_ok',
    secureLinkId: requestRecord.secureLinkId,
    provider: result.provider,
    messageId: result.messageId ?? null,
  })

  return NextResponse.json({
    ok: true,
    secureLinkId: requestRecord.secureLinkId,
    expiresAt: requestRecord.expiresAt,
  })
}
