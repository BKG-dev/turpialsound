import { setCustomBundleExpiredOperationalStatus, validateCustomBundleHoldReplayOperationalNotes } from '@/lib/bookings/custom-bundle-hold-operational-notes'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

export const CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION = 'custom_bundle_hold_expired' as const
export const CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON = 'hold_window_elapsed' as const
export const CUSTOM_BUNDLE_HOLD_EXPIRATION_DEFAULT_BATCH_SIZE = 100 as const
export const CUSTOM_BUNDLE_HOLD_EXPIRATION_MAX_BATCH_SIZE = 500 as const

export interface CustomBundleHoldExpirationServerContext {
  now: Date
  batchSize?: number
}

export interface CustomBundleHoldExpirationContextIssue {
  code: 'INVALID_SQL_SESSION' | 'INVALID_NOW' | 'INVALID_BATCH_SIZE'
  message: string
}

export interface CustomBundleHoldExpirationRecord {
  bookingRequestId: string
  publicCode: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  expiredAtIso: string
}

export type CustomBundleHoldExpirationResult =
  | {
      ok: false
      stage: 'server_context'
      code: 'INVALID_SQL_SESSION' | 'INVALID_NOW' | 'INVALID_BATCH_SIZE'
      message: string
    }
  | {
      ok: false
      stage: 'persistence'
      code: 'DATABASE_WRITE_FAILED' | 'TRANSACTION_RETRY_EXHAUSTED'
      message: string
    }
  | {
      ok: true
      stage: 'expired'
      selected: number
      expired: number
      skipped: number
      hasMore: boolean
      expiredBookings: CustomBundleHoldExpirationRecord[]
    }

interface ExpirationCandidateRow {
  id: string
  publicCode: string
  holdAcquiredAt: Date | string | null
  holdExpiresAt: Date | string | null
  internalNotes: string | null
}

interface ExpirationAuditState {
  bookingStatus: 'under_review' | 'rejected'
  operationalStatus: 'pending_payment' | 'expired'
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  expiredAtIso?: string
  reason?: typeof CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON
}

const BOOKING_REQUEST_BOOKING_MODE = 'custom_bundle'
const BOOKING_REQUEST_PRICING_SOURCE = 'server_catalog_v1'
const BOOKING_REQUEST_STATUS = 'under_review'
const BOOKING_REQUEST_REJECTED_STATUS = 'rejected'
const TRANSACTION_RETRYABLE_CODES = new Set(['40001', '40P01'])
const MAX_TRANSACTION_ATTEMPTS = 3

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return isValidDate(parsed) ? parsed : null
  }

  return null
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    TRANSACTION_RETRYABLE_CODES.has((error as { code: string }).code)
  )
}

function rollbackSilently(session: CustomBundleSqlSession): Promise<void> {
  return session.query('ROLLBACK').then(
    () => {},
    () => {},
  )
}

function makeServerContextIssue(
  code: 'INVALID_SQL_SESSION' | 'INVALID_NOW' | 'INVALID_BATCH_SIZE',
  message: string,
): Extract<CustomBundleHoldExpirationResult, { stage: 'server_context' }> {
  return {
    ok: false,
    stage: 'server_context',
    code,
    message,
  }
}

function makePersistenceIssue(
  code: 'DATABASE_WRITE_FAILED' | 'TRANSACTION_RETRY_EXHAUSTED',
  message: string,
): Extract<CustomBundleHoldExpirationResult, { stage: 'persistence' }> {
  return {
    ok: false,
    stage: 'persistence',
    code,
    message,
  }
}

function normalizeBatchSize(value: number | undefined): number {
  return value ?? CUSTOM_BUNDLE_HOLD_EXPIRATION_DEFAULT_BATCH_SIZE
}

function validateServerContext(
  context: CustomBundleHoldExpirationServerContext,
): {
  ok: true
  batchSize: number
} | {
  ok: false
  code: 'INVALID_NOW' | 'INVALID_BATCH_SIZE'
  message: string
} {
  if (!isValidDate(context.now)) {
    return {
      ok: false,
      code: 'INVALID_NOW',
      message: 'El instante actual del servidor no es valido.',
    }
  }

  const batchSize = normalizeBatchSize(context.batchSize)
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > CUSTOM_BUNDLE_HOLD_EXPIRATION_MAX_BATCH_SIZE) {
    return {
      ok: false,
      code: 'INVALID_BATCH_SIZE',
      message: 'El batch del writer de expiracion debe ser un entero entre 1 y 500.',
    }
  }

  return {
    ok: true,
    batchSize,
  }
}

function buildExpirationWhereClause(): string {
  return `
      FROM "booking_requests" br
      WHERE br."bookingMode" = $1
        AND br."pricingSource" = $2
        AND br.status = $3
        AND br."holdAcquiredAt" IS NOT NULL
        AND br."holdExpiresAt" IS NOT NULL
        AND br."holdExpiresAt" <= $4
        AND NOT EXISTS (
          SELECT 1
          FROM "payment_proofs" pp
          WHERE pp."bookingRequestId" = br.id
            AND pp."isActive" = true
        )
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:payment_reported]%'
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:payment_verified]%'
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:confirmed]%'
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:cancelled]%'
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:expired]%'
        AND COALESCE(br."internalNotes", '') NOT ILIKE '%[ops_status:submitted]%'
    `
}

async function selectExpirationCandidates(
  session: CustomBundleSqlSession,
  now: Date,
  batchSize: number,
): Promise<ExpirationCandidateRow[]> {
  const result = await session.query<ExpirationCandidateRow>(
    `
      SELECT
        br.id,
        br."publicCode",
        br."holdAcquiredAt",
        br."holdExpiresAt",
        br."internalNotes"
      ${buildExpirationWhereClause()}
      ORDER BY br."holdExpiresAt" ASC, br.id ASC
      LIMIT $5
      FOR UPDATE SKIP LOCKED
    `,
    [BOOKING_REQUEST_BOOKING_MODE, BOOKING_REQUEST_PRICING_SOURCE, BOOKING_REQUEST_STATUS, now, batchSize],
  )

  return result.rows
}

