import { NextRequest, NextResponse } from 'next/server'
import { createLabChallenge } from '@/lib/whatsapp/lab-token-store'

function isLabEnabled(): boolean {
  return process.env.WHATSAPP_LAB_ENABLED?.trim().toLowerCase() === 'true'
}

export async function POST(request: NextRequest) {
  if (!isLabEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
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
    })
  } catch {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }
}
