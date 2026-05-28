import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOperationalStatus, getPaymentDeadline } from '@/lib/bookings/operations'
import { resolveReferenceRate } from '@/lib/bookings/reference-rate'
import { getPrimaryPaymentMethod } from '@/lib/bookings/payment-settings'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

interface PaymentRecoveryPayload {
  code?: string
  token?: string
}

function formatCaracasDateYmd(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function formatCaracasTimeHm(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value)
  const hours = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minutes = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hours}:${minutes}`
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatAmountLabel(amount: number, currency: 'USD' | 'VES'): string {
  if (currency === 'USD') {
    return `USD ${amount.toFixed(2)}`
  }

  return `Bs. ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as PaymentRecoveryPayload | null
  const code = payload?.code?.trim().toUpperCase() ?? ''
  const token = payload?.token?.trim() ?? ''

  if (!code || !token) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
  }

  const tokenValidation = validatePaymentRecoveryToken(token, code)
  if (!tokenValidation.ok) {
    return NextResponse.json({
      ok: true,
      state: 'invalid_link',
      reason: tokenValidation.error,
    })
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { publicCode: code },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: {
          serviceVariant: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  })

  if (!booking) {
    return NextResponse.json({ ok: true, state: 'not_found' })
  }

  const operationalStatus = getOperationalStatus(booking)
  if (operationalStatus === 'payment_reported') {
    return NextResponse.json({ ok: true, state: 'payment_reported', publicCode: booking.publicCode })
  }

  if (operationalStatus === 'confirmed') {
    return NextResponse.json({ ok: true, state: 'confirmed', publicCode: booking.publicCode })
  }

  if (operationalStatus === 'expired') {
    return NextResponse.json({ ok: true, state: 'expired', publicCode: booking.publicCode })
  }

  if (operationalStatus === 'cancelled') {
    return NextResponse.json({ ok: true, state: 'cancelled', publicCode: booking.publicCode })
  }

  if (operationalStatus !== 'pending_payment') {
    return NextResponse.json({
      ok: true,
      state: 'unavailable',
      publicCode: booking.publicCode,
      operationalStatus,
    })
  }

  const primaryMethod = getPrimaryPaymentMethod()
  const primaryItem = booking.items[0]
  const estimatedTotalUsd = parseOptionalAmount(booking.estimatedTotal) ?? 0
  let referenceRate = 0
  let amountBs = 0

  try {
    const rate = await resolveReferenceRate()
    referenceRate = rate.rate
    amountBs = estimatedTotalUsd * referenceRate
  } catch {
    referenceRate = 0
    amountBs = 0
  }

  return NextResponse.json({
    ok: true,
    state: 'pending_payment',
    session: {
      version: 1,
      publicCode: booking.publicCode,
      operationalStatus: 'pending_payment',
      serviceSlug: primaryItem?.serviceVariant.service.slug ?? null,
      variantSlug: primaryItem?.serviceVariant.slug ?? null,
      serviceName: primaryItem?.serviceVariant.service.name ?? 'Servicio',
      variantName: primaryItem?.serviceVariant.name ?? 'Modalidad',
      eventDate: formatCaracasDateYmd(booking.eventDate),
      startTime: formatCaracasTimeHm(booking.eventDate),
      durationMinutes: booking.eventEndDate
        ? Math.max(0, Math.round((booking.eventEndDate.getTime() - booking.eventDate.getTime()) / 60000))
        : null,
      paymentDeadlineIso: getPaymentDeadline(booking.createdAt).toISOString(),
      selectedPaymentMethodSlug: primaryMethod.slug,
      paymentReference: booking.publicCode,
      amountUsd: estimatedTotalUsd,
      amountBs,
      amountUsdLabel: formatAmountLabel(estimatedTotalUsd, 'USD'),
      amountBsLabel: formatAmountLabel(amountBs, 'VES'),
      bcvRate: referenceRate,
    },
  })
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
