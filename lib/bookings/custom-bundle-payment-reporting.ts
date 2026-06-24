import { randomUUID } from 'node:crypto'

import {
  buildCustomBundlePaymentReportFingerprint,
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
  normalizeCustomBundlePaymentReference,
  prepareCustomBundlePaymentReport,
  validateCustomBundlePaymentReportSubmission,
  validateCustomBundlePaymentServerContext,
  validateCustomBundleTrustedPaymentProofMetadata,
  type CustomBundleExistingPaymentReportSnapshot,
  type CustomBundlePaymentBookingSnapshot,
  type CustomBundlePaymentEligibilityIssue,
  type CustomBundlePaymentProofIssue,
  type CustomBundlePaymentReportSubmissionIssue,
  type CustomBundlePaymentServerContext,
  type CustomBundlePaymentServerContextIssue,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  extractCustomBundleOperationalTags,
  stripCustomBundleOperationalTags,
} from '@/lib/bookings/custom-bundle-hold-operational-notes'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'

export const CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION = 'custom_bundle_payment_reported'
export const CUSTOM_BUNDLE_PAYMENT_REPORT_VERSION = 'custom_bundle_payment_reporting_v1'
export const CUSTOM_BUNDLE_PAYMENT_REPORT_MAX_TRANSACTION_ATTEMPTS = 3

const RETRYABLE_TRANSACTION_ERROR_CODES = new Set(['40001', '40P01'])
const REQUIRED_PAYMENT_PROOF_METHODS = new Set<BookingPaymentMethodSlug>(
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
)
const PAYMENT_IDEMPOTENCY_CONSTRAINT = 'booking_requests_payment_report_idempotency_key_uniq'

export interface ReportCustomBundlePaymentWithSqlInput {
  submission: unknown
  serverContext: CustomBundlePaymentServerContext
}

export type ReportCustomBundlePaymentWithSqlResult =
  | {
      ok: false
      stage: 'server_context'
      code: 'INVALID_SQL_SESSION'
      message: string
    }
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
      stage: 'lookup'
      code: 'BOOKING_NOT_FOUND'
      message: string
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
      code:
        | 'IDEMPOTENCY_KEY_CONFLICT'
        | 'ALREADY_REPORTED_BY_OTHER_ATTEMPT'
        | 'MALFORMED_EXISTING_REPORT'
      message: string
    }
  | {
      ok: false
      stage: 'persistence'
      code:
        | 'PAYMENT_REPORT_WRITE_CONFLICT'
        | 'PAYMENT_REPORT_IDEMPOTENCY_KEY_CONFLICT'
        | 'PAYMENT_PROOF_STATE_INVALID'
        | 'PAYMENT_PROOF_PATH_CONFLICT'
        | 'DATABASE_WRITE_FAILED'
        | 'TRANSACTION_RETRY_EXHAUSTED'
      message: string
    }
  | {
      ok: true
      stage: 'reported'
      replayed: false
      bookingRequestId: string
      publicCode: string
      operationalStatus: 'payment_reported'
      bookingStatus: 'under_review'
      paymentMethod: BookingPaymentMethodSlug
      paymentReference: string
      normalizedReference: string
      paymentReportedAtIso: string
      expectedTotalUsd: number
      currency: 'USD'
      paymentReportIdempotencyKey: string
      paymentReportFingerprint: string
      paymentProofId: string | null
      duplicateStatus: 'none' | 'same_booking' | 'other_booking' | null
    }
  | {
      ok: true
      stage: 'replayed'
      replayed: true
      bookingRequestId: string
      publicCode: string
      operationalStatus: 'payment_reported'
      bookingStatus: 'under_review'
      paymentMethod: BookingPaymentMethodSlug
      paymentReference: string
      normalizedReference: string
      paymentReportedAtIso: string
      expectedTotalUsd: number
      currency: 'USD'
      paymentReportIdempotencyKey: string
      paymentReportFingerprint: string
      paymentProofId: string | null
      duplicateStatus: 'none' | 'same_booking' | 'other_booking' | null
    }

interface BookingPaymentRow {
  id: string
  publicCode: string
  status: string
  internalNotes: string | null
  bookingMode: string | null
  pricingSource: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
  estimatedTotal: string | number | null
  currency: string
  paymentMethod: string | null
  paymentReference: string | null
  paymentNormalizedReference: string | null
  paymentReportedAt: Date | null
  paymentExpectedTotalUsdSnapshot: string | number | null
  paymentReportIdempotencyKey: string | null
  paymentReportFingerprint: string | null
}

