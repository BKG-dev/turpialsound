import { createHash } from 'node:crypto'

import { extractCustomBundleOperationalTags } from '@/lib/bookings/custom-bundle-hold-operational-notes'
import { isCustomBundleHoldActive } from '@/lib/bookings/custom-bundle-hold-contract'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'

export const CUSTOM_BUNDLE_PAYMENT_CONTRACT_VERSION = 'custom_bundle_payment_v1' as const

export const CUSTOM_BUNDLE_PAYMENT_METHODS = [
  'pago_movil',
  'transferencia',
  'binance',
  'efectivo',
] as const satisfies readonly BookingPaymentMethodSlug[]

export const CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS = [
  'pago_movil',
  'transferencia',
  'binance',
] as const satisfies readonly BookingPaymentMethodSlug[]

export const CUSTOM_BUNDLE_PAYMENT_REFERENCE_MAX_LENGTH = 120 as const
export const CUSTOM_BUNDLE_PAYMENT_NORMALIZED_REFERENCE_MAX_LENGTH = 80 as const
export const CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES = 4_718_592 as const

export const CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

export type CustomBundlePaymentProofAllowedMimeType =
  (typeof CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES)[number]

export interface CustomBundlePaymentReportSubmission {
  publicCode: string
  paymentMethod: BookingPaymentMethodSlug
  paymentReference: string
}

export interface CustomBundlePaymentReportSubmissionIssue {
  code:
    | 'INVALID_SUBMISSION'
    | 'INVALID_PUBLIC_CODE'
    | 'INVALID_PAYMENT_METHOD'
    | 'INVALID_PAYMENT_REFERENCE'
    | 'UNEXPECTED_FIELD'
  path: Array<string | number>
  message: string
}

export type CustomBundlePaymentReportSubmissionParseResult =
  | {
      ok: true
      value: CustomBundlePaymentReportSubmission
    }
  | {
      ok: false
      issues: CustomBundlePaymentReportSubmissionIssue[]
    }

export interface CustomBundleTrustedPaymentProofMetadata {
  blobPathname: string
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
}

export interface CustomBundlePaymentProofIssue {
  code:
    | 'PROOF_REQUIRED'
    | 'INVALID_PROOF_PATHNAME'
    | 'INVALID_PROOF_SHA256'
    | 'INVALID_PROOF_MIME_TYPE'
    | 'INVALID_PROOF_SIZE'
    | 'INVALID_PROOF_FILENAME'
    | 'INVALID_PROOF_UPLOADED_AT'
  path: Array<string | number>
  message: string
}

export interface CustomBundlePaymentServerContext {
  now: Date
  paymentReportIdempotencyKey: string
  proofMetadata?: CustomBundleTrustedPaymentProofMetadata | null
}

export interface CustomBundlePaymentServerContextIssue {
  code: 'INVALID_NOW' | 'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY'
  message: string
}

export interface CustomBundleExistingPaymentReportSnapshot {
  paymentMethod: string | null
  paymentReference: string | null
  paymentNormalizedReference: string | null
  paymentReportedAt: Date | null
  paymentExpectedTotalUsdSnapshot: number | null
  paymentReportIdempotencyKey: string | null
  paymentReportFingerprint: string | null
}

export interface CustomBundlePaymentBookingSnapshot {
  id: string
  publicCode: string
  status: string
  internalNotes: string | null
  bookingMode: string | null
  pricingSource: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
  estimatedTotalUsd: number | null
  currency: string
  existingPaymentReport: CustomBundleExistingPaymentReportSnapshot | null
}

export interface CustomBundlePaymentEligibilityIssue {
  code:
    | 'BOOKING_RECORD_INVALID'
    | 'NOT_CUSTOM_BUNDLE'
    | 'INVALID_OPERATIONAL_STATUS'
    | 'HOLD_EXPIRED'
    | 'INVALID_EXPECTED_TOTAL'
    | 'INVALID_CURRENCY'
    | 'PAYMENT_REPORT_RECORD_INCOMPLETE'
  message: string
}

