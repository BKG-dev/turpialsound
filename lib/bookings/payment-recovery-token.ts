import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export const PAYMENT_RECOVERY_TOKEN_PURPOSE = 'payment_recovery'

interface PaymentRecoveryTokenPayload {
  v: 1
  purpose: typeof PAYMENT_RECOVERY_TOKEN_PURPOSE
  bookingPublicCode: string
  iat: number
  exp: number
}

export type PaymentRecoveryTokenError =
  | 'misconfigured_secret'
  | 'invalid_token'
  | 'expired_token'
  | 'code_mismatch'

export type PaymentRecoveryTokenValidationResult =
  | {
      ok: true
      payload: PaymentRecoveryTokenPayload
    }
  | {
      ok: false
      error: PaymentRecoveryTokenError
    }

function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase()
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

function getPaymentRecoverySecret(required: boolean): string | null {
  const secret = process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET?.trim() ?? ''
  if (!secret && required) {
    return null
  }

  return secret || null
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payloadBase64Url).digest())
}

export function buildPaymentRecoveryToken(input: {
  bookingPublicCode: string
  expiresAt: Date
  now?: Date
}): string | null {
  const secret = getPaymentRecoverySecret(false)
  if (!secret) return null

  const bookingPublicCode = normalizePublicCode(input.bookingPublicCode)
  if (!bookingPublicCode) return null

  const nowEpochSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  const expEpochSeconds = Math.floor(input.expiresAt.getTime() / 1000)
  if (!Number.isFinite(expEpochSeconds) || expEpochSeconds <= nowEpochSeconds) {
    return null
  }

  const payload: PaymentRecoveryTokenPayload = {
    v: 1,
    purpose: PAYMENT_RECOVERY_TOKEN_PURPOSE,
    bookingPublicCode,
    iat: nowEpochSeconds,
    exp: expEpochSeconds,
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signatureBase64Url = signPayload(payloadBase64Url, secret)
  return `${payloadBase64Url}.${signatureBase64Url}`
}

export function validatePaymentRecoveryToken(
  token: string,
  expectedPublicCode: string,
  now: Date = new Date(),
): PaymentRecoveryTokenValidationResult {
  const secret = getPaymentRecoverySecret(true)
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

  const payload = payloadCandidate as Partial<PaymentRecoveryTokenPayload>
  if (
    payload.v !== 1 ||
    payload.purpose !== PAYMENT_RECOVERY_TOKEN_PURPOSE ||
    typeof payload.bookingPublicCode !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const normalizedCode = normalizePublicCode(payload.bookingPublicCode)
  const normalizedExpectedCode = normalizePublicCode(expectedPublicCode)
  if (!normalizedCode || !normalizedExpectedCode) {
    return { ok: false, error: 'invalid_token' }
  }

  if (normalizedCode !== normalizedExpectedCode) {
    return { ok: false, error: 'code_mismatch' }
  }

  const nowEpochSeconds = Math.floor(now.getTime() / 1000)
  if (payload.exp <= nowEpochSeconds) {
    return { ok: false, error: 'expired_token' }
  }

  return {
    ok: true,
    payload: {
      v: 1,
      purpose: PAYMENT_RECOVERY_TOKEN_PURPOSE,
      bookingPublicCode: normalizedCode,
      iat: payload.iat,
      exp: payload.exp,
    },
  }
}

export function buildPaymentRecoveryPath(input: {
  publicCode: string
  token: string
}): string {
  const publicCode = normalizePublicCode(input.publicCode)
  const token = input.token.trim()
  return `/reservas/pago?code=${encodeURIComponent(publicCode)}&token=${encodeURIComponent(token)}`
}
