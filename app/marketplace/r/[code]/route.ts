import { NextResponse } from 'next/server'
import { trackReferralClick } from '@/actions/marketplace/referrals'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const result = await trackReferralClick(code)
  if (result.listingId) {
    return redirect(`/marketplace/${result.listingId}?ref=${code}`)
  }
  return redirect('/marketplace')
}