export type CustomBundlePaymentReplayClassification =
  | 'no_existing_report'
  | 'exact_replay'
  | 'idempotency_key_conflict'
  | 'already_reported_by_other_attempt'
  | 'malformed_existing_report'

export interface CustomBundlePaymentPreparedValue {
  bookingRequestId: string
  publicCode: string
  paymentMethod: BookingPaymentMethodSlug
  paymentReference: string
  normalizedReference: string
  paymentReportedAtIso: string
  expectedTotalUsd: number
  currency: 'USD'
  paymentReportIdempotencyKey: string
  paymentReportFingerprint: string
  proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
}

export type CustomBundlePaymentPreparationResult =
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundlePaymentReportSubmissionIssue[]
    }
  | {
      ok: false
      stage: 'server_context'
      serverContextIssues: CustomBundlePaymentServerContextIssue[]
    }
  | {
      ok: false
      stage: 'proof_policy'
      proofPolicyIssues: CustomBundlePaymentProofIssue[]
    }
  | {
      ok: false
      stage: 'booking_eligibility'
      bookingEligibilityIssues: CustomBundlePaymentEligibilityIssue[]
    }
  | {
      ok: false
      stage: 'replay'
      replayClassification:
        | 'idempotency_key_conflict'
        | 'already_reported_by_other_attempt'
        | 'malformed_existing_report'
      message: string
    }
  | {
      ok: true
      stage: 'ready'
      value: CustomBundlePaymentPreparedValue
    }
  | {
      ok: true
      stage: 'replay'
      replayClassification: 'exact_replay'
      value: CustomBundlePaymentPreparedValue
    }

const CUSTOM_BUNDLE_PAYMENT_METHOD_SET = new Set<BookingPaymentMethodSlug>(
  CUSTOM_BUNDLE_PAYMENT_METHODS,
)
const CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHOD_SET = new Set<BookingPaymentMethodSlug>(
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function makeSubmissionIssue(
  code: CustomBundlePaymentReportSubmissionIssue['code'],
  path: Array<string | number>,
  message: string,
): CustomBundlePaymentReportSubmissionIssue {
  return { code, path, message }
}

function makeProofIssue(
  code: CustomBundlePaymentProofIssue['code'],
  path: Array<string | number>,
  message: string,
): CustomBundlePaymentProofIssue {
  return { code, path, message }
}

function makeServerContextIssue(
  code: CustomBundlePaymentServerContextIssue['code'],
  message: string,
): CustomBundlePaymentServerContextIssue {
  return { code, message }
}

function makeEligibilityIssue(
  code: CustomBundlePaymentEligibilityIssue['code'],
  message: string,
): CustomBundlePaymentEligibilityIssue {
  return { code, message }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidUsdSnapshotAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
}

function isValidPublicCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function isValidPaymentMethod(value: string): value is BookingPaymentMethodSlug {
  return CUSTOM_BUNDLE_PAYMENT_METHOD_SET.has(value as BookingPaymentMethodSlug)
}

function isValidPaymentReportIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{16,128}$/.test(value)
}

function isValidPaymentReference(value: string): boolean {
  const normalized = normalizeCustomBundlePaymentReference(value)
  return (
    normalized.length > 0 &&
    normalized.length <= CUSTOM_BUNDLE_PAYMENT_NORMALIZED_REFERENCE_MAX_LENGTH &&
    !/[\r\n]/.test(value)
  )
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  )

  const result: Record<string, unknown> = {}
  for (const [key, entry] of entries) {
    result[key] = canonicalize(entry)
  }

  return result
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function cloneProofMetadata(
  metadata: CustomBundleTrustedPaymentProofMetadata | null | undefined,
): CustomBundleTrustedPaymentProofMetadata | null {
  if (!metadata) {
    return null
  }

  return {
    ...metadata,
    uploadedAt: new Date(metadata.uploadedAt.getTime()),
  }
}

