import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  reportCustomBundlePaymentWithSql,
  setCustomBundlePaymentReportedOperationalStatus,
  CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
  CUSTOM_BUNDLE_PAYMENT_REPORT_MAX_TRANSACTION_ATTEMPTS,
  CUSTOM_BUNDLE_PAYMENT_REPORT_VERSION,
  type ReportCustomBundlePaymentWithSqlInput,
} from '@/lib/bookings/custom-bundle-payment-reporting'
import type {
  CustomBundlePaymentServerContext,
  CustomBundlePaymentReportSubmission,
  CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

type ScriptedQueryStep = {
  assert?: (sql: string, params: readonly unknown[]) => void
  result?: { rows: Array<Record<string, unknown>>; rowCount: number | null }
  error?: Error & { code?: string; constraint?: string }
}

type ScriptedSqlSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_reporting_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function createScriptedSession(
  steps: ScriptedQueryStep[],
  transactionScope: CustomBundleSqlSession['transactionScope'] | string = 'single_connection',
): ScriptedSqlSession {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  let index = 0

  return {
    transactionScope: transactionScope as CustomBundleSqlSession['transactionScope'],
    calls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      calls.push({ sql, params: [...params] })
      const step = steps[index++]
      if (!step) {
        throw new Error(`Unexpected query at step ${index}: ${sql}`)
      }

      step.assert?.(sql, params)

      if (step.error) {
        throw step.error
      }

      return (step.result ?? { rows: [], rowCount: 0 }) as {
        rows: Row[]
        rowCount: number | null
      }
    },
  }
}

function makePostgresError(
  code: string,
  message: string,
  constraint?: string,
): Error & { code: string; constraint?: string } {
  const error = new Error(message) as Error & { code: string; constraint?: string }
  error.code = code
  if (constraint) {
    error.constraint = constraint
  }
  return error
}

function makeSubmission(
  overrides: Partial<CustomBundlePaymentReportSubmission> = {},
): CustomBundlePaymentReportSubmission {
  return {
    publicCode: 'TUR-2026-010',
    paymentMethod: 'pago_movil',
    paymentReference: ' REF-100 ',
    ...overrides,
  }
}

function makeProofMetadata(
  overrides: Partial<CustomBundleTrustedPaymentProofMetadata> = {},
): CustomBundleTrustedPaymentProofMetadata {
  return {
    blobPathname: 'payment-proofs/TUR-2026-010/20260623T140000000Z-proof.webp',
    sha256: 'a'.repeat(64),
    mimeType: 'image/png',
    sizeBytes: 2048,
    originalFilename: 'proof.png',
    uploadedAt: new Date('2026-06-23T14:00:00.000Z'),
    ...overrides,
  }
}

function makeServerContext(
  overrides: Partial<CustomBundlePaymentServerContext> = {},
): CustomBundlePaymentServerContext {
  return {
    now: new Date('2026-06-23T14:30:00.000Z'),
    paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0100',
    proofMetadata: null,
    ...overrides,
  }
}

function makeInput(
  submissionOverrides: Partial<CustomBundlePaymentReportSubmission> = {},
  contextOverrides: Partial<CustomBundlePaymentServerContext> = {},
): ReportCustomBundlePaymentWithSqlInput {
  return {
    submission: makeSubmission(submissionOverrides),
    serverContext: makeServerContext(contextOverrides),
  }
}

function makeLockedBookingRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'booking-payment-001',
    publicCode: 'TUR-2026-010',
    status: 'under_review',
    internalNotes: '[ops_status:pending_payment]\nnota interna',
    bookingMode: 'custom_bundle',
    pricingSource: 'server_catalog_v1',
    holdAcquiredAt: new Date('2026-06-23T14:00:00.000Z'),
    holdExpiresAt: new Date('2026-06-23T15:00:00.000Z'),
    estimatedTotal: '280.00',
    currency: 'USD',
    paymentMethod: null,
    paymentReference: null,
    paymentNormalizedReference: null,
    paymentReportedAt: null,
    paymentExpectedTotalUsdSnapshot: null,
    paymentReportIdempotencyKey: null,
    paymentReportFingerprint: null,
    ...overrides,
  }
}

function makeReplayBookingRow(
  fingerprint: string,
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return makeLockedBookingRow({
    status: 'under_review',
    internalNotes: '[ops_status:payment_reported]\nnota interna',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-100',
    paymentNormalizedReference: 'REF100',
    paymentReportedAt: new Date('2026-06-23T14:30:00.000Z'),
    paymentExpectedTotalUsdSnapshot: '280.00',
    paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0100',
    paymentReportFingerprint: fingerprint,
    ...overrides,
  })
}

function makeProofRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'proof-001',
    bookingRequestId: 'booking-payment-001',
    blobPathname: 'payment-proofs/TUR-2026-010/20260623T140000000Z-proof.webp',
    sha256: 'a'.repeat(64),
    mimeType: 'image/png',
    sizeBytes: 2048,
    originalFilename: 'proof.png',
    uploadedAt: new Date('2026-06-23T14:00:00.000Z'),
    reportedReference: 'REF-100',
    normalizedReference: 'REF100',
    duplicateStatus: 'none',
    isActive: true,
    ...overrides,
  }
}

function assertNoSqlCalls(session: ScriptedSqlSession): void {
  assert.equal(session.calls.length, 0, 'Expected zero SQL calls.')
}

function assertNoCallMatches(session: ScriptedSqlSession, pattern: RegExp): void {
  assert.equal(
    session.calls.some((call) => pattern.test(call.sql)),
    false,
    `Unexpected SQL matched ${pattern}`,
  )
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0)
  assert.equal(/postgres|host|connection|string|sql/i.test(message), false)
}

async function main(): Promise<void> {
  assert.equal(CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION, 'custom_bundle_payment_reported')
  assert.equal(CUSTOM_BUNDLE_PAYMENT_REPORT_VERSION, 'custom_bundle_payment_reporting_v1')
  assert.equal(CUSTOM_BUNDLE_PAYMENT_REPORT_MAX_TRANSACTION_ATTEMPTS, 3)
  assert.equal(
    setCustomBundlePaymentReportedOperationalStatus('[ops_status:pending_payment]\nnota interna'),
    '[ops_status:payment_reported]\nnota interna',
  )
  assert.equal(
    setCustomBundlePaymentReportedOperationalStatus('[ops_status:payment_reported]\nnota interna'),
    '[ops_status:payment_reported]\nnota interna',
  )

  const source = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-reporting.ts'),
    'utf8',
  )
  for (const [pattern, label] of [
    [/from\s+['"]prisma['"]/, 'Prisma import'],
    [/from\s+['"]pg['"]/, 'pg import'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db import'],
    [/process\.env/, 'process.env'],
    [/payment-proof-upload/, 'payment-proof-upload import'],
    [/@vercel\/blob/, 'Blob import'],
    [/fetch\s*\(/, 'fetch'],
    [/['"]use server['"]/, 'use server'],
  ] as const) {
    assert.equal(pattern.test(source), false, label)
  }

  // Case 1: invalid SQL session.
  {
    const session = createScriptedSession([], 'pool_query')
    const result = await reportCustomBundlePaymentWithSql(session, makeInput())
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'server_context')
    if (!result.ok && result.stage === 'server_context' && 'code' in result) {
      assert.equal(result.code, 'INVALID_SQL_SESSION')
    }
    assertNoSqlCalls(session)
  }

  // Case 2: invalid submission.
  {
    const session = createScriptedSession([])
    const result = await reportCustomBundlePaymentWithSql(session, {
      submission: { publicCode: 'BAD', paymentMethod: 'pago_movil', paymentReference: 'REF' },
      serverContext: makeServerContext(),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'contract')
    assertNoSqlCalls(session)
  }

  // Case 3: invalid context.
  {
    const session = createScriptedSession([])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { paymentReportIdempotencyKey: 'short' }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'server_context')
    assertNoSqlCalls(session)
  }

  // Case 4: invalid proof.
  {
    const session = createScriptedSession([])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput(
        {},
        { proofMetadata: makeProofMetadata({ sizeBytes: 0 }) },
      ),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'proof_policy')
    assertNoSqlCalls(session)
  }

  // Case 5: booking not found.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "booking_requests"/i)
          assert.match(sql, /FOR UPDATE/i)
        },
        result: { rows: [], rowCount: 0 },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'lookup')
    if (!result.ok && result.stage === 'lookup') {
      assert.equal(result.code, 'BOOKING_NOT_FOUND')
    }
  }

  const replayContext = makeServerContext({ proofMetadata: makeProofMetadata() })
  const replaySeed = await reportCustomBundlePaymentWithSql(
    createScriptedSession([] as ScriptedQueryStep[], 'pool_query'),
    {
      submission: makeSubmission(),
      serverContext: replayContext,
    },
  ).catch(() => null)
  void replaySeed

  // Case 6: exact replay with persisted timestamp and no writes.
  {
    const replayFingerprintSource = readFileSync(
      resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-contract.ts'),
      'utf8',
    )
    assert.match(replayFingerprintSource, /buildCustomBundlePaymentReportFingerprint/)
    const replaySessionForSeed = createScriptedSession([])
    void replaySessionForSeed
    const replayModule = await import('@/lib/bookings/custom-bundle-payment-contract')
    const replayFingerprint = replayModule.buildCustomBundlePaymentReportFingerprint({
      bookingRequestId: 'booking-payment-001',
      publicCode: 'TUR-2026-010',
      expectedTotalUsd: 280,
      currency: 'USD',
      paymentMethod: 'pago_movil',
      normalizedReference: 'REF100',
      proofMetadata: makeProofMetadata(),
    })

    const session = createScriptedSession([
      { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
      { result: { rows: [makeReplayBookingRow(replayFingerprint)], rowCount: 1 } },
      {
        assert(sql) {
          assert.match(sql, /FROM "payment_proofs"/i)
          assert.match(sql, /FOR UPDATE/i)
        },
        result: { rows: [makeProofRow()], rowCount: 1 },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'replayed')
    if (result.ok && result.stage === 'replayed') {
      assert.equal(result.replayed, true)
      assert.equal(result.paymentReportedAtIso, '2026-06-23T14:30:00.000Z')
      assert.equal(result.paymentProofId, 'proof-001')
      assert.equal(result.duplicateStatus, 'none')
    }
    assertNoCallMatches(session, /INSERT INTO "payment_proofs"/i)
    assertNoCallMatches(session, /UPDATE "booking_requests"/i)
    assertNoCallMatches(session, /INSERT INTO "audit_log"/i)
  }

  // Case 7: replay key conflict.
  {
    const replayModule = await import('@/lib/bookings/custom-bundle-payment-contract')
    const persistedReplayFingerprint = replayModule.buildCustomBundlePaymentReportFingerprint({
      bookingRequestId: 'booking-payment-001',
      publicCode: 'TUR-2026-010',
      expectedTotalUsd: 280,
      currency: 'USD',
      paymentMethod: 'pago_movil',
      normalizedReference: 'REF100',
      proofMetadata: makeProofMetadata(),
    })
    const session = createScriptedSession([
      { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
      { result: { rows: [makeReplayBookingRow(persistedReplayFingerprint)], rowCount: 1 } },
      { result: { rows: [makeProofRow()], rowCount: 1 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({ paymentReference: 'REF-999' }, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'replay')
    if (!result.ok && result.stage === 'replay') {
      assert.equal(result.code, 'IDEMPOTENCY_KEY_CONFLICT')
    }
  }

  // Case 8: malformed existing report.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      {
        result: {
          rows: [
            makeLockedBookingRow({
              internalNotes: '[ops_status:payment_reported]',
              paymentMethod: 'pago_movil',
              paymentReference: null,
            }),
          ],
          rowCount: 1,
        },
      },
      { result: { rows: [], rowCount: 0 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'replay')
    if (!result.ok && result.stage === 'replay') {
      assert.equal(result.code, 'MALFORMED_EXISTING_REPORT')
    }
  }

  // Case 9: hold expired for new report.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      {
        result: {
          rows: [
            makeLockedBookingRow({
              holdExpiresAt: new Date('2026-06-23T14:30:00.000Z'),
            }),
          ],
          rowCount: 1,
        },
      },
      { result: { rows: [], rowCount: 0 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'booking_eligibility')
  }

  // Case 10: valid new report with duplicate proof from another booking.
  {
    const session = createScriptedSession([
      { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      {
        assert(sql) {
          assert.match(sql, /FROM "payment_proofs"/i)
          assert.match(sql, /sha256 = \$1/i)
          assert.match(sql, /FOR UPDATE/i)
        },
        result: {
          rows: [
            {
              id: 'proof-other-001',
              bookingRequestId: 'booking-other-001',
              sha256: 'a'.repeat(64),
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql, params) {
          assert.match(sql, /INSERT INTO "payment_proofs"/i)
          assert.equal(params[8], 'REF-100')
          assert.equal(params[9], 'REF100')
          assert.equal(params[10], 'other_booking')
        },
        result: { rows: [{ id: 'proof-new-001' }], rowCount: 1 },
      },
      {
        assert(sql) {
          assert.match(sql, /UPDATE "booking_requests"/i)
          assert.match(sql, /"holdExpiresAt" > \$6/i)
          assert.match(sql, /"paymentMethod" IS NULL/i)
          assert.match(sql, /regexp_count/i)
          assert.match(sql, /pending_payment/i)
        },
        result: { rows: [{ id: 'booking-payment-001' }], rowCount: 1 },
      },
      {
        assert(sql, params) {
          assert.match(sql, /INSERT INTO "audit_log"/i)
          assert.equal(params[2], 'custom_bundle_payment_reported')
        },
        result: { rows: [], rowCount: 1 },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'reported')
    if (result.ok && result.stage === 'reported') {
      assert.equal(result.paymentProofId, 'proof-new-001')
      assert.equal(result.duplicateStatus, 'other_booking')
      assert.equal(result.operationalStatus, 'payment_reported')
      assert.equal(result.expectedTotalUsd, 280)
    }
  }

  // Case 11: efectivo without proof and no proof insert.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      {
        assert(sql) {
          assert.match(sql, /UPDATE "booking_requests"/i)
        },
        result: { rows: [{ id: 'booking-payment-001' }], rowCount: 1 },
      },
      { result: { rows: [], rowCount: 1 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'COMMIT') } },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({ paymentMethod: 'efectivo' }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'reported')
    if (result.ok && result.stage === 'reported') {
      assert.equal(result.paymentProofId, null)
      assert.equal(result.duplicateStatus, null)
    }
    assertNoCallMatches(session, /INSERT INTO "payment_proofs"/i)
  }

  // Case 12: active proof already on the same booking.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [makeProofRow()], rowCount: 1 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'PAYMENT_PROOF_STATE_INVALID')
    }
  }

  // Case 13: blob path conflict.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      {
        error: makePostgresError(
          '23505',
          'duplicate blob',
          'payment_proofs_blobPathname_key',
        ),
      },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])

    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'PAYMENT_PROOF_PATH_CONFLICT')
    }
  }

  // Case 14: payment report idempotency key conflict from update.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [{ id: 'proof-new-001' }], rowCount: 1 } },
      {
        error: makePostgresError(
          '23505',
          'duplicate key',
          'booking_requests_payment_report_idempotency_key_uniq',
        ),
      },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'PAYMENT_REPORT_IDEMPOTENCY_KEY_CONFLICT')
    }
  }

  // Case 15: write guard conflict.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      {
        result: { rows: [], rowCount: 0 },
      },
      {
        result: { rows: [], rowCount: 0 },
      },
      {
        result: { rows: [], rowCount: 0 },
      },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({ paymentMethod: 'efectivo' }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'PAYMENT_REPORT_WRITE_CONFLICT')
    }
  }

  // Case 16: audit failure triggers rollback.
  {
    const session = createScriptedSession([
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [{ id: 'proof-new-002' }], rowCount: 1 } },
      { result: { rows: [{ id: 'booking-payment-001' }], rowCount: 1 } },
      { error: makePostgresError('XX000', 'audit fail') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({}, { proofMetadata: makeProofMetadata() }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'DATABASE_WRITE_FAILED')
      assertSafeMessage(result.message)
    }
  }

  // Case 17: retry 40001 then succeed.
  {
    const session = createScriptedSession([
      { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
      { error: makePostgresError('40001', 'serialization failure') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
      { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
      { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [], rowCount: 0 } },
      { result: { rows: [{ id: 'booking-payment-001' }], rowCount: 1 } },
      { result: { rows: [], rowCount: 1 } },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'COMMIT') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({ paymentMethod: 'efectivo' }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'reported')
    assert.equal(
      session.calls.filter((call) => /^BEGIN ISOLATION LEVEL READ COMMITTED/i.test(call.sql)).length,
      2,
    )
  }

  // Case 18: retry 40P01 exhausted.
  {
    const session = createScriptedSession([
      { error: makePostgresError('40P01', 'deadlock') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
      { error: makePostgresError('40P01', 'deadlock') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
      { error: makePostgresError('40P01', 'deadlock') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])
    const result = await reportCustomBundlePaymentWithSql(
      session,
      makeInput({ paymentMethod: 'efectivo' }),
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'persistence')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'TRANSACTION_RETRY_EXHAUSTED')
    }
  }

  const originalInput = makeInput({}, { proofMetadata: makeProofMetadata() })
  const inputSnapshot = clone(originalInput)
  const immutabilitySession = createScriptedSession([
    { assert(sql) { assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i) } },
    { result: { rows: [makeLockedBookingRow()], rowCount: 1 } },
    { result: { rows: [], rowCount: 0 } },
    { result: { rows: [], rowCount: 0 } },
    { result: { rows: [], rowCount: 0 } },
    { result: { rows: [{ id: 'proof-new-immutability' }], rowCount: 1 } },
    { result: { rows: [{ id: 'booking-payment-001' }], rowCount: 1 } },
    { result: { rows: [], rowCount: 1 } },
    { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'COMMIT') } },
  ])
  const immutabilityResult = await reportCustomBundlePaymentWithSql(
    immutabilitySession,
    originalInput,
  )
  assert.equal(immutabilityResult.ok, true)
  assert.deepStrictEqual(originalInput, inputSnapshot)

  console.log('booking_custom_bundle_payment_reporting_contract OK')
  console.log('row lock: verified')
  console.log('authoritative total: verified')
  console.log('new payment report: verified')
  console.log('exact replay no writes: verified')
  console.log('payment update guards: verified')
  console.log('payment proof persistence: verified')
  console.log('proof duplicate classification: verified')
  console.log('audit rollback: verified')
  console.log('transaction retry: verified')
  console.log('no side effects: verified')
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error), error)
})
