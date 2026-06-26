import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  type CustomBundlePaymentProofAllowedMimeType,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  normalizeCustomBundlePaymentReference,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'

export const CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE =
  'custom_bundle_payment_upload_intent_v1' as const
export const CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE =
  'custom_bundle_payment_upload_receipt_v1' as const

export const CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_TTL_SECONDS = 600 as const
export const CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_TTL_SECONDS = 900 as const
export const CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES = 3_900_000 as const
export const CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES = 4_300_000 as const

type UploadTokenError = 'misconfigured_secret' | 'invalid_token' | 'expired_token'

export type CustomBundlePaymentUploadTokenValidationResult<Payload> =
  | {
      ok: true
      payload: Payload
    }
  | {
      ok: false
      error: UploadTokenError
    }

interface BasePayload {
  v: 1
  purpose:
    | typeof CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE
    | typeof CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE
  iat: number
  exp: number
}

export interface CustomBundlePaymentUploadIntentPayload extends BasePayload {
  purpose: typeof CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE
  publicCode: string
  paymentMethod: string
  paymentReference: string
  normalizedReference: string
  paymentReportIdempotencyKey: string
  originalFilename: string | null
  declaredMimeType: CustomBundlePaymentProofAllowedMimeType
  declaredSizeBytes: number
}

export interface CustomBundlePaymentUploadReceiptPayload extends BasePayload {
  purpose: typeof CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE
  publicCode: string
  paymentMethod: string
  normalizedReference: string
  paymentReportIdempotencyKey: string
  blobPathname: string
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: string
  createdByThisCall: boolean
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

function isValidPaymentMethod(value: string): boolean {
  return ['pago_movil', 'transferencia', 'binance', 'efectivo'].includes(value)
}

function isValidPaymentReportIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{16,128}$/.test(value)
}

function isValidSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value)
}

function isAllowedMimeType(value: string): value is CustomBundlePaymentProofAllowedMimeType {
  return (CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

function isSafeFilename(value: string | null): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 255) return false
  return !/[\\/\0\r\n]/.test(trimmed) && !/[\u0000-\u001f\u007f]/.test(trimmed)
}

function isSafeBlobPathname(value: string): boolean {
  return (
    /^payment-proofs\/TUR-\d{4}-\d{3,}\/[a-f0-9]{16}-[a-f0-9]{64}\.(jpg|png|webp|avif)$/.test(
      value,
    ) && !value.includes('..')
  )
}

function getUploadTokenSecret(required: boolean): string | null {
  const secret = process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET?.trim() ?? ''
  if (!secret && required) {
    return null
  }

  return secret || null
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payloadBase64Url).digest())
}

function validateCommonPayloadShape(payload: Partial<BasePayload>): boolean {
  return payload.v === 1 && typeof payload.iat === 'number' && typeof payload.exp === 'number'
}