export function normalizeCustomBundlePaymentReference(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function validateCustomBundlePaymentReportSubmission(
  input: unknown,
): CustomBundlePaymentReportSubmissionParseResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        makeSubmissionIssue(
          'INVALID_SUBMISSION',
          [],
          'El payload de pago debe ser un objeto plano.',
        ),
      ],
    }
  }

  const issues: CustomBundlePaymentReportSubmissionIssue[] = []
  const root = input as Record<string, unknown>
  const allowedFields = new Set(['publicCode', 'paymentMethod', 'paymentReference'])

  for (const key of Object.keys(root).sort()) {
    if (!allowedFields.has(key)) {
      issues.push(
        makeSubmissionIssue('UNEXPECTED_FIELD', [key], `Campo inesperado: ${key}.`),
      )
    }
  }

  const publicCodeValue = typeof root.publicCode === 'string' ? root.publicCode : ''
  if (!isValidPublicCode(publicCodeValue.trim().toUpperCase())) {
    issues.push(
      makeSubmissionIssue(
        'INVALID_PUBLIC_CODE',
        ['publicCode'],
        'publicCode debe cumplir el formato TUR-YYYY-NNN.',
      ),
    )
  }

  const paymentMethodValue = root.paymentMethod
  const normalizedMethod =
    typeof paymentMethodValue === 'string' ? paymentMethodValue.trim().toLowerCase() : ''
  if (!isValidPaymentMethod(normalizedMethod)) {
    issues.push(
      makeSubmissionIssue(
        'INVALID_PAYMENT_METHOD',
        ['paymentMethod'],
        'paymentMethod no es valido.',
      ),
    )
  }

  const paymentReferenceValue = typeof root.paymentReference === 'string' ? root.paymentReference : ''
  const normalizedPaymentReference = normalizeCustomBundlePaymentReference(paymentReferenceValue)
  if (
    paymentReferenceValue.trim().length === 0 ||
    paymentReferenceValue.trim().length > CUSTOM_BUNDLE_PAYMENT_REFERENCE_MAX_LENGTH ||
    /[\r\n]/.test(paymentReferenceValue) ||
    normalizedPaymentReference.length === 0 ||
    normalizedPaymentReference.length > CUSTOM_BUNDLE_PAYMENT_NORMALIZED_REFERENCE_MAX_LENGTH
  ) {
    issues.push(
      makeSubmissionIssue(
        'INVALID_PAYMENT_REFERENCE',
        ['paymentReference'],
        'paymentReference no es valido.',
      ),
    )
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return {
    ok: true,
    value: {
      publicCode: publicCodeValue.trim().toUpperCase(),
      paymentMethod: normalizedMethod as BookingPaymentMethodSlug,
      paymentReference: paymentReferenceValue.trim(),
    },
  }
}

export function validateCustomBundleTrustedPaymentProofMetadata(
  metadata: unknown,
  now: Date,
): CustomBundlePaymentProofIssue[] {
  if (!isPlainObject(metadata)) {
    return [
      makeProofIssue(
        'INVALID_PROOF_PATHNAME',
        [],
        'Los metadatos del comprobante no son validos.',
      ),
    ]
  }

  const issues: CustomBundlePaymentProofIssue[] = []
  const proof = metadata as Record<string, unknown>

  const blobPathname = typeof proof.blobPathname === 'string' ? proof.blobPathname.trim() : ''
  if (blobPathname.length === 0 || blobPathname.length > 500) {
    issues.push(
      makeProofIssue('INVALID_PROOF_PATHNAME', ['blobPathname'], 'blobPathname no es valido.'),
    )
  }

  const sha256 = typeof proof.sha256 === 'string' ? proof.sha256.trim() : ''
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    issues.push(
      makeProofIssue('INVALID_PROOF_SHA256', ['sha256'], 'sha256 no es valido.'),
    )
  }

  const mimeType = typeof proof.mimeType === 'string' ? proof.mimeType.trim().toLowerCase() : ''
  if (!CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES.includes(mimeType as CustomBundlePaymentProofAllowedMimeType)) {
    issues.push(
      makeProofIssue('INVALID_PROOF_MIME_TYPE', ['mimeType'], 'mimeType no es valido.'),
    )
  }

  const sizeBytes = typeof proof.sizeBytes === 'number' ? proof.sizeBytes : Number.NaN
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES
  ) {
    issues.push(
      makeProofIssue('INVALID_PROOF_SIZE', ['sizeBytes'], 'sizeBytes no es valido.'),
    )
  }

  const originalFilename = proof.originalFilename
  if (
    originalFilename !== null &&
    (typeof originalFilename !== 'string' ||
      originalFilename.trim().length === 0 ||
      originalFilename.trim().length > 255 ||
      /[\\/\0]/.test(originalFilename))
  ) {
    issues.push(
      makeProofIssue(
        'INVALID_PROOF_FILENAME',
        ['originalFilename'],
        'originalFilename no es valido.',
      ),
    )
  }

  const uploadedAt = proof.uploadedAt
  if (!(uploadedAt instanceof Date) || !isValidDate(uploadedAt) || uploadedAt.getTime() > now.getTime()) {
    issues.push(
      makeProofIssue(
        'INVALID_PROOF_UPLOADED_AT',
        ['uploadedAt'],
        'uploadedAt no es valido.',
      ),
    )
  }

  return issues
}

