import { NextRequest, NextResponse } from 'next/server'
import { consumeSecureLinkToken } from '@/lib/whatsapp/secure-link-store'
import { getWhatsappVerificationConfigFromEnv } from '@/lib/bookings/whatsapp-verify-config'

interface ConsumeSecureLinkPayload {
  token?: string
}

export async function POST(request: NextRequest) {
  const config = getWhatsappVerificationConfigFromEnv()
  if (!config.secureLinkEnabled) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const payload = (await request.json().catch(() => null)) as ConsumeSecureLinkPayload | null
  const token = payload?.token?.trim() ?? ''
  if (!token) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 })
  }

  const result = await consumeSecureLinkToken(token)
  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'invalid_or_not_found' }, { status: 404 })
  }

  if (result.status === 'expired') {
    return NextResponse.json(
      {
        error: 'expired',
        expiresAt: result.expiresAt,
      },
      { status: 410 },
    )
  }

  if (result.status !== 'verified' || !result.draft || !result.verifiedAt || !result.phoneE164) {
    return NextResponse.json({ error: 'pending' }, { status: 409 })
  }

  console.info('[secure_link_verified]', {
    event: 'secure_link_verified',
    secureLinkId: result.secureLinkId,
    hasPhone: Boolean(result.phoneE164),
  })

  return NextResponse.json({
    ok: true,
    secureLinkId: result.secureLinkId,
    expiresAt: result.expiresAt,
    verifiedAt: result.verifiedAt,
    phoneE164: result.phoneE164,
    draft: result.draft,
  })
}
