import 'server-only'

import { buildPaymentProofAccessToken } from '@/lib/bookings/payment-proof-access'
import { buildPaymentReviewAccessToken } from '@/lib/bookings/payment-review-access'

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null

  // Tolerate misconfigured values like:
  // "BOOKINGS_APP_BASE_URL=https://www.turpialsound.com"
  const normalizedRaw = raw.replace(/^[A-Z0-9_]+=/i, '').trim()
  if (!normalizedRaw) return null

  if (normalizedRaw.startsWith('http://') || normalizedRaw.startsWith('https://')) {
    return normalizedRaw.replace(/\/+$/, '')
  }

  return `https://${normalizedRaw.replace(/\/+$/, '')}`
}

export function getBookingsAppBaseUrl(): string | null {
  return (
    normalizeBaseUrl(process.env.BOOKINGS_APP_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL)
  )
}

export function buildAdminPaymentProofUrl(
  publicCode: string,
  paymentProofId?: string | null,
): string | null {
  const baseUrl = getBookingsAppBaseUrl()
  if (!baseUrl) return null

  const normalizedCode = publicCode.trim().toUpperCase()
  if (!normalizedCode) return null

  const normalizedPaymentProofId = paymentProofId?.trim() ?? ''
  if (!normalizedPaymentProofId) return null

  const token = buildPaymentReviewAccessToken({
    paymentProofId: normalizedPaymentProofId,
    bookingPublicCode: normalizedCode,
  })
  if (!token) return null

  return `${baseUrl}/ops/payment-review?token=${encodeURIComponent(token)}`
}

export function buildPaymentProofViewerUrl(
  publicCode: string,
  paymentProofId: string,
): string | null {
  const baseUrl = getBookingsAppBaseUrl()
  if (!baseUrl) return null

  const normalizedCode = publicCode.trim().toUpperCase()
  const normalizedPaymentProofId = paymentProofId.trim()
  if (!normalizedCode || !normalizedPaymentProofId) return null

  const token = buildPaymentProofAccessToken({
    paymentProofId: normalizedPaymentProofId,
    bookingPublicCode: normalizedCode,
  })
  if (!token) return null

  return `${baseUrl}/payment-proofs/view?token=${encodeURIComponent(token)}`
}