export function validateCustomBundlePaymentServerContext(
  context: CustomBundlePaymentServerContext,
): CustomBundlePaymentServerContextIssue[] {
  const issues: CustomBundlePaymentServerContextIssue[] = []
  const normalizedKey =
    typeof context.paymentReportIdempotencyKey === 'string'
      ? context.paymentReportIdempotencyKey.trim()
      : ''

  if (!isValidDate(context.now)) {
    issues.push(makeServerContextIssue('INVALID_NOW', 'El instante actual del servidor no es valido.'))
  }

  if (!isValidPaymentReportIdempotencyKey(normalizedKey)) {
    issues.push(
      makeServerContextIssue(
        'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY',
        'La clave de idempotencia del reporte no cumple el formato esperado.',
      ),
    )
  }

  return issues
}

function validateCustomBundlePaymentBaseBooking(
  booking: CustomBundlePaymentBookingSnapshot,
): CustomBundlePaymentEligibilityIssue[] {
  if (
    !isPlainObject(booking) ||
    typeof booking.id !== 'string' ||
    booking.id.trim().length === 0 ||
    typeof booking.publicCode !== 'string' ||
    !isValidPublicCode(booking.publicCode.trim().toUpperCase()) ||
    typeof booking.status !== 'string' ||
    typeof booking.bookingMode !== 'string' ||
    typeof booking.estimatedTotalUsd !== 'number' ||
    !Number.isFinite(booking.estimatedTotalUsd) ||
    typeof booking.currency !== 'string'
  ) {
    return [
      makeEligibilityIssue('BOOKING_RECORD_INVALID', 'La solicitud base no es valida.'),
    ]
  }

  const issues: CustomBundlePaymentEligibilityIssue[] = []

  if (booking.bookingMode !== 'custom_bundle' || booking.pricingSource !== 'server_catalog_v1') {
    issues.push(
      makeEligibilityIssue(
        'NOT_CUSTOM_BUNDLE',
        'La solicitud no corresponde a una cotizacion custom_bundle autoritativa.',
      ),
    )
  }

  if (
    !(booking.holdAcquiredAt instanceof Date) ||
    !isValidDate(booking.holdAcquiredAt) ||
    !(booking.holdExpiresAt instanceof Date) ||
    !isValidDate(booking.holdExpiresAt) ||
    booking.holdExpiresAt.getTime() <= booking.holdAcquiredAt.getTime()
  ) {
    issues.push(
      makeEligibilityIssue(
        'BOOKING_RECORD_INVALID',
        'La ventana de hold de la solicitud no es valida.',
      ),
    )
  }

  if (!isValidUsdSnapshotAmount(booking.estimatedTotalUsd)) {
    issues.push(
      makeEligibilityIssue(
        'INVALID_EXPECTED_TOTAL',
        'El total esperado de la solicitud debe ser mayor que cero.',
      ),
    )
  }

  if (booking.currency !== 'USD') {
    issues.push(makeEligibilityIssue('INVALID_CURRENCY', 'La solicitud debe estar en USD.'))
  }

  return issues
}

