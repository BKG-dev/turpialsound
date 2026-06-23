import assert from 'node:assert/strict'

import {
  acquireCustomBundleHoldWithSql,
  type AcquireCustomBundleHoldInput,
} from '@/lib/bookings/custom-bundle-hold-acquisition'
import {
  prepareCustomBundleHoldContract,
  type CustomBundleHoldServerContext,
} from '@/lib/bookings/custom-bundle-hold-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'

type ScriptedQueryStep = {
  assert?: (sql: string, params: readonly unknown[]) => void
  result?: { rows: Array<Record<string, unknown>>; rowCount: number | null }
  error?: Error & { code?: string }
}

type ScriptedSqlSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

function fail(message: string): never {
  console.error('booking_custom_bundle_hold_acquisition_contract FAILED')
  console.error(message)
  process.exit(1)
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observacion canonical de hold acquisition  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: 60 },
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
      { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'grabaciones-voces', quantity: 2, sessionDurationMinutes: null },
    ],
  }

  return {
    ...base,
    ...overrides,
    requester: {
      ...base.requester,
      ...(overrides.requester ?? {}),
    },
    items: overrides.items ?? base.items,
  }
}

function buildServerContext(
  overrides: Partial<CustomBundleHoldServerContext & { publicCode: string }> = {},
): AcquireCustomBundleHoldInput['serverContext'] {
  return {
    publicCode: 'TUR-0707-001',
    idempotencyKey: 'HOLD_2026:06:22-0001',
    now: new Date('2026-06-22T16:00:00.000Z'),
    holdDurationMinutes: 60,
    ...overrides,
  }
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
      if (
        /^SELECT\s+pg_advisory_(?:xact_)?lock\(hashtext\(\$1\)\)/i.test(sql.trim()) ||
        /^SELECT\s+pg_advisory_unlock\(hashtext\(\$1\)\)/i.test(sql.trim())
      ) {
        return { rows: [], rowCount: 0 } as { rows: Row[]; rowCount: number | null }
      }

      const step = steps[index++]
      if (!step) {
        throw new Error(`Unexpected query at step ${index}: ${sql}`)
      }

      if (step.assert) {
        step.assert(sql, params)
      }

      if (step.error) {
        throw step.error
      }

      return (step.result ?? { rows: [], rowCount: 0 }) as { rows: Row[]; rowCount: number | null }
    },
  }
}

function makePostgresError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

function expectResultStage<T extends { stage: string }, S extends T['stage']>(
  result: T,
  stage: S,
  label: string,
): asserts result is Extract<T, { stage: S }> {
  assert.equal(result.stage, stage, label)
}

function assertNoSqlCalls(session: ScriptedSqlSession): void {
  assert.equal(session.calls.length, 0, 'Expected zero SQL calls.')
}

function assertCallIncludes(session: ScriptedSqlSession, index: number, pattern: RegExp): void {
  assert.ok(session.calls[index], `Missing SQL call ${index + 1}.`)
  assert.match(session.calls[index].sql, pattern)
}

function assertNoCallIncludes(session: ScriptedSqlSession, pattern: RegExp): void {
  assert.ok(!session.calls.some((call) => pattern.test(call.sql)), `Unexpected SQL: ${pattern}`)
}

function buildCanonicalPreparedHold() {
  const submission = buildSubmission()
  const serverContext = buildServerContext()
  const prepared = prepareCustomBundleHoldContract({
    submission,
    serverContext,
  })

  if (!prepared.ok || prepared.stage !== 'ready') {
    throw new Error('Canonical hold preparation failed in the contract harness.')
  }

  return { submission, serverContext, prepared: prepared.value }
}

function buildAcquireInput(
  submission: CustomBundleSubmissionInputV1,
  serverContext: AcquireCustomBundleHoldInput['serverContext'],
): AcquireCustomBundleHoldInput {
  return {
    submission: cloneDeep(submission),
    serverContext: { ...serverContext },
  }
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0, 'Expected a safe error message.')
  assert.ok(!/postgres|connection|string|host|sql/i.test(message), 'Message leaked infrastructure details.')
}

