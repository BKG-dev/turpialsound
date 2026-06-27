import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getOperationalStatus, getPaymentDeadline } from '@/lib/bookings/operations'
import { resolveReferenceRate } from '@/lib/bookings/reference-rate'
import { getEnabledPaymentMethods, getPrimaryPaymentMethod } from '@/lib/bookings/payment-settings'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
  buildCustomBundlePaymentRecoveryCookieClearOptions,
  buildCustomBundlePaymentRecoveryCookieSetOptions,
} from '@/lib/bookings/custom-bundle-payment-recovery-cookie'
import { isPreviewDeployment } from '@/lib/bookings/environment'
import { isCustomBundleBookingCandidate } from '@/lib/bookings/custom-bundle-booking-identity'
import {
  mapBookingPaymentMethodToPublicUiMethod,
  resolveCustomBundlePaymentUiMode,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-contract'

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

function withNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  return response
}

function clearRecoveryCookie(response: NextResponse): void {
  response.cookies.set(
    CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
    '',
    buildCustomBundlePaymentRecoveryCookieClearOptions(),
  )
}

function setRecoveryCookie(response: NextResponse, token: string, now: Date, expiresAt: Date): void {
  const options = buildCustomBundlePaymentRecoveryCookieSetOptions({ now, expiresAt })
  if (!options) {
    clearRecoveryCookie(response)
    return
  }

  response.cookies.set(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME, token, options)
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const now = new Date()
  const payload = (await request.json().catch(() => null)) as PaymentRecoveryPayload | null
  const code = payload?.code?.trim().toUpperCase() ?? ''
  const bodyToken = payload?.token?.trim() ?? ''
  const cookieToken = cookies().get(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME)?.value?.trim() ?? ''
  const token = bodyToken || cookieToken

  if (!code || !token) {
    const response = NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  const tokenValidation = validatePaymentRecoveryToken(token, code, now)
  if (!tokenValidation.ok) {
    const response = NextResponse.json({
      ok: true,
      state: 'invalid_link',
      reason: tokenValidation.error,
    })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
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
    const response = NextResponse.json({ ok: true, state: 'not_found' })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  const operationalStatus = getOperationalStatus(booking)
  if (operationalStatus === 'payment_reported') {
    const response = NextResponse.json({ ok: true, state: 'payment_reported', publicCode: booking.publicCode })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  if (operationalStatus === 'confirmed') {
    const response = NextResponse.json({ ok: true, state: 'confirmed', publicCode: booking.publicCode })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  if (operationalStatus === 'expired') {
    const response = NextResponse.json({ ok: true, state: 'expired', publicCode: booking.publicCode })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  if (operationalStatus === 'cancelled') {
    const response = NextResponse.json({ ok: true, state: 'cancelled', publicCode: booking.publicCode })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  if (operationalStatus !== 'pending_payment') {
    const response = NextResponse.json({
      ok: true,
      state: 'unavailable',
      publicCode: booking.publicCode,
      operationalStatus,
    })
    clearRecoveryCookie(response)
    return withNoStoreHeaders(response)
  }

  const primaryMethod = getPrimaryPaymentMethod()
  const primaryItem = booking.items[0]
  const isCustomBundleCandidate = isCustomBundleBookingCandidate({
    eventTitle: booking.eventTitle,
  })
  const paymentUiMode = resolveCustomBundlePaymentUiMode({
    isPreview: isPreviewDeployment(),
    isCustomBundleBookingCandidate: isCustomBundleCandidate,
  })
  const paymentMethods = getEnabledPaymentMethods().map(mapBookingPaymentMethodToPublicUiMethod)
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

  const response = NextResponse.json({
    ok: true,
    state: 'pending_payment',
    session: {
      version: 2,
      publicCode: booking.publicCode,
      operationalStatus: 'pending_payment',
      paymentUiMode,
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
      paymentMethods,
    },
  })

  setRecoveryCookie(response, token, now, new Date(tokenValidation.payload.exp * 1000))
  return withNoStoreHeaders(response)
}

export async function GET() {
  const response = NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  )
  return withNoStoreHeaders(response)
}