function validateCustomBundlePaymentNewReportEligibility(
  booking: CustomBundlePaymentBookingSnapshot,
  now: Date,
): CustomBundlePaymentEligibilityIssue[] {
  const issues: CustomBundlePaymentEligibilityIssue[] = []
  const tags = extractCustomBundleOperationalTags(booking.internalNotes)

  if (booking.status !== 'under_review' || tags.length !== 1 || tags[0] !== 'pending_payment') {
    issues.push(
      makeEligibilityIssue(
        'INVALID_OPERATIONAL_STATUS',
        'La solicitud no esta en estado pending_payment.',
      ),
    )
  }

  const holdExpiresAt = booking.holdExpiresAt
  if (!(holdExpiresAt instanceof Date) || !isValidDate(holdExpiresAt)) {
    issues.push(makeEligibilityIssue('HOLD_EXPIRED', 'La ventana del hold ya expiro.'))
  } else if (!isCustomBundleHoldActive(holdExpiresAt, now)) {
    issues.push(makeEligibilityIssue('HOLD_EXPIRED', 'La ventana del hold ya expiro.'))
  }

  return issues
}

function validateExistingPaymentReportSnapshot(
  booking: CustomBundlePaymentBookingSnapshot,
  existing: CustomBundleExistingPaymentReportSnapshot | null,
): CustomBundlePaymentEligibilityIssue[] {
  if (!existing) {
    return []
  }

  const issues: CustomBundlePaymentEligibilityIssue[] = []
  const tags = extractCustomBundleOperationalTags(booking.internalNotes)

  if (booking.status !== 'under_review' || tags.length !== 1 || tags[0] !== 'payment_reported') {
    issues.push(
      makeEligibilityIssue(
        'PAYMENT_REPORT_RECORD_INCOMPLETE',
        'El reporte de pago existente no es consistente.',
      ),
    )
  }

  const hasValidMethod =
    typeof existing.paymentMethod === 'string' &&
    isValidPaymentMethod(existing.paymentMethod.trim().toLowerCase())
  const hasValidKey =
    typeof existing.paymentReportIdempotencyKey === 'string' &&
    isValidPaymentReportIdempotencyKey(existing.paymentReportIdempotencyKey.trim())
  const hasValidFingerprint =
    typeof existing.paymentReportFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(existing.paymentReportFingerprint.trim())
  const hasValidReference =
    typeof existing.paymentReference === 'string' &&
    isValidPaymentReference(existing.paymentReference)
  const hasValidNormalizedReference =
    typeof existing.paymentNormalizedReference === 'string' &&
    /^[A-Z0-9]{1,80}$/.test(existing.paymentNormalizedReference.trim())
  const hasValidReportedAt =
    existing.paymentReportedAt instanceof Date && isValidDate(existing.paymentReportedAt)
  const hasValidExpectedTotal =
    typeof existing.paymentExpectedTotalUsdSnapshot === 'number' &&
    isValidUsdSnapshotAmount(existing.paymentExpectedTotalUsdSnapshot)
  const paymentReference = existing.paymentReference
  const paymentNormalizedReference = existing.paymentNormalizedReference
  const paymentReportedAt = existing.paymentReportedAt
  const holdAcquiredAt = booking.holdAcquiredAt
  const holdExpiresAt = booking.holdExpiresAt
  const hasMatchingExpectedTotal =
    hasValidExpectedTotal && existing.paymentExpectedTotalUsdSnapshot === booking.estimatedTotalUsd
  const hasMatchingNormalizedReference =
    hasValidReference &&
    hasValidNormalizedReference &&
    typeof paymentNormalizedReference === 'string' &&
    typeof paymentReference === 'string' &&
    normalizeCustomBundlePaymentReference(paymentReference) === paymentNormalizedReference.trim()
  const hasValidHistoricalWindow =
    hasValidReportedAt &&
    holdAcquiredAt instanceof Date &&
    isValidDate(holdAcquiredAt) &&
    holdExpiresAt instanceof Date &&
    isValidDate(holdExpiresAt) &&
    paymentReportedAt instanceof Date &&
    isValidDate(paymentReportedAt) &&
    paymentReportedAt.getTime() >= holdAcquiredAt.getTime() &&
    paymentReportedAt.getTime() < holdExpiresAt.getTime()

  if (
    !hasValidMethod ||
    !hasValidKey ||
    !hasValidFingerprint ||
    !hasValidReference ||
    !hasValidNormalizedReference ||
    !hasValidReportedAt ||
    !hasValidExpectedTotal ||
    !hasMatchingExpectedTotal ||
    !hasMatchingNormalizedReference ||
    !hasValidHistoricalWindow
  ) {
    issues.push(
      makeEligibilityIssue(
        'PAYMENT_REPORT_RECORD_INCOMPLETE',
        'El reporte de pago existente no es consistente.',
      ),
    )
  }

  return issues
}

