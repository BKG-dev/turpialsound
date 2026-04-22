import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const PAYMENT_REVIEW_SCOPE = 'ops_payment_review' as const
export const PAYMENT_REVIEW_TOKEN_TTL_SECONDS = 48 * 60 * 60

interface PaymentReviewAccessTokenPayload {
  v: 1
  scope: typeof PAYMENT_REVIEW_SCOPE
  bookingPublicCode: string
  paymentProofId: string
  iat: number
  exp: number
  jti: string
}

export type PaymentReviewTokenError =
  | 'misconfigured_secret'
  | 'invalid_token'
  | 'expired_token'

export type PaymentReviewTokenValidationResult =
  | {
      ok: true
      payload: PaymentReviewAccessTokenPayload
    }
  | {
      ok: false
      error: PaymentReviewTokenError
    }

function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeOpaqueId(value: string): string {
  return value.trim()
}

function toBase64Url(value: Buffer | string): string {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value: string): Buffer | null {
  if (!value) return null
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  try {
    return Buffer.from(padded, 'base64')
  } catch {
    return null
  }
}

function getPaymentReviewAccessSecret(required: boolean): string | null {
  const secret = process.env.PAYMENT_PROOF_ACCESS_SECRET?.trim() ?? ''
  if (!secret && required) return null
  return secret || null
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payloadBase64Url).digest())
}

export function buildPaymentReviewAccessToken(input: {
  bookingPublicCode: string
  paymentProofId: string
  ttlSeconds?: number
  now?: Date
}): string | null {
  const secret = getPaymentReviewAccessSecret(false)
  if (!secret) return null

  const bookingPublicCode = normalizePublicCode(input.bookingPublicCode)
  const paymentProofId = normalizeOpaqueId(input.paymentProofId)
  if (!bookingPublicCode || !paymentProofId) return null

  const nowEpochSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  const ttlSeconds =
    typeof input.ttlSeconds === 'number' && Number.isFinite(input.ttlSeconds)
      ? Math.max(60, Math.floor(input.ttlSeconds))
      : PAYMENT_REVIEW_TOKEN_TTL_SECONDS

  const payload: PaymentReviewAccessTokenPayload = {
    v: 1,
    scope: PAYMENT_REVIEW_SCOPE,
    bookingPublicCode,
    paymentProofId,
    iat: nowEpochSeconds,
    exp: nowEpochSeconds + ttlSeconds,
    jti: randomUUID(),
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadBase64Url, secret)
  return `${payloadBase64Url}.${signature}`
}

export function validatePaymentReviewAccessToken(
  token: string,
  now: Date = new Date(),
): PaymentReviewTokenValidationResult {
  const secret = getPaymentReviewAccessSecret(true)
  if (!secret) {
    return { ok: false, error: 'misconfigured_secret' }
  }

  const normalizedToken = token.trim()
  const [payloadPart, signaturePart, extraPart] = normalizedToken.split('.')
  if (!payloadPart || !signaturePart || extraPart) {
    return { ok: false, error: 'invalid_token' }
  }

  const expectedSignature = signPayload(payloadPart, secret)
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8')
  const signatureBuffer = Buffer.from(signaturePart, 'utf8')

  if (
    expectedSignatureBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedSignatureBuffer, signatureBuffer)
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const payloadBuffer = fromBase64Url(payloadPart)
  if (!payloadBuffer) {
    return { ok: false, error: 'invalid_token' }
  }

  let payloadCandidate: unknown
  try {
    payloadCandidate = JSON.parse(payloadBuffer.toString('utf8'))
  } catch {
    return { ok: false, error: 'invalid_token' }
  }

  if (!payloadCandidate || typeof payloadCandidate !== 'object') {
    return { ok: false, error: 'invalid_token' }
  }

  const payload = payloadCandidate as Partial<PaymentReviewAccessTokenPayload>
  if (
    payload.v !== 1 ||
    payload.scope !== PAYMENT_REVIEW_SCOPE ||
    typeof payload.bookingPublicCode !== 'string' ||
    typeof payload.paymentProofId !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number' ||
    typeof payload.jti !== 'string'
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const bookingPublicCode = normalizePublicCode(payload.bookingPublicCode)
  const paymentProofId = normalizeOpaqueId(payload.paymentProofId)
  const jti = normalizeOpaqueId(payload.jti)
  if (!bookingPublicCode || !paymentProofId || !jti) {
    return { ok: false, error: 'invalid_token' }
  }

  const nowEpochSeconds = Math.floor(now.getTime() / 1000)
  if (payload.exp <= nowEpochSeconds) {
    return { ok: false, error: 'expired_token' }
  }

  return {
    ok: true,
    payload: {
      v: 1,
      scope: PAYMENT_REVIEW_SCOPE,
      bookingPublicCode,
      paymentProofId,
      iat: payload.iat,
      exp: payload.exp,
      jti,
    },
  }
}