async function hasMoreExpirationCandidates(
  session: CustomBundleSqlSession,
  now: Date,
): Promise<boolean> {
  const result = await session.query<{ hasMore: boolean }>(
    `
      SELECT EXISTS(
        SELECT 1
        ${buildExpirationWhereClause()}
        LIMIT 1
      ) AS "hasMore"
    `,
    [BOOKING_REQUEST_BOOKING_MODE, BOOKING_REQUEST_PRICING_SOURCE, BOOKING_REQUEST_STATUS, now],
  )

  return Boolean(result.rows[0]?.hasMore)
}

async function expireSelectedBookingRequest(
  session: CustomBundleSqlSession,
  row: ExpirationCandidateRow,
  now: Date,
): Promise<CustomBundleHoldExpirationRecord | null> {
  const holdAcquiredAt = toValidDate(row.holdAcquiredAt)
  const holdExpiresAt = toValidDate(row.holdExpiresAt)

  if (!holdAcquiredAt || !holdExpiresAt) {
    return null
  }

  const operationalNotes = validateCustomBundleHoldReplayOperationalNotes({
    status: BOOKING_REQUEST_STATUS,
    internalNotes: row.internalNotes,
    holdExpiresAt,
    now,
  })

  if (!operationalNotes.ok) {
    return null
  }

  const nextInternalNotes = setCustomBundleExpiredOperationalStatus(row.internalNotes)

  const updateResult = await session.query(
    `
      UPDATE "booking_requests"
      SET
        status = $2,
        "internalNotes" = $3,
        "updatedAt" = $4
      WHERE id = $1
    `,
    [
      row.id,
      BOOKING_REQUEST_REJECTED_STATUS,
      nextInternalNotes,
      now,
    ],
  )

  if ((updateResult.rowCount ?? 0) !== 1) {
    return null
  }

  const previousState: ExpirationAuditState = {
    bookingStatus: BOOKING_REQUEST_STATUS,
    operationalStatus: 'pending_payment',
    holdAcquiredAtIso: holdAcquiredAt.toISOString(),
    holdExpiresAtIso: holdExpiresAt.toISOString(),
  }

  const nextState: ExpirationAuditState = {
    bookingStatus: BOOKING_REQUEST_REJECTED_STATUS,
    operationalStatus: 'expired',
    holdAcquiredAtIso: holdAcquiredAt.toISOString(),
    holdExpiresAtIso: holdExpiresAt.toISOString(),
    expiredAtIso: now.toISOString(),
    reason: CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON,
  }

  await session.query(
    `
      INSERT INTO "audit_log" (
        "bookingRequestId",
        action,
        "previousState",
        "nextState",
        "createdAt"
      ) VALUES (
        $1,
        $2,
        $3::jsonb,
        $4::jsonb,
        $5
      )
    `,
    [
      row.id,
      CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
      JSON.stringify(previousState),
      JSON.stringify(nextState),
      now,
    ],
  )

  return {
    bookingRequestId: row.id,
    publicCode: row.publicCode,
    holdAcquiredAtIso: holdAcquiredAt.toISOString(),
    holdExpiresAtIso: holdExpiresAt.toISOString(),
    expiredAtIso: now.toISOString(),
  }
}

export async function expireCustomBundleHoldsWithSql(
  session: CustomBundleSqlSession,
  input: {
    serverContext: CustomBundleHoldExpirationServerContext
  },
): Promise<CustomBundleHoldExpirationResult> {
  if (session.transactionScope !== 'single_connection') {
    return makeServerContextIssue(
      'INVALID_SQL_SESSION',
      'La expiracion de holds requiere una conexion SQL transaccional dedicada.',
    )
  }

  const serverContext = validateServerContext(input.serverContext)
  if (!serverContext.ok) {
    return makeServerContextIssue(serverContext.code, serverContext.message)
  }

  const now = new Date(input.serverContext.now.getTime())

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await session.query('BEGIN ISOLATION LEVEL READ COMMITTED')

      const candidates = await selectExpirationCandidates(session, now, serverContext.batchSize)
      let expired = 0
      const expiredBookings: CustomBundleHoldExpirationRecord[] = []

      for (const candidate of candidates) {
        const expiredBooking = await expireSelectedBookingRequest(session, candidate, now)
        if (!expiredBooking) {
          continue
        }

        expired += 1
        expiredBookings.push(expiredBooking)
      }

      const hasMore = await hasMoreExpirationCandidates(session, now)

      await session.query('COMMIT')

      return {
        ok: true,
        stage: 'expired',
        selected: candidates.length,
        expired,
        skipped: candidates.length - expired,
        hasMore,
        expiredBookings,
      }
    } catch (error) {
      await rollbackSilently(session)

      if (isRetryableTransactionError(error)) {
        if (attempt < MAX_TRANSACTION_ATTEMPTS) {
          continue
        }

        return makePersistenceIssue(
          'TRANSACTION_RETRY_EXHAUSTED',
          'No se pudo completar la expiracion del hold tras varios intentos.',
        )
      }

      return makePersistenceIssue(
        'DATABASE_WRITE_FAILED',
        'No se pudo completar la expiracion del hold.',
      )
    }
  }

  return makePersistenceIssue(
    'TRANSACTION_RETRY_EXHAUSTED',
    'No se pudo completar la expiracion del hold tras varios intentos.',
  )
}