export function evaluateCustomBundlePaymentEligibility(input: {
  booking: CustomBundlePaymentBookingSnapshot
  now: Date
}): CustomBundlePaymentEligibilityIssue[] {
  const issues = validateCustomBundlePaymentBaseBooking(input.booking)
  issues.push(...validateCustomBundlePaymentNewReportEligibility(input.booking, input.now))
  return issues
}

export function buildCustomBundlePaymentReportFingerprint(input: {
  bookingRequestId: string
  publicCode: string
  expectedTotalUsd: number
  currency: 'USD'
  paymentMethod: BookingPaymentMethodSlug
  normalizedReference: string
  proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
}): string {
  const payload = {
    contractVersion: CUSTOM_BUNDLE_PAYMENT_CONTRACT_VERSION,
    bookingRequestId: input.bookingRequestId,
    publicCode: input.publicCode,
    expectedTotalUsd: input.expectedTotalUsd,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    normalizedReference: input.normalizedReference,
    proofMetadata: input.proofMetadata
      ? {
          blobPathname: input.proofMetadata.blobPathname,
          sha256: input.proofMetadata.sha256,
          mimeType: input.proofMetadata.mimeType,
          sizeBytes: input.proofMetadata.sizeBytes,
          uploadedAtIso: input.proofMetadata.uploadedAt.toISOString(),
        }
      : null,
  }

  return createHash('sha256').update(stableStringify(payload)).digest('hex')
}

export function classifyCustomBundlePaymentReplay(input: {
  booking: CustomBundlePaymentBookingSnapshot
  requestedIdempotencyKey: string
  requestedFingerprint: string
  existingReport: CustomBundlePaymentBookingSnapshot['existingPaymentReport']
}): CustomBundlePaymentReplayClassification {
  const requestedIdempotencyKey = input.requestedIdempotencyKey.trim()
  const existingReport = input.existingReport

  if (!existingReport) {
    return 'no_existing_report'
  }

  if (validateExistingPaymentReportSnapshot(input.booking, existingReport).length > 0) {
    return 'malformed_existing_report'
  }

  const existingIdempotencyKey = existingReport.paymentReportIdempotencyKey?.trim() ?? ''
  const existingFingerprint = existingReport.paymentReportFingerprint?.trim() ?? ''

  if (existingIdempotencyKey === requestedIdempotencyKey && existingFingerprint === input.requestedFingerprint) {
    return 'exact_replay'
  }

  if (existingIdempotencyKey === requestedIdempotencyKey) {
    return 'idempotency_key_conflict'
  }

  return 'already_reported_by_other_attempt'
}

