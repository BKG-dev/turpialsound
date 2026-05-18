import { trackReferralClick } from '@/actions/marketplace/referrals'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const REFERRAL_COOKIE = 'mp_ref'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const result = await trackReferralClick(code)

  const cookieStore = cookies()
  cookieStore.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  if (result.listingId) {
    return redirect(`/marketplace/${result.listingId}?ref=${code}`)
  }
  return redirect('/marketplace')
}
