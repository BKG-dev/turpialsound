import { NextRequest, NextResponse } from 'next/server'
import { createLabChallenge } from '@/lib/whatsapp/lab-token-store'

function isLabEnabled(): boolean {
  return process.env.WHATSAPP_LAB_ENABLED?.trim().toLowerCase() === 'true'
}

function hasValidLabSecret(request: NextRequest): boolean {
  const expected = process.env.WHATSAPP_LAB_SECRET?.trim() ?? ''
  if (!expected) return false
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim() ?? ''
  const headerSecret = request.headers.get('x-lab-secret')?.trim() ?? ''
  return querySecret === expected || headerSecret === expected
}

export async function POST(request: NextRequest) {
  if (!isLabEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!hasValidLabSecret(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const payload = (await request.json().catch(() => null)) as { phone?: string } | null
  const phone = payload?.phone?.trim() ?? ''
  if (!phone) {
    return NextResponse.json({ error: 'phone_required' }, { status: 400 })
  }

  try {
    const challenge = await createLabChallenge(phone)
    return NextResponse.json({
      challengeId: challenge.challengeId,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      whatsappNumberLabel:
        process.env.WHATSAPP_LAB_INBOUND_NUMBER_LABEL?.trim() ||
        'WhatsApp conectado de Turpial Sound',
    })
  } catch {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }
}
