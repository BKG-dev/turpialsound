import { createHmac, timingSafeEqual } from 'node:crypto'

export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_VERSION =
  'custom_bundle_preview_handoff_v1' as const

export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_PURPOSE =
  'custom_bundle_preview_recovery_session' as const

export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_TTL_SECONDS = 3600 as const

export interface CustomBundlePreviewHandoffTokenPayloadInput {
  publicCode: string
  requestFingerprint: string
  eventDate: string
  startTime: string
  durationMinutes: number
  estimatedTotalUsdCents: number
  holdAcquiredAt: number
  holdExpiresAt: number
}

export interface CustomBundlePreviewHandoffTokenPayload
  extends CustomBundlePreviewHandoffTokenPayloadInput {
  v: 1
  purpose: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_PURPOSE
  iat: number
  exp: number
}

export type CustomBundlePreviewHandoffTokenError =
  | 'misconfigured_secret'
  | 'invalid_token'
  | 'expired_token'
  | 'code_mismatch'

export type CustomBundlePreviewHandoffTokenValidationResult =
  | {
      ok: true
      payload: CustomBundlePreviewHandoffTokenPayload
    }
  | {
      ok: false
      error: CustomBundlePreviewHandoffTokenError
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

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidPublicCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function isValidRequestFingerprint(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value)
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day))

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  )
}

function isValidPayloadDate(input: CustomBundlePreviewHandoffTokenPayloadInput): boolean {
  return isValidIsoDate(input.eventDate) && isValidTime(input.startTime)
}

function isValidPayloadNumbers(input: CustomBundlePreviewHandoffTokenPayloadInput): boolean {
  return (
    Number.isInteger(input.durationMinutes) &&
    input.durationMinutes > 0 &&
    Number.isInteger(input.estimatedTotalUsdCents) &&
    input.estimatedTotalUsdCents >= 0 &&
    Number.isInteger(input.holdAcquiredAt) &&
    Number.isInteger(input.holdExpiresAt) &&
    input.holdExpiresAt > input.holdAcquiredAt
  )
}

function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeRequestFingerprint(value: string): string {
  return value.trim().toLowerCase()
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payloadBase64Url).digest())
}

function getTokenParts(token: string): { payloadPart: string; signaturePart: string } | null {
  const [payloadPart, signaturePart, unexpectedPart] = token.split('.')
  if (!payloadPart || !signaturePart || unexpectedPart) {
    return null
  }

  return { payloadPart, signaturePart }
}

function validateTokenPayloadShape(
  payloadCandidate: unknown,
): payloadCandidate is CustomBundlePreviewHandoffTokenPayload {
  if (!payloadCandidate || typeof payloadCandidate !== 'object') {
    return false
  }

  const payload = payloadCandidate as Partial<CustomBundlePreviewHandoffTokenPayload>
  return (
    payload.v === 1 &&
    payload.purpose === CUSTOM_BUNDLE_PREVIEW_HANDOFF_PURPOSE &&
    typeof payload.publicCode === 'string' &&
    typeof payload.requestFingerprint === 'string' &&
    typeof payload.eventDate === 'string' &&
    typeof payload.startTime === 'string' &&
    typeof payload.durationMinutes === 'number' &&
    typeof payload.estimatedTotalUsdCents === 'number' &&
    typeof payload.holdAcquiredAt === 'number' &&
    typeof payload.holdExpiresAt === 'number' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number'
  )
}

