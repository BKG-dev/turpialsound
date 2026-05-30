import { trackReferralClick } from '@/actions/marketplace/referrals'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.json({ ok: false }, { status: 400 })
  await trackReferralClick(code)
  return NextResponse.json({ ok: true })
}