interface PaymentProofRow {
  id: string
  bookingRequestId: string
  blobPathname: string
  sha256: string
  mimeType: string
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
  reportedReference: string | null
  normalizedReference: string | null
  duplicateStatus: string
  isActive: boolean
}

type PaymentProofDuplicateStatus = 'none' | 'same_booking' | 'other_booking'

type ReportSuccessStage = Extract<
  ReportCustomBundlePaymentWithSqlResult,
  { ok: true; stage: 'reported' | 'replayed' }
>

type ReportPersistenceFailure = Extract<
  ReportCustomBundlePaymentWithSqlResult,
  { ok: false; stage: 'persistence' }
>

type ReportReplayFailure = Extract<
  ReportCustomBundlePaymentWithSqlResult,
  { ok: false; stage: 'replay' }
>

type ReportLookupFailure = Extract<
  ReportCustomBundlePaymentWithSqlResult,
  { ok: false; stage: 'lookup' }
>

function makeInvalidSqlSessionResult(): Extract<
  ReportCustomBundlePaymentWithSqlResult,
  { stage: 'server_context'; code: 'INVALID_SQL_SESSION' }
> {
  return {
    ok: false,
    stage: 'server_context',
    code: 'INVALID_SQL_SESSION',
    message: 'El reporte de pago requiere una conexion SQL transaccional dedicada.',
  }
}

function makeLookupFailure(message: string): ReportLookupFailure {
  return {
    ok: false,
    stage: 'lookup',
    code: 'BOOKING_NOT_FOUND',
    message,
  }
}

function makePersistenceFailure(
  code: ReportPersistenceFailure['code'],
  message: string,
): ReportPersistenceFailure {
  return {
    ok: false,
    stage: 'persistence',
    code,
    message,
  }
}

function makeReplayFailure(
  code: ReportReplayFailure['code'],
  message: string,
): ReportReplayFailure {
  return {
    ok: false,
    stage: 'replay',
    code,
    message,
  }
}

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    RETRYABLE_TRANSACTION_ERROR_CODES.has((error as { code: string }).code)
  )
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}

function getConstraintName(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'constraint' in error &&
    typeof (error as { constraint?: unknown }).constraint === 'string'
  ) {
    return (error as { constraint: string }).constraint
  }

  return null
}

function toStrictNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
      return null
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizePaymentMethod(value: string | null): BookingPaymentMethodSlug | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return (
    normalized === 'pago_movil' ||
    normalized === 'transferencia' ||
    normalized === 'binance' ||
    normalized === 'efectivo'
  )
    ? normalized
    : null
}

function normalizeDuplicateStatus(value: string | null): PaymentProofDuplicateStatus | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return (
    normalized === 'none' ||
    normalized === 'same_booking' ||
    normalized === 'other_booking'
  )
    ? normalized
    : null
}

function normalizeProofMimeType(
  value: string | null | undefined,
): CustomBundleTrustedPaymentProofMetadata['mimeType'] | null {
  return value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/webp' ||
    value === 'image/avif'
    ? value
    : null
}

function isProofRowActive(row: PaymentProofRow): boolean {
  return row.isActive === true
}

function cloneTrustedProofMetadata(
  value: CustomBundleTrustedPaymentProofMetadata | null,
): CustomBundleTrustedPaymentProofMetadata | null {
  if (!value) {
    return null
  }

  return {
    blobPathname: value.blobPathname,
    sha256: value.sha256,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    originalFilename: value.originalFilename,
    uploadedAt: new Date(value.uploadedAt),
  }
}

function buildExistingPaymentReportSnapshot(
  row: BookingPaymentRow,
): CustomBundleExistingPaymentReportSnapshot | null {
  const values = [
    row.paymentMethod,
    row.paymentReference,
    row.paymentNormalizedReference,
    row.paymentReportedAt,
    row.paymentExpectedTotalUsdSnapshot,
    row.paymentReportIdempotencyKey,
    row.paymentReportFingerprint,
  ]

  if (values.every((value) => value === null)) {
    return null
  }

  return {
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference,
    paymentNormalizedReference: row.paymentNormalizedReference,
    paymentReportedAt: isValidDate(row.paymentReportedAt) ? row.paymentReportedAt : null,
    paymentExpectedTotalUsdSnapshot: toStrictNumber(row.paymentExpectedTotalUsdSnapshot),
    paymentReportIdempotencyKey: row.paymentReportIdempotencyKey,
    paymentReportFingerprint: row.paymentReportFingerprint,
  }
}

