import { trackReferralClick } from '@/actions/marketplace/referrals'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const REFERRAL_COOKIE = 'mp_ref'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  let code = ''
  try {
    const p = await params
    code = p.code || ''
  } catch {
    return redirect('/marketplace')
  }

  if (!code) return redirect('/marketplace')

  try {
    const cookieStore = cookies()
    cookieStore.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    const result = await trackReferralClick(code)
    if (result.listingId) {
      return redirect(`/marketplace/${result.listingId}?ref=${code}`)
    }
    return redirect('/marketplace')
  } catch {
    return redirect('/marketplace')
  }
}
