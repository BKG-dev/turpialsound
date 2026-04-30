import { NextResponse, type NextRequest } from 'next/server'
import { expireOverduePendingPayments } from '@/lib/bookings/operations'

const CRON_SECRET_ENV = 'BOOKINGS_EXPIRE_CRON_SECRET'

export const dynamic = 'force-dynamic'

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env[CRON_SECRET_ENV]?.trim()
  if (!secret) {
    return false
  }

  const authorization = request.headers.get('authorization')?.trim()
  return authorization === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await expireOverduePendingPayments()
  return NextResponse.json({ ok: true, result })
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