function buildBookingSnapshot(row: BookingPaymentRow): CustomBundlePaymentBookingSnapshot {
  return {
    id: row.id,
    publicCode: row.publicCode,
    status: row.status,
    internalNotes: row.internalNotes,
    bookingMode: row.bookingMode,
    pricingSource: row.pricingSource,
    holdAcquiredAt: isValidDate(row.holdAcquiredAt) ? row.holdAcquiredAt : null,
    holdExpiresAt: isValidDate(row.holdExpiresAt) ? row.holdExpiresAt : null,
    estimatedTotalUsd: toStrictNumber(row.estimatedTotal),
    currency: row.currency,
    existingPaymentReport: buildExistingPaymentReportSnapshot(row),
  }
}

function buildTrustedProofMetadataFromRow(
  row: PaymentProofRow | null,
): CustomBundleTrustedPaymentProofMetadata | null {
  if (!row) {
    return null
  }

  const mimeType = normalizeProofMimeType(row.mimeType)
  if (!mimeType) {
    return null
  }

  return {
    blobPathname: row.blobPathname,
    sha256: row.sha256,
    mimeType,
    sizeBytes: row.sizeBytes,
    originalFilename: row.originalFilename,
    uploadedAt: new Date(row.uploadedAt),
  }
}

function isPaymentProofRequired(method: BookingPaymentMethodSlug): boolean {
  return REQUIRED_PAYMENT_PROOF_METHODS.has(method)
}

export function setCustomBundlePaymentReportedOperationalStatus(
  internalNotes: string | null | undefined,
): string {
  const preservedNotes = stripCustomBundleOperationalTags(internalNotes)
  return preservedNotes
    ? `[ops_status:payment_reported]\n${preservedNotes}`
    : '[ops_status:payment_reported]'
}

async function rollbackSilently(session: CustomBundleSqlSession): Promise<void> {
  await session.query('ROLLBACK').catch(() => {})
}

function mapPreparationFailure(
  result: ReturnType<typeof prepareCustomBundlePaymentReport>,
): ReportCustomBundlePaymentWithSqlResult {
  if (result.ok) {
    return makePersistenceFailure(
      'DATABASE_WRITE_FAILED',
      'No se pudo clasificar el reporte de pago.',
    )
  }

  switch (result.stage) {
    case 'contract':
      return {
        ok: false,
        stage: 'contract',
        contractIssues: result.contractIssues,
      }
    case 'server_context':
      return {
        ok: false,
        stage: 'server_context',
        serverContextIssues: result.serverContextIssues,
      }
    case 'proof_policy':
      return {
        ok: false,
        stage: 'proof_policy',
        proofPolicyIssues: result.proofPolicyIssues,
      }
    case 'booking_eligibility':
      return {
        ok: false,
        stage: 'booking_eligibility',
        bookingEligibilityIssues: result.bookingEligibilityIssues,
      }
    case 'replay':
      if (result.replayClassification === 'idempotency_key_conflict') {
        return makeReplayFailure(
          'IDEMPOTENCY_KEY_CONFLICT',
          'La clave de idempotencia ya fue usada para otro reporte de pago.',
        )
      }

      if (result.replayClassification === 'already_reported_by_other_attempt') {
        return makeReplayFailure(
          'ALREADY_REPORTED_BY_OTHER_ATTEMPT',
          'La reserva ya fue reportada por otro intento de pago.',
        )
      }

      return makeReplayFailure(
        'MALFORMED_EXISTING_REPORT',
        'El reporte de pago existente no es coherente.',
      )
  }
}

async function readLockedBookingRequest(
  session: CustomBundleSqlSession,
  publicCode: string,
): Promise<BookingPaymentRow | null> {
  const result = await session.query<BookingPaymentRow>(
    `
      SELECT
        id,
        "publicCode",
        status,
        "internalNotes",
        "bookingMode",
        "pricingSource",
        "holdAcquiredAt",
        "holdExpiresAt",
        "estimatedTotal",
        currency,
        "paymentMethod",
        "paymentReference",
        "paymentNormalizedReference",
        "paymentReportedAt",
        "paymentExpectedTotalUsdSnapshot",
        "paymentReportIdempotencyKey",
        "paymentReportFingerprint"
      FROM "booking_requests"
      WHERE "publicCode" = $1
      FOR UPDATE
    `,
    [publicCode],
  )

  return result.rows[0] ?? null
}