async function main(): Promise<void> {
  const canonical = buildCanonicalPreparedHold()
  const canonicalInput = buildAcquireInput(canonical.submission, canonical.serverContext)

  // Case 1: invalid SQL session.
  {
    let called = false
    const invalidSession = {
      transactionScope: 'pool_query',
      async query() {
        called = true
        throw new Error('query should not be called')
      },
      calls: [] as Array<{ sql: string; params: readonly unknown[] }>,
    } as unknown as ScriptedSqlSession

    const result = await acquireCustomBundleHoldWithSql(invalidSession, canonicalInput)
    expectResultStage(result, 'server_context', 'invalid SQL session should stay in server_context')
    if (!result.ok && result.stage === 'server_context' && 'code' in result) {
      assert.equal(result.code, 'INVALID_SQL_SESSION')
    }
    assert.equal(called, false)
  }

  // Case 2: invalid publicCode.
  {
    const session = createScriptedSession([])
    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, buildServerContext({ publicCode: 'INVALID-CODE' })),
    )
    expectResultStage(result, 'server_context', 'invalid publicCode should stay in server_context')
    if (!result.ok && result.stage === 'server_context' && 'code' in result) {
      assert.equal(result.code, 'INVALID_PUBLIC_CODE')
    }
    assertNoSqlCalls(session)
  }

  // Case 3: contract invalid.
  {
    const session = createScriptedSession([])
    const invalidSubmission =
      ({ ...buildSubmission(), contractVersion: 2 } as unknown) as CustomBundleSubmissionInputV1
    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(invalidSubmission, canonical.serverContext),
    )
    expectResultStage(result, 'contract', 'invalid contract should surface contract issues')
    assertNoSqlCalls(session)
  }

  // Case 4: business rules invalid.
  {
    const session = createScriptedSession([])
    const invalidSubmission = buildSubmission({
      items: [
        { itemSlug: 'sala-flexible', quantity: 1, sessionDurationMinutes: null },
        { itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null },
      ],
    })
    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(invalidSubmission, canonical.serverContext),
    )
    expectResultStage(result, 'business_rules', 'invalid business rules should surface business issues')
    assertNoSqlCalls(session)
  }

  // Case 5: active replay.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "booking_requests"/i)
          assert.match(sql, /FOR UPDATE/i)
        },
        result: {
          rows: [
            {
              id: 'hold-replay-001',
              publicCode: 'TUR-0707-099',
              idempotencyKey: canonical.prepared.idempotencyKey,
              requestFingerprint: canonical.prepared.requestFingerprint,
              holdAcquiredAt: new Date(canonical.prepared.holdAcquiredAtIso),
              holdExpiresAt: new Date(canonical.prepared.holdExpiresAtIso),
              eventDate: new Date('2026-06-24T14:00:00.000Z'),
              eventEndDate: new Date('2026-06-24T18:00:00.000Z'),
              estimatedTotal: canonical.prepared.quote.estimate.estimatedTotalUsd,
              status: 'under_review',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "booking_request_items"/i)
        },
        result: {
          rows: [
            {
              itemCount: 8,
              serviceItemCount: 4,
              addonItemCount: 2,
              includedItemCount: 2,
              physicalAllocationCount: 2,
              noPhysicalAllocationCount: 2,
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'replayed', 'expected active replay')
    assert.ok(result.ok)
    assert.equal(result.replayed, true)
    assert.equal(result.publicCode, 'TUR-0707-099')
    assert.equal(result.bookingRequestId, 'hold-replay-001')
    assert.equal(result.itemCount, 8)
    assert.equal(result.serviceItemCount, 4)
    assert.equal(result.addonItemCount, 2)
    assert.equal(result.includedItemCount, 2)
    assert.equal(result.physicalAllocationCount, 2)
    assert.equal(result.noPhysicalAllocationCount, 2)
    assertNoCallIncludes(session, /INSERT\s+INTO/i)
    assertNoCallIncludes(session, /COMMIT/i)
  }

  // Case 6: expired replay.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        result: {
          rows: [
            {
              id: 'hold-replay-002',
              publicCode: 'TUR-0707-098',
              idempotencyKey: canonical.prepared.idempotencyKey,
              requestFingerprint: canonical.prepared.requestFingerprint,
              holdAcquiredAt: new Date(canonical.prepared.holdAcquiredAtIso),
              holdExpiresAt: new Date('2026-06-22T15:59:59.000Z'),
              eventDate: new Date('2026-06-24T14:00:00.000Z'),
              eventEndDate: new Date('2026-06-24T18:00:00.000Z'),
              estimatedTotal: canonical.prepared.quote.estimate.estimatedTotalUsd,
              status: 'under_review',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'idempotency', 'expected expired replay')
    if (!result.ok && result.stage === 'idempotency') {
      assert.equal(result.code, 'IDEMPOTENCY_KEY_EXPIRED')
    }
    assertNoCallIncludes(session, /INSERT\s+INTO/i)
  }

  // Case 7: key conflict.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        result: {
          rows: [
            {
              id: 'hold-replay-003',
              publicCode: 'TUR-0707-097',
              idempotencyKey: canonical.prepared.idempotencyKey,
              requestFingerprint: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
              holdAcquiredAt: new Date(canonical.prepared.holdAcquiredAtIso),
              holdExpiresAt: new Date(canonical.prepared.holdExpiresAtIso),
              eventDate: new Date('2026-06-24T14:00:00.000Z'),
              eventEndDate: new Date('2026-06-24T18:00:00.000Z'),
              estimatedTotal: canonical.prepared.quote.estimate.estimatedTotalUsd,
              status: 'under_review',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'idempotency', 'expected idempotency key conflict')
    if (!result.ok && result.stage === 'idempotency') {
      assert.equal(result.code, 'IDEMPOTENCY_KEY_CONFLICT')
    }
    assertNoCallIncludes(session, /INSERT\s+INTO/i)
  }

  // Case 8: error after BEGIN.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        error: makePostgresError('XX000', 'boom after begin'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'persistence', 'expected safe persistence failure after BEGIN')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'DATABASE_WRITE_FAILED')
      assertSafeMessage(result.message)
    }
  }

  // Case 9: retryable 40001.
  {
    const session = createScriptedSession([
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        error: makePostgresError('40001', 'serialization failure'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
      {
        assert(sql) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL SERIALIZABLE/i)
        },
      },
      {
        result: {
          rows: [
            {
              id: 'hold-replay-004',
              publicCode: 'TUR-0707-096',
              idempotencyKey: canonical.prepared.idempotencyKey,
              requestFingerprint: canonical.prepared.requestFingerprint,
              holdAcquiredAt: new Date(canonical.prepared.holdAcquiredAtIso),
              holdExpiresAt: new Date(canonical.prepared.holdExpiresAtIso),
              eventDate: new Date('2026-06-24T14:00:00.000Z'),
              eventEndDate: new Date('2026-06-24T18:00:00.000Z'),
              estimatedTotal: canonical.prepared.quote.estimate.estimatedTotalUsd,
              status: 'under_review',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        result: {
          rows: [
            {
              itemCount: 8,
              serviceItemCount: 4,
              addonItemCount: 2,
              includedItemCount: 2,
              physicalAllocationCount: 2,
              noPhysicalAllocationCount: 2,
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'replayed', 'expected retryable request to settle as replayed')
    assert.equal(session.calls.filter((call) => /^BEGIN ISOLATION LEVEL SERIALIZABLE/i.test(call.sql)).length, 2)
    assert.equal(session.calls.filter((call) => /^ROLLBACK$/i.test(call.sql.trim())).length, 2)
  }

  // Case 10: maximum retries exhausted.
  {
    const session = createScriptedSession([
      {
        error: makePostgresError('40001', 'serialization failure'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
      {
        error: makePostgresError('40001', 'serialization failure'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
      {
        error: makePostgresError('40001', 'serialization failure'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await acquireCustomBundleHoldWithSql(
      session,
      buildAcquireInput(canonical.submission, canonical.serverContext),
    )

    expectResultStage(result, 'persistence', 'expected retries to be exhausted')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'TRANSACTION_RETRY_EXHAUSTED')
    }
    assert.equal(session.calls.filter((call) => /^BEGIN ISOLATION LEVEL SERIALIZABLE/i.test(call.sql)).length, 3)
    assert.equal(session.calls.filter((call) => /^ROLLBACK$/i.test(call.sql.trim())).length, 3)
  }

  console.log('booking_custom_bundle_hold_acquisition_contract OK')
  console.log('server context: verified')
  console.log('active replay: verified')
  console.log('expired replay: verified')
  console.log('idempotency conflict: verified')
  console.log('safe rollback: verified')
  console.log('serializable retry: verified')
  console.log('maximum retries: verified')
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
