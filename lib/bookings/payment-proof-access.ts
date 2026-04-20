import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export const PAYMENT_PROOF_ACCESS_TTL_SECONDS = 48 * 60 * 60

interface PaymentProofAccessTokenPayload {
  v: 1
  paymentProofId: string
  bookingPublicCode: string
  iat: number
  exp: number
}

export type PaymentProofAccessTokenError =
  | 'misconfigured_secret'
  | 'invalid_token'
  | 'expired_token'

export type PaymentProofAccessTokenValidationResult =
  | {
      ok: true
      payload: PaymentProofAccessTokenPayload
    }
  | {
      ok: false
      error: PaymentProofAccessTokenError
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

function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase()
}

function getPaymentProofAccessSecret(required: boolean): string | null {
  const secret = process.env.PAYMENT_PROOF_ACCESS_SECRET?.trim() ?? ''
  if (!secret) {
    if (required) {
      return null
    }
    return null
  }

  return secret
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payloadBase64Url).digest())
}

export function buildPaymentProofAccessToken(input: {
  paymentProofId: string
  bookingPublicCode: string
  ttlSeconds?: number
  now?: Date
}): string | null {
  const secret = getPaymentProofAccessSecret(false)
  if (!secret) {
    return null
  }

  const paymentProofId = input.paymentProofId.trim()
  const bookingPublicCode = normalizePublicCode(input.bookingPublicCode)
  if (!paymentProofId || !bookingPublicCode) {
    return null
  }

  const nowEpochSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  const ttlSeconds =
    typeof input.ttlSeconds === 'number' && Number.isFinite(input.ttlSeconds)
      ? Math.max(60, Math.floor(input.ttlSeconds))
      : PAYMENT_PROOF_ACCESS_TTL_SECONDS

  const payload: PaymentProofAccessTokenPayload = {
    v: 1,
    paymentProofId,
    bookingPublicCode,
    iat: nowEpochSeconds,
    exp: nowEpochSeconds + ttlSeconds,
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signatureBase64Url = signPayload(payloadBase64Url, secret)
  return `${payloadBase64Url}.${signatureBase64Url}`
}

export function validatePaymentProofAccessToken(
  token: string,
  now: Date = new Date(),
): PaymentProofAccessTokenValidationResult {
  const secret = getPaymentProofAccessSecret(true)
  if (!secret) {
    return { ok: false, error: 'misconfigured_secret' }
  }

  const normalizedToken = token.trim()
  const [payloadPart, signaturePart, unexpectedPart] = normalizedToken.split('.')

  if (!payloadPart || !signaturePart || unexpectedPart) {
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

  const payload = payloadCandidate as Partial<PaymentProofAccessTokenPayload>
  if (
    payload.v !== 1 ||
    typeof payload.paymentProofId !== 'string' ||
    typeof payload.bookingPublicCode !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  if (
    payload.paymentProofId.trim().length === 0 ||
    normalizePublicCode(payload.bookingPublicCode).length === 0
  ) {
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
      paymentProofId: payload.paymentProofId.trim(),
      bookingPublicCode: normalizePublicCode(payload.bookingPublicCode),
      iat: payload.iat,
      exp: payload.exp,
    },
  }
}