async function readLockedActivePaymentProofs(
  session: CustomBundleSqlSession,
  bookingRequestId: string,
): Promise<PaymentProofRow[]> {
  const result = await session.query<PaymentProofRow>(
    `
      SELECT
        id,
        "bookingRequestId",
        "blobPathname",
        sha256,
        "mimeType",
        "sizeBytes",
        "originalFilename",
        "uploadedAt",
        "reportedReference",
        "normalizedReference",
        "duplicateStatus",
        "isActive"
      FROM "payment_proofs"
      WHERE "bookingRequestId" = $1
        AND "isActive" = true
      ORDER BY "uploadedAt" ASC, id ASC
      FOR UPDATE
    `,
    [bookingRequestId],
  )

  return result.rows
}

async function readConflictingPaymentIdempotencyKey(
  session: CustomBundleSqlSession,
  paymentReportIdempotencyKey: string,
  bookingRequestId: string,
): Promise<{ id: string; publicCode: string; paymentReportFingerprint: string | null } | null> {
  const result = await session.query<{
    id: string
    publicCode: string
    paymentReportFingerprint: string | null
  }>(
    `
      SELECT
        id,
        "publicCode",
        "paymentReportFingerprint"
      FROM "booking_requests"
      WHERE "paymentReportIdempotencyKey" = $1
        AND id <> $2
      FOR UPDATE
    `,
    [paymentReportIdempotencyKey, bookingRequestId],
  )

  return result.rows[0] ?? null
}

async function readDuplicateProofRows(
  session: CustomBundleSqlSession,
  sha256: string,
): Promise<Array<{ id: string; bookingRequestId: string; sha256: string }>> {
  const result = await session.query<{
    id: string
    bookingRequestId: string
    sha256: string
  }>(
    `
      SELECT
        id,
        "bookingRequestId",
        sha256
      FROM "payment_proofs"
      WHERE sha256 = $1
        AND "isActive" = true
      ORDER BY "uploadedAt" ASC, id ASC
      FOR UPDATE
    `,
    [sha256],
  )

  return result.rows
}

function validateExactReplayProofState(input: {
  booking: CustomBundlePaymentBookingSnapshot
  paymentMethod: BookingPaymentMethodSlug
  existingPaymentReport: NonNullable<CustomBundlePaymentBookingSnapshot['existingPaymentReport']>
  activeProofRow: PaymentProofRow | null
}): ReportCustomBundlePaymentWithSqlResult | null {
  const activeProofRow = input.activeProofRow

  if (isPaymentProofRequired(input.paymentMethod) && !activeProofRow) {
    return makePersistenceFailure(
      'PAYMENT_PROOF_STATE_INVALID',
      'El booking reportado no conserva un comprobante activo valido.',
    )
  }

  if (!activeProofRow) {
    return null
  }

  const duplicateStatus = normalizeDuplicateStatus(activeProofRow.duplicateStatus)
  if (!duplicateStatus || !isProofRowActive(activeProofRow)) {
    return makePersistenceFailure(
      'PAYMENT_PROOF_STATE_INVALID',
      'El comprobante activo persistido no es valido.',
    )
  }

  const existingPaymentReference = input.existingPaymentReport.paymentReference?.trim() ?? null
  if ((activeProofRow.reportedReference?.trim() ?? null) !== existingPaymentReference) {
    return makeReplayFailure(
      'MALFORMED_EXISTING_REPORT',
      'El comprobante persistido no coincide con la referencia reportada.',
    )
  }

  if (
    (activeProofRow.normalizedReference ?? null) !==
    (input.existingPaymentReport.paymentNormalizedReference ?? null)
  ) {
    return makeReplayFailure(
      'MALFORMED_EXISTING_REPORT',
      'El comprobante persistido no coincide con la referencia normalizada.',
    )
  }

  const proofMetadata = buildTrustedProofMetadataFromRow(activeProofRow)
  const persistedFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: input.booking.id,
    publicCode: input.booking.publicCode,
    expectedTotalUsd: input.existingPaymentReport.paymentExpectedTotalUsdSnapshot as number,
    currency: 'USD',
    paymentMethod: input.paymentMethod,
    normalizedReference: input.existingPaymentReport.paymentNormalizedReference as string,
    proofMetadata,
  })

  if (persistedFingerprint !== input.existingPaymentReport.paymentReportFingerprint) {
    return makeReplayFailure(
      'MALFORMED_EXISTING_REPORT',
      'La fingerprint persistida no coincide con el comprobante activo.',
    )
  }

  return null
}