function validateUploadIntentPayload(
  payloadCandidate: unknown,
): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadIntentPayload> {
  if (!payloadCandidate || typeof payloadCandidate !== 'object') {
    return { ok: false, error: 'invalid_token' }
  }

  const payload = payloadCandidate as Partial<CustomBundlePaymentUploadIntentPayload>
  if (
    !validateCommonPayloadShape(payload) ||
    payload.purpose !== CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE ||
    typeof payload.publicCode !== 'string' ||
    typeof payload.paymentMethod !== 'string' ||
    typeof payload.paymentReference !== 'string' ||
    typeof payload.normalizedReference !== 'string' ||
    typeof payload.paymentReportIdempotencyKey !== 'string' ||
    typeof payload.originalFilename !== 'string' &&
      payload.originalFilename !== null ||
    typeof payload.declaredMimeType !== 'string' ||
    typeof payload.declaredSizeBytes !== 'number'
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const publicCode = payload.publicCode.trim().toUpperCase()
  const paymentMethod = payload.paymentMethod.trim().toLowerCase()
  const paymentReference = payload.paymentReference.trim()
  const normalizedReference = payload.normalizedReference.trim().toUpperCase()
  const paymentReportIdempotencyKey = payload.paymentReportIdempotencyKey.trim()
  const declaredMimeType = payload.declaredMimeType.trim().toLowerCase()
  const declaredSizeBytes = payload.declaredSizeBytes

  if (
    !isValidPublicCode(publicCode) ||
    !isValidPaymentMethod(paymentMethod) ||
    paymentReference.length === 0 ||
    normalizedReference.length === 0 ||
    normalizeCustomBundlePaymentReference(paymentReference) !== normalizedReference ||
    !isValidPaymentReportIdempotencyKey(paymentReportIdempotencyKey) ||
    !isSafeFilename(payload.originalFilename) ||
    !isAllowedMimeType(declaredMimeType) ||
    !Number.isInteger(declaredSizeBytes) ||
    declaredSizeBytes <= 0 ||
    declaredSizeBytes > CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const iat = payload.iat
  const exp = payload.exp
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    return { ok: false, error: 'invalid_token' }
  }

  return {
    ok: true,
    payload: {
      v: 1,
      purpose: CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE,
      iat,
      exp,
      publicCode,
      paymentMethod,
      paymentReference,
      normalizedReference,
      paymentReportIdempotencyKey,
      originalFilename: payload.originalFilename === null ? null : payload.originalFilename.trim(),
      declaredMimeType: declaredMimeType as CustomBundlePaymentProofAllowedMimeType,
      declaredSizeBytes,
    },
  }
}

function validateUploadReceiptPayload(
  payloadCandidate: unknown,
): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadReceiptPayload> {
  if (!payloadCandidate || typeof payloadCandidate !== 'object') {
    return { ok: false, error: 'invalid_token' }
  }

  const payload = payloadCandidate as Partial<CustomBundlePaymentUploadReceiptPayload>
  if (
    !validateCommonPayloadShape(payload) ||
    payload.purpose !== CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE ||
    typeof payload.publicCode !== 'string' ||
    typeof payload.paymentMethod !== 'string' ||
    typeof payload.normalizedReference !== 'string' ||
    typeof payload.paymentReportIdempotencyKey !== 'string' ||
    typeof payload.blobPathname !== 'string' ||
    typeof payload.sha256 !== 'string' ||
    typeof payload.mimeType !== 'string' ||
    typeof payload.sizeBytes !== 'number' ||
    typeof payload.originalFilename !== 'string' && payload.originalFilename !== null ||
    typeof payload.uploadedAt !== 'string' ||
    typeof payload.createdByThisCall !== 'boolean'
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  const publicCode = payload.publicCode.trim().toUpperCase()
  const paymentMethod = payload.paymentMethod.trim().toLowerCase()
  const normalizedReference = payload.normalizedReference.trim().toUpperCase()
  const paymentReportIdempotencyKey = payload.paymentReportIdempotencyKey.trim()
  const blobPathname = payload.blobPathname.trim()
  const sha256 = payload.sha256.trim().toLowerCase()
  const mimeType = payload.mimeType.trim().toLowerCase()
  const sizeBytes = payload.sizeBytes
  const originalFilename = payload.originalFilename === null ? null : payload.originalFilename.trim()
  const uploadedAt = new Date(payload.uploadedAt)

  if (
    !isValidPublicCode(publicCode) ||
    !isValidPaymentMethod(paymentMethod) ||
    normalizedReference.length === 0 ||
    !isValidPaymentReportIdempotencyKey(paymentReportIdempotencyKey) ||
    !isSafeBlobPathname(blobPathname) ||
    !isValidSha256Hex(sha256) ||
    !isAllowedMimeType(mimeType) ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES ||
    !isSafeFilename(originalFilename) ||
    !isValidDate(uploadedAt)
  ) {
    return { ok: false, error: 'invalid_token' }
  }

  if (normalizeCustomBundlePaymentReference(normalizedReference) !== normalizedReference) {
    return { ok: false, error: 'invalid_token' }
  }

  const iat = payload.iat
  const exp = payload.exp
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    return { ok: false, error: 'invalid_token' }
  }

  return {
    ok: true,
    payload: {
      v: 1,
      purpose: CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE,
      iat,
      exp,
      publicCode,
      paymentMethod,
      normalizedReference,
      paymentReportIdempotencyKey,
      blobPathname,
      sha256,
      mimeType: mimeType as CustomBundlePaymentProofAllowedMimeType,
      sizeBytes,
      originalFilename,
      uploadedAt: uploadedAt.toISOString(),
      createdByThisCall: payload.createdByThisCall,
    },
  }
}

export function buildCustomBundlePaymentUploadIntent(input: {
  publicCode: string
  paymentMethod: string
  paymentReference: string
  normalizedReference: string
  paymentReportIdempotencyKey: string
  originalFilename: string | null
  declaredMimeType: CustomBundlePaymentProofAllowedMimeType
  declaredSizeBytes: number
  now: Date
  expiresAt?: Date
}): string | null {
  const secret = getUploadTokenSecret(false)
  if (!secret) {
    return null
  }

  if (!isValidDate(input.now)) {
    return null
  }

  const exp =
    input.expiresAt instanceof Date && isValidDate(input.expiresAt)
      ? Math.floor(input.expiresAt.getTime() / 1000)
      : Math.floor((input.now.getTime() + CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_TTL_SECONDS * 1000) / 1000)
  const iat = Math.floor(input.now.getTime() / 1000)
  if (exp <= iat) {
    return null
  }

  const payload: CustomBundlePaymentUploadIntentPayload = {
    v: 1,
    purpose: CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_PURPOSE,
    publicCode: input.publicCode.trim().toUpperCase(),
    paymentMethod: input.paymentMethod.trim().toLowerCase(),
    paymentReference: input.paymentReference.trim(),
    normalizedReference: input.normalizedReference.trim().toUpperCase(),
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey.trim(),
    originalFilename: input.originalFilename === null ? null : input.originalFilename.trim(),
    declaredMimeType: input.declaredMimeType,
    declaredSizeBytes: input.declaredSizeBytes,
    iat,
    exp,
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signatureBase64Url = signPayload(payloadBase64Url, secret)
  return `${payloadBase64Url}.${signatureBase64Url}`
}

export function validateCustomBundlePaymentUploadIntent(
  token: string,
  expectedPublicCode: string | null | undefined,
  now: Date,
): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadIntentPayload> {
  const secret = getUploadTokenSecret(true)
  if (!secret) {
    return { ok: false, error: 'misconfigured_secret' }
  }

  if (!isValidDate(now)) {
    return { ok: false, error: 'invalid_token' }
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

  const validated = validateUploadIntentPayload(payloadCandidate)
  if (!validated.ok) {
    return validated
  }

  const normalizedExpectedCode = expectedPublicCode?.trim().toUpperCase() ?? ''
  if (normalizedExpectedCode && validated.payload.publicCode !== normalizedExpectedCode) {
    return { ok: false, error: 'invalid_token' }
  }

  const nowEpochSeconds = Math.floor(now.getTime() / 1000)
  if (validated.payload.exp <= nowEpochSeconds) {
    return { ok: false, error: 'expired_token' }
  }

  return validated
}

export function buildCustomBundlePaymentUploadReceipt(input: {
  publicCode: string
  paymentMethod: string
  normalizedReference: string
  paymentReportIdempotencyKey: string
  blobPathname: string
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
  createdByThisCall: boolean
  now: Date
  expiresAt?: Date
}): string | null {
  const secret = getUploadTokenSecret(false)
  if (!secret) {
    return null
  }

  if (!isValidDate(input.now) || !isValidDate(input.uploadedAt)) {
    return null
  }

  const exp =
    input.expiresAt instanceof Date && isValidDate(input.expiresAt)
      ? Math.floor(input.expiresAt.getTime() / 1000)
      : Math.floor((input.now.getTime() + CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_TTL_SECONDS * 1000) / 1000)
  const iat = Math.floor(input.now.getTime() / 1000)
  if (exp <= iat) {
    return null
  }

  const payload: CustomBundlePaymentUploadReceiptPayload = {
    v: 1,
    purpose: CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_PURPOSE,
    publicCode: input.publicCode.trim().toUpperCase(),
    paymentMethod: input.paymentMethod.trim().toLowerCase(),
    normalizedReference: input.normalizedReference.trim().toUpperCase(),
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey.trim(),
    blobPathname: input.blobPathname.trim(),
    sha256: input.sha256.trim().toLowerCase(),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    originalFilename: input.originalFilename === null ? null : input.originalFilename.trim(),
    uploadedAt: input.uploadedAt.toISOString(),
    createdByThisCall: input.createdByThisCall,
    iat,
    exp,
  }

  const validated = validateUploadReceiptPayload(payload)
  if (!validated.ok) {
    return null
  }

  const payloadBase64Url = toBase64Url(JSON.stringify(validated.payload))
  const signatureBase64Url = signPayload(payloadBase64Url, secret)
  return `${payloadBase64Url}.${signatureBase64Url}`
}

export function validateCustomBundlePaymentUploadReceipt(
  token: string,
  expectedPublicCode: string | null | undefined,
  now: Date,
): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadReceiptPayload> {
  const secret = getUploadTokenSecret(true)
  if (!secret) {
    return { ok: false, error: 'misconfigured_secret' }
  }

  if (!isValidDate(now)) {
    return { ok: false, error: 'invalid_token' }
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

  const validated = validateUploadReceiptPayload(payloadCandidate)
  if (!validated.ok) {
    return validated
  }

  const normalizedExpectedCode = expectedPublicCode?.trim().toUpperCase() ?? ''
  if (normalizedExpectedCode && validated.payload.publicCode !== normalizedExpectedCode) {
    return { ok: false, error: 'invalid_token' }
  }

  const nowEpochSeconds = Math.floor(now.getTime() / 1000)
  if (validated.payload.exp <= nowEpochSeconds) {
    return { ok: false, error: 'expired_token' }
  }

  return validated
}

export function toTrustedPaymentProofMetadataFromReceiptPayload(
  payload: CustomBundlePaymentUploadReceiptPayload,
): CustomBundleTrustedPaymentProofMetadata {
  return {
    blobPathname: payload.blobPathname,
    sha256: payload.sha256,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    originalFilename: payload.originalFilename,
    uploadedAt: new Date(payload.uploadedAt),
  }
}
