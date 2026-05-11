import { NextRequest, NextResponse } from 'next/server'
import { getLabChallengeStatus } from '@/lib/whatsapp/lab-token-store'

function isLabEnabled(): boolean {
  return process.env.WHATSAPP_LAB_ENABLED?.trim().toLowerCase() === 'true'
}

export async function GET(request: NextRequest) {
  if (!isLabEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const challengeId = request.nextUrl.searchParams.get('challengeId')?.trim() ?? ''
  if (!challengeId) {
    return NextResponse.json({ error: 'challenge_id_required' }, { status: 400 })
  }

  const statusView = await getLabChallengeStatus(challengeId)
  return NextResponse.json(statusView)
}