function buildReplaySuccess(input: {
  booking: CustomBundlePaymentBookingSnapshot
  existingPaymentReport: NonNullable<CustomBundlePaymentBookingSnapshot['existingPaymentReport']>
  activeProofRow: PaymentProofRow | null
}): Extract<ReportSuccessStage, { stage: 'replayed' }> {
  return {
    ok: true,
    stage: 'replayed',
    replayed: true,
    bookingRequestId: input.booking.id,
    publicCode: input.booking.publicCode,
    operationalStatus: 'payment_reported',
    bookingStatus: 'under_review',
    paymentMethod: normalizePaymentMethod(input.existingPaymentReport.paymentMethod) as BookingPaymentMethodSlug,
    paymentReference: input.existingPaymentReport.paymentReference as string,
    normalizedReference: input.existingPaymentReport.paymentNormalizedReference as string,
    paymentReportedAtIso: (input.existingPaymentReport.paymentReportedAt as Date).toISOString(),
    expectedTotalUsd: input.existingPaymentReport.paymentExpectedTotalUsdSnapshot as number,
    currency: 'USD',
    paymentReportIdempotencyKey: input.existingPaymentReport.paymentReportIdempotencyKey as string,
    paymentReportFingerprint: input.existingPaymentReport.paymentReportFingerprint as string,
    paymentProofId: input.activeProofRow?.id ?? null,
    duplicateStatus: normalizeDuplicateStatus(input.activeProofRow?.duplicateStatus ?? null),
  }
}

function buildReportedSuccess(input: {
  bookingRequestId: string
  publicCode: string
  paymentMethod: BookingPaymentMethodSlug
  paymentReference: string
  normalizedReference: string
  paymentReportedAtIso: string
  expectedTotalUsd: number
  paymentReportIdempotencyKey: string
  paymentReportFingerprint: string
  paymentProofId: string | null
  duplicateStatus: PaymentProofDuplicateStatus | null
}): Extract<ReportSuccessStage, { stage: 'reported' }> {
  return {
    ok: true,
    stage: 'reported',
    replayed: false,
    bookingRequestId: input.bookingRequestId,
    publicCode: input.publicCode,
    operationalStatus: 'payment_reported',
    bookingStatus: 'under_review',
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    normalizedReference: input.normalizedReference,
    paymentReportedAtIso: input.paymentReportedAtIso,
    expectedTotalUsd: input.expectedTotalUsd,
    currency: 'USD',
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
    paymentReportFingerprint: input.paymentReportFingerprint,
    paymentProofId: input.paymentProofId,
    duplicateStatus: input.duplicateStatus,
  }
}

async function insertPaymentProof(
  session: CustomBundleSqlSession,
  input: {
    bookingRequestId: string
    paymentReference: string
    normalizedReference: string
    proofMetadata: CustomBundleTrustedPaymentProofMetadata
    duplicateStatus: PaymentProofDuplicateStatus
  },
): Promise<{ id: string }> {
  const paymentProofId = randomUUID()
  const result = await session.query<{ id: string }>(
    `
      INSERT INTO "payment_proofs" (
        id,
        "bookingRequestId",
        "blobPathname",
        sha256,
        "mimeType",
        "sizeBytes",
        "originalFilename",
        "uploadedAt",
        "reportedReference",
        "normalizedReference",
        "duplicateStatus",
        "isActive",
        "replacesProofId"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NULL
      )
      RETURNING id
    `,
    [
      paymentProofId,
      input.bookingRequestId,
      input.proofMetadata.blobPathname,
      input.proofMetadata.sha256,
      input.proofMetadata.mimeType,
      input.proofMetadata.sizeBytes,
      input.proofMetadata.originalFilename,
      input.proofMetadata.uploadedAt,
      input.paymentReference.trim(),
      input.normalizedReference,
      input.duplicateStatus,
    ],
  )

  return { id: result.rows[0]?.id ?? paymentProofId }
}