export function prepareCustomBundlePaymentReport(input: {
  submission: unknown
  serverContext: CustomBundlePaymentServerContext
  booking: CustomBundlePaymentBookingSnapshot
}): CustomBundlePaymentPreparationResult {
  const parsedSubmission = validateCustomBundlePaymentReportSubmission(input.submission)
  if (!parsedSubmission.ok) {
    return {
      ok: false,
      stage: 'contract',
      contractIssues: parsedSubmission.issues,
    }
  }

  const serverContextIssues = validateCustomBundlePaymentServerContext(input.serverContext)
  if (serverContextIssues.length > 0) {
    return {
      ok: false,
      stage: 'server_context',
      serverContextIssues,
    }
  }

  const proofMetadata = input.serverContext.proofMetadata ?? null
  const normalizedMethod = parsedSubmission.value.paymentMethod
  if (CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHOD_SET.has(normalizedMethod)) {
    if (!proofMetadata) {
      return {
        ok: false,
        stage: 'proof_policy',
        proofPolicyIssues: [
          makeProofIssue(
            'PROOF_REQUIRED',
            ['proofMetadata'],
            'Este metodo de pago requiere un comprobante.',
          ),
        ],
      }
    }
  }

  if (proofMetadata) {
    const proofIssues = validateCustomBundleTrustedPaymentProofMetadata(
      proofMetadata,
      input.serverContext.now,
    )
    if (proofIssues.length > 0) {
      return {
        ok: false,
        stage: 'proof_policy',
        proofPolicyIssues: proofIssues,
      }
    }
  }

  const baseBookingIssues = validateCustomBundlePaymentBaseBooking(input.booking)
  if (baseBookingIssues.length > 0) {
    return {
      ok: false,
      stage: 'booking_eligibility',
      bookingEligibilityIssues: baseBookingIssues,
    }
  }

  const normalizedReference = normalizeCustomBundlePaymentReference(
    parsedSubmission.value.paymentReference,
  )
  const expectedTotalUsd = input.booking.estimatedTotalUsd as number
  const paymentReportFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: input.booking.id,
    publicCode: parsedSubmission.value.publicCode,
    expectedTotalUsd,
    currency: 'USD',
    paymentMethod: parsedSubmission.value.paymentMethod,
    normalizedReference,
    proofMetadata,
  })

  if (input.booking.existingPaymentReport) {
    const replayClassification = classifyCustomBundlePaymentReplay({
      booking: input.booking,
      requestedIdempotencyKey: input.serverContext.paymentReportIdempotencyKey.trim(),
      requestedFingerprint: paymentReportFingerprint,
      existingReport: input.booking.existingPaymentReport,
    })

    if (replayClassification === 'exact_replay') {
      const existingReport = input.booking.existingPaymentReport
      return {
        ok: true,
        stage: 'replay',
        replayClassification,
        value: {
          bookingRequestId: input.booking.id,
          publicCode: parsedSubmission.value.publicCode,
          paymentMethod: existingReport.paymentMethod!.trim() as BookingPaymentMethodSlug,
          paymentReference: existingReport.paymentReference!,
          normalizedReference: existingReport.paymentNormalizedReference!,
          paymentReportedAtIso: existingReport.paymentReportedAt!.toISOString(),
          expectedTotalUsd: existingReport.paymentExpectedTotalUsdSnapshot!,
          currency: 'USD',
          paymentReportIdempotencyKey: existingReport.paymentReportIdempotencyKey!.trim(),
          paymentReportFingerprint: existingReport.paymentReportFingerprint!.trim(),
          proofMetadata: cloneProofMetadata(proofMetadata),
        },
      }
    }

    if (replayClassification !== 'no_existing_report') {
      return {
        ok: false,
        stage: 'replay',
        replayClassification,
        message: 'El reporte de pago no puede reutilizarse para esta solicitud.',
      }
    }
  }

  const bookingEligibilityIssues = validateCustomBundlePaymentNewReportEligibility(
    input.booking,
    input.serverContext.now,
  )
  if (bookingEligibilityIssues.length > 0) {
    return {
      ok: false,
      stage: 'booking_eligibility',
      bookingEligibilityIssues,
    }
  }

  const preparedValue: CustomBundlePaymentPreparedValue = {
    bookingRequestId: input.booking.id,
    publicCode: parsedSubmission.value.publicCode,
    paymentMethod: parsedSubmission.value.paymentMethod,
    paymentReference: parsedSubmission.value.paymentReference,
    normalizedReference,
    paymentReportedAtIso: input.serverContext.now.toISOString(),
    expectedTotalUsd,
    currency: 'USD',
    paymentReportIdempotencyKey: input.serverContext.paymentReportIdempotencyKey.trim(),
    paymentReportFingerprint,
    proofMetadata: cloneProofMetadata(proofMetadata),
  }

  return {
    ok: true,
    stage: 'ready',
    value: preparedValue,
  }
}