export function buildCustomBundlePreviewHandoffTokenCore(input: {
  secret: string | null
  payload: CustomBundlePreviewHandoffTokenPayloadInput
  expiresAt: Date
  now: Date
}): string | null {
  if (!input.secret) return null
  if (!isValidDate(input.now) || !isValidDate(input.expiresAt)) return null

  const nowEpochSeconds = Math.floor(input.now.getTime() / 1000)
  const expiresEpochSeconds = Math.floor(input.expiresAt.getTime() / 1000)
  if (!Number.isInteger(nowEpochSeconds) || !Number.isInteger(expiresEpochSeconds)) return null
  if (expiresEpochSeconds <= nowEpochSeconds) return null

  const publicCode = normalizePublicCode(input.payload.publicCode)
  const requestFingerprint = normalizeRequestFingerprint(input.payload.requestFingerprint)
  const normalizedPayload: CustomBundlePreviewHandoffTokenPayloadInput = {
    publicCode,
    requestFingerprint,
    eventDate: input.payload.eventDate,
    startTime: input.payload.startTime,
    durationMinutes: Math.trunc(input.payload.durationMinutes),
    estimatedTotalUsdCents: Math.trunc(input.payload.estimatedTotalUsdCents),
    holdAcquiredAt: Math.trunc(input.payload.holdAcquiredAt),
    holdExpiresAt: Math.trunc(input.payload.holdExpiresAt),
  }

  if (
    !isValidPublicCode(publicCode) ||
    !isValidRequestFingerprint(requestFingerprint) ||
    !isValidPayloadDate(normalizedPayload) ||
    !isValidPayloadNumbers(normalizedPayload) ||
    expiresEpochSeconds > normalizedPayload.holdExpiresAt
  ) {
    return null
  }

  const payload: CustomBundlePreviewHandoffTokenPayload = {
    v: 1,
    purpose: CUSTOM_BUNDLE_PREVIEW_HANDOFF_PURPOSE,
    publicCode,
    requestFingerprint,
    eventDate: normalizedPayload.eventDate,
    startTime: normalizedPayload.startTime,
    durationMinutes: normalizedPayload.durationMinutes,
    estimatedTotalUsdCents: normalizedPayload.estimatedTotalUsdCents,
    holdAcquiredAt: normalizedPayload.holdAcquiredAt,
    holdExpiresAt: normalizedPayload.holdExpiresAt,
    iat: nowEpochSeconds,
    exp: expiresEpochSeconds,
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signatureBase64Url = signPayload(payloadBase64Url, input.secret)
  return `${payloadBase64Url}.${signatureBase64Url}`
}

export function validateCustomBundlePreviewHandoffTokenCore(input: {
  secret: string | null
  token: string
  expectedPublicCode: string
  now: Date
}): CustomBundlePreviewHandoffTokenValidationResult {
  if (!input.secret) {
    return { ok: false, error: 'misconfigured_secret' }
  }

  if (!isValidDate(input.now)) {
    return { ok: false, error: 'invalid_token' }
  }

  const normalizedToken = input.token.trim()
  const parts = getTokenParts(normalizedToken)
  if (!parts) {
    return { ok: false, error: 'invalid_token' }
  }

  const expectedSignature = signPayload(parts.payloadPart, input.secret)
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8')
  const signatureBuffer = Buffer.from(parts.signaturePart, 'utf8')
  if (
    expectedSignatureBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedSignatureBuffer, signatureBuffer)
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const payloadBuffer = fromBase64Url(parts.payloadPart)
  if (!payloadBuffer) {
    return { ok: false, error: 'invalid_token' }
  }

  let payloadCandidate: unknown
  try {
    payloadCandidate = JSON.parse(payloadBuffer.toString('utf8'))
  } catch {
    return { ok: false, error: 'invalid_token' }
  }

  if (!validateTokenPayloadShape(payloadCandidate)) {
    return { ok: false, error: 'invalid_token' }
  }

  const payload = payloadCandidate
  const publicCode = normalizePublicCode(payload.publicCode)
  const expectedPublicCode = normalizePublicCode(input.expectedPublicCode)
  const requestFingerprint = normalizeRequestFingerprint(payload.requestFingerprint)
  const nowEpochSeconds = Math.floor(input.now.getTime() / 1000)

  if (
    !isValidPublicCode(publicCode) ||
    !isValidPublicCode(expectedPublicCode) ||
    !isValidRequestFingerprint(requestFingerprint) ||
    !isValidIsoDate(payload.eventDate) ||
    !isValidTime(payload.startTime) ||
    !Number.isInteger(payload.durationMinutes) ||
    payload.durationMinutes <= 0 ||
    !Number.isInteger(payload.estimatedTotalUsdCents) ||
    payload.estimatedTotalUsdCents < 0 ||
    !Number.isInteger(payload.holdAcquiredAt) ||
    !Number.isInteger(payload.holdExpiresAt) ||
    payload.holdExpiresAt <= payload.holdAcquiredAt
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  if (publicCode !== expectedPublicCode) {
    return { ok: false, error: 'code_mismatch' }
  }

  if (payload.exp <= nowEpochSeconds) {
    return { ok: false, error: 'expired_token' }
  }

  if (payload.exp > payload.holdExpiresAt) {
    return { ok: false, error: 'invalid_token' }
  }

  return {
    ok: true,
    payload: {
      v: 1,
      purpose: CUSTOM_BUNDLE_PREVIEW_HANDOFF_PURPOSE,
      publicCode,
      requestFingerprint,
      eventDate: payload.eventDate,
      startTime: payload.startTime,
      durationMinutes: payload.durationMinutes,
      estimatedTotalUsdCents: payload.estimatedTotalUsdCents,
      holdAcquiredAt: payload.holdAcquiredAt,
      holdExpiresAt: payload.holdExpiresAt,
      iat: payload.iat,
      exp: payload.exp,
    },
  }
}