async function updateBookingRequestForPayment(
  session: CustomBundleSqlSession,
  input: {
    bookingRequestId: string
    now: Date
    internalNotes: string
    paymentMethod: BookingPaymentMethodSlug
    paymentReference: string
    normalizedReference: string
    expectedTotalUsd: number
    paymentReportIdempotencyKey: string
    paymentReportFingerprint: string
  },
): Promise<boolean> {
  const result = await session.query<{ id: string }>(
    `
      UPDATE "booking_requests"
      SET
        status = 'under_review',
        "internalNotes" = $2,
        "paymentMethod" = $3,
        "paymentReference" = $4,
        "paymentNormalizedReference" = $5,
        "paymentReportedAt" = $6,
        "paymentExpectedTotalUsdSnapshot" = $7,
        "paymentReportIdempotencyKey" = $8,
        "paymentReportFingerprint" = $9,
        "updatedAt" = $6
      WHERE id = $1
        AND status = 'under_review'
        AND "bookingMode" = 'custom_bundle'
        AND "pricingSource" = 'server_catalog_v1'
        AND "holdAcquiredAt" IS NOT NULL
        AND "holdExpiresAt" > $6
        AND "paymentMethod" IS NULL
        AND "paymentReference" IS NULL
        AND "paymentNormalizedReference" IS NULL
        AND "paymentReportedAt" IS NULL
        AND "paymentExpectedTotalUsdSnapshot" IS NULL
        AND "paymentReportIdempotencyKey" IS NULL
        AND "paymentReportFingerprint" IS NULL
        AND regexp_count(COALESCE("internalNotes", ''), '\\[ops_status:[^\\]]+\\]', 'i') = 1
        AND COALESCE("internalNotes", '') ~* '\\[ops_status:pending_payment\\]'
      RETURNING id
    `,
    [
      input.bookingRequestId,
      input.internalNotes,
      input.paymentMethod,
      input.paymentReference,
      input.normalizedReference,
      input.now,
      input.expectedTotalUsd.toFixed(2),
      input.paymentReportIdempotencyKey,
      input.paymentReportFingerprint,
    ],
  )

  return result.rowCount === 1
}

async function insertPaymentAuditLog(
  session: CustomBundleSqlSession,
  input: {
    bookingRequestId: string
    now: Date
    holdAcquiredAtIso: string
    holdExpiresAtIso: string
    expectedTotalUsd: number
    paymentMethod: BookingPaymentMethodSlug
    paymentReference: string
    normalizedReference: string
    paymentReportedAtIso: string
    paymentReportIdempotencyKey: string
    paymentReportFingerprint: string
    paymentProofId: string | null
    paymentProofSha256: string | null
    paymentProofDuplicateStatus: PaymentProofDuplicateStatus | null
  },
): Promise<void> {
  const previousState = {
    bookingStatus: 'under_review',
    operationalStatus: 'pending_payment',
    holdAcquiredAt: input.holdAcquiredAtIso,
    holdExpiresAt: input.holdExpiresAtIso,
    expectedTotalUsd: input.expectedTotalUsd,
    currency: 'USD',
  }

  const nextState = {
    bookingStatus: 'under_review',
    operationalStatus: 'payment_reported',
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    normalizedReference: input.normalizedReference,
    paymentReportedAt: input.paymentReportedAtIso,
    expectedTotalUsd: input.expectedTotalUsd,
    currency: 'USD',
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
    paymentReportFingerprint: input.paymentReportFingerprint,
    paymentProofId: input.paymentProofId,
    paymentProofSha256: input.paymentProofSha256,
    paymentProofDuplicateStatus: input.paymentProofDuplicateStatus,
  }

  await session.query(
    `
      INSERT INTO "audit_log" (
        id,
        "bookingRequestId",
        action,
        "previousState",
        "nextState",
        "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )
    `,
    [
      randomUUID(),
      input.bookingRequestId,
      CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
      JSON.stringify(previousState),
      JSON.stringify(nextState),
      input.now,
    ],
  )
}

