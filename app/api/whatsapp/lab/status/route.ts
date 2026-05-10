import { NextRequest, NextResponse } from 'next/server'
import { getLabChallengeStatus } from '@/lib/whatsapp/lab-token-store'

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

export async function GET(request: NextRequest) {
  if (!isLabEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!hasValidLabSecret(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const challengeId = request.nextUrl.searchParams.get('challengeId')?.trim() ?? ''
  if (!challengeId) {
    return NextResponse.json({ error: 'challenge_id_required' }, { status: 400 })
  }

  const statusView = await getLabChallengeStatus(challengeId)
  return NextResponse.json(statusView)
}