export async function reportCustomBundlePaymentWithSql(
  session: CustomBundleSqlSession,
  input: ReportCustomBundlePaymentWithSqlInput,
): Promise<ReportCustomBundlePaymentWithSqlResult> {
  if (
    !session ||
    typeof session.query !== 'function' ||
    session.transactionScope !== 'single_connection'
  ) {
    return makeInvalidSqlSessionResult()
  }

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

  const proofMetadata = cloneTrustedProofMetadata(input.serverContext.proofMetadata ?? null)
  const normalizedMethod = parsedSubmission.value.paymentMethod
  if (isPaymentProofRequired(normalizedMethod) && !proofMetadata) {
    return {
      ok: false,
      stage: 'proof_policy',
      proofPolicyIssues: [
        {
          code: 'PROOF_REQUIRED',
          path: ['proofMetadata'],
          message: 'Este metodo de pago requiere un comprobante.',
        },
      ],
    }
  }

  if (proofMetadata) {
    const proofPolicyIssues = validateCustomBundleTrustedPaymentProofMetadata(
      proofMetadata,
      input.serverContext.now,
    )
    if (proofPolicyIssues.length > 0) {
      return {
        ok: false,
        stage: 'proof_policy',
        proofPolicyIssues,
      }
    }
  }

  const validatedPublicCode = parsedSubmission.value.publicCode

  for (
    let attempt = 1;
    attempt <= CUSTOM_BUNDLE_PAYMENT_REPORT_MAX_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await session.query('BEGIN ISOLATION LEVEL READ COMMITTED')

      const bookingRow = await readLockedBookingRequest(session, validatedPublicCode)
      if (!bookingRow) {
        await rollbackSilently(session)
        return makeLookupFailure('No existe una BookingRequest con ese publicCode.')
      }

      const activeProofRows = await readLockedActivePaymentProofs(session, bookingRow.id)
      if (activeProofRows.length > 1) {
        await rollbackSilently(session)
        return makePersistenceFailure(
          'PAYMENT_PROOF_STATE_INVALID',
          'La reserva conserva multiples comprobantes activos.',
        )
      }

      const activeProofRow = activeProofRows[0] ?? null
      const bookingSnapshot = buildBookingSnapshot(bookingRow)
      const prepared = prepareCustomBundlePaymentReport({
        submission: input.submission,
        serverContext: {
          now: new Date(input.serverContext.now),
          paymentReportIdempotencyKey: input.serverContext.paymentReportIdempotencyKey,
          proofMetadata,
        },
        booking: bookingSnapshot,
      })

      if (prepared.ok && prepared.stage === 'replay') {
        const existingPaymentReport = bookingSnapshot.existingPaymentReport
        if (!existingPaymentReport) {
          await rollbackSilently(session)
          return makeReplayFailure(
            'MALFORMED_EXISTING_REPORT',
            'El reporte de pago persistido no es coherente.',
          )
        }

        const replayPaymentMethod = normalizePaymentMethod(existingPaymentReport.paymentMethod)
        if (!replayPaymentMethod) {
          await rollbackSilently(session)
          return makeReplayFailure(
            'MALFORMED_EXISTING_REPORT',
            'El metodo de pago persistido no es valido.',
          )
        }

        const replayProofStateIssue = validateExactReplayProofState({
          booking: bookingSnapshot,
          paymentMethod: replayPaymentMethod,
          existingPaymentReport,
          activeProofRow,
        })
        if (replayProofStateIssue) {
          await rollbackSilently(session)
          return replayProofStateIssue
        }

        await session.query('COMMIT')
        return buildReplaySuccess({
          booking: bookingSnapshot,
          existingPaymentReport,
          activeProofRow,
        })
      }

      if (!prepared.ok) {
        await rollbackSilently(session)
        return mapPreparationFailure(prepared)
      }

      if (activeProofRow) {
        await rollbackSilently(session)
        return makePersistenceFailure(
          'PAYMENT_PROOF_STATE_INVALID',
          'La reserva ya conserva un comprobante activo.',
        )
      }

      const idempotencyConflict = await readConflictingPaymentIdempotencyKey(
        session,
        prepared.value.paymentReportIdempotencyKey,
        bookingSnapshot.id,
      )
      if (idempotencyConflict) {
        await rollbackSilently(session)
        return makePersistenceFailure(
          'PAYMENT_REPORT_IDEMPOTENCY_KEY_CONFLICT',
          'La clave global de idempotencia ya fue usada por otra reserva.',
        )
      }

      let paymentProofId: string | null = null
      let paymentProofDuplicateStatus: PaymentProofDuplicateStatus | null = null
      let paymentProofSha256: string | null = null

      if (proofMetadata) {
        const duplicateProofRows = await readDuplicateProofRows(session, proofMetadata.sha256)
        const sameBookingDuplicate = duplicateProofRows.find(
          (row) => row.bookingRequestId === bookingSnapshot.id,
        )
        if (sameBookingDuplicate) {
          await rollbackSilently(session)
          return makePersistenceFailure(
            'PAYMENT_PROOF_STATE_INVALID',
            'El booking ya conserva un comprobante activo con ese contenido.',
          )
        }

        paymentProofDuplicateStatus = duplicateProofRows.length > 0 ? 'other_booking' : 'none'

        try {
          const insertedPaymentProof = await insertPaymentProof(session, {
            bookingRequestId: bookingSnapshot.id,
            paymentReference: prepared.value.paymentReference,
            normalizedReference: prepared.value.normalizedReference,
            proofMetadata,
            duplicateStatus: paymentProofDuplicateStatus,
          })
          paymentProofId = insertedPaymentProof.id
          paymentProofSha256 = proofMetadata.sha256
        } catch (error) {
          if (isUniqueViolation(error) && /blobpathname/i.test(getConstraintName(error) ?? '')) {
            await rollbackSilently(session)
            return makePersistenceFailure(
              'PAYMENT_PROOF_PATH_CONFLICT',
              'El blobPathname del comprobante ya existe en otro registro activo.',
            )
          }

          throw error
        }
      }

      const updated = await updateBookingRequestForPayment(session, {
        bookingRequestId: bookingSnapshot.id,
        now: input.serverContext.now,
        internalNotes: setCustomBundlePaymentReportedOperationalStatus(bookingSnapshot.internalNotes),
        paymentMethod: prepared.value.paymentMethod,
        paymentReference: prepared.value.paymentReference,
        normalizedReference: prepared.value.normalizedReference,
        expectedTotalUsd: prepared.value.expectedTotalUsd,
        paymentReportIdempotencyKey: prepared.value.paymentReportIdempotencyKey,
        paymentReportFingerprint: prepared.value.paymentReportFingerprint,
      })

      if (!updated) {
        await rollbackSilently(session)
        return makePersistenceFailure(
          'PAYMENT_REPORT_WRITE_CONFLICT',
          'La reserva ya no cumple las condiciones para reportar el pago.',
        )
      }

      try {
        await insertPaymentAuditLog(session, {
          bookingRequestId: bookingSnapshot.id,
          now: input.serverContext.now,
          holdAcquiredAtIso: (bookingSnapshot.holdAcquiredAt as Date).toISOString(),
          holdExpiresAtIso: (bookingSnapshot.holdExpiresAt as Date).toISOString(),
          expectedTotalUsd: prepared.value.expectedTotalUsd,
          paymentMethod: prepared.value.paymentMethod,
          paymentReference: prepared.value.paymentReference,
          normalizedReference: prepared.value.normalizedReference,
          paymentReportedAtIso: prepared.value.paymentReportedAtIso,
          paymentReportIdempotencyKey: prepared.value.paymentReportIdempotencyKey,
          paymentReportFingerprint: prepared.value.paymentReportFingerprint,
          paymentProofId,
          paymentProofSha256,
          paymentProofDuplicateStatus,
        })
      } catch (error) {
        throw error
      }

      await session.query('COMMIT')
      return buildReportedSuccess({
        bookingRequestId: bookingSnapshot.id,
        publicCode: bookingSnapshot.publicCode,
        paymentMethod: prepared.value.paymentMethod,
        paymentReference: prepared.value.paymentReference,
        normalizedReference: prepared.value.normalizedReference,
        paymentReportedAtIso: prepared.value.paymentReportedAtIso,
        expectedTotalUsd: prepared.value.expectedTotalUsd,
        paymentReportIdempotencyKey: prepared.value.paymentReportIdempotencyKey,
        paymentReportFingerprint: prepared.value.paymentReportFingerprint,
        paymentProofId,
        duplicateStatus: paymentProofDuplicateStatus,
      })
    } catch (error) {
      await rollbackSilently(session)

      if (isRetryableTransactionError(error)) {
        if (attempt < CUSTOM_BUNDLE_PAYMENT_REPORT_MAX_TRANSACTION_ATTEMPTS) {
          continue
        }

        return makePersistenceFailure(
          'TRANSACTION_RETRY_EXHAUSTED',
          'No se pudo reportar el pago tras varios intentos transaccionales.',
        )
      }

      if (isUniqueViolation(error)) {
        const constraint = getConstraintName(error) ?? ''
        if (constraint === PAYMENT_IDEMPOTENCY_CONSTRAINT) {
          return makePersistenceFailure(
            'PAYMENT_REPORT_IDEMPOTENCY_KEY_CONFLICT',
            'La clave global de idempotencia ya fue usada por otra reserva.',
          )
        }

        if (/blobpathname/i.test(constraint)) {
          return makePersistenceFailure(
            'PAYMENT_PROOF_PATH_CONFLICT',
            'El blobPathname del comprobante ya existe en otro registro activo.',
          )
        }
      }

      return makePersistenceFailure(
        'DATABASE_WRITE_FAILED',
        'No se pudo reportar el pago consolidado.',
      )
    }
  }

  return makePersistenceFailure(
    'TRANSACTION_RETRY_EXHAUSTED',
    'No se pudo reportar el pago tras varios intentos transaccionales.',
  )
}

export {
  buildCustomBundlePaymentReportFingerprint,
  extractCustomBundleOperationalTags,
  normalizeCustomBundlePaymentReference,
}
