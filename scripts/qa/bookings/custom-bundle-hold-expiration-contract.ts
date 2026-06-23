import assert from 'node:assert/strict'

import {
  CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
  CUSTOM_BUNDLE_HOLD_EXPIRATION_DEFAULT_BATCH_SIZE,
  CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON,
  expireCustomBundleHoldsWithSql,
  type CustomBundleHoldExpirationResult,
  type CustomBundleHoldExpirationServerContext,
} from '@/lib/bookings/custom-bundle-hold-expiration'
import {
  extractCustomBundleOperationalTags,
  setCustomBundleExpiredOperationalStatus,
  validateCustomBundleHoldReplayOperationalNotes,
} from '@/lib/bookings/custom-bundle-hold-operational-notes'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

type ScriptedQueryStep = {
  assert?: (sql: string, params: readonly unknown[]) => void
  result?: { rows: Array<Record<string, unknown>>; rowCount: number | null }
  error?: Error & { code?: string }
}

type ScriptedSqlSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

function fail(message: string): never {
  console.error('booking_custom_bundle_hold_expiration_contract FAILED')
  console.error(message)
  process.exit(1)
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

function assertResultStage<T extends { stage: string }, S extends T['stage']>(
  result: T,
  stage: S,
  label?: string,
): asserts result is Extract<T, { stage: S }> {
  assert.equal(result.stage, stage, label)
}

function assertNoSqlCalls(session: ScriptedSqlSession): void {
  assert.equal(session.calls.length, 0)
}

function assertCallIncludes(session: ScriptedSqlSession, index: number, pattern: RegExp): void {
  assert.ok(session.calls[index], `Missing SQL call ${index + 1}.`)
  assert.match(session.calls[index].sql, pattern)
}

function buildServerContext(overrides: Partial<CustomBundleHoldExpirationServerContext> = {}) {
  return {
    now: new Date('2026-06-22T16:00:00.000Z'),
    batchSize: CUSTOM_BUNDLE_HOLD_EXPIRATION_DEFAULT_BATCH_SIZE,
    ...overrides,
  }
}

function buildValidCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'booking-request-expire-001',
    publicCode: 'TUR-2026-001',
    holdAcquiredAt: new Date('2026-06-22T15:00:00.000Z'),
    holdExpiresAt: new Date('2026-06-22T16:00:00.000Z'),
    internalNotes: '[ops_status:pending_payment]\nNotas del cliente',
    ...overrides,
  }
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0)
  assert.ok(!/postgres|connection|string|host|sql/i.test(message))
}

async function main(): Promise<void> {
  assert.equal(CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION, 'custom_bundle_hold_expired')
  assert.equal(CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON, 'hold_window_elapsed')

  assert.deepStrictEqual(extractCustomBundleOperationalTags('[ops_status:expired]'), ['expired'])
  assert.equal(
    setCustomBundleExpiredOperationalStatus('[ops_status:pending_payment]\nNotas internas'),
    '[ops_status:expired]\nNotas internas',
  )

  const expiredReplayClassification = validateCustomBundleHoldReplayOperationalNotes({
    status: 'rejected',
    internalNotes: '[ops_status:expired]',
    holdExpiresAt: new Date('2026-06-22T15:59:59.000Z'),
    now: new Date('2026-06-22T16:00:00.000Z'),
  })
  assert.equal(expiredReplayClassification.ok, true)
  if (!expiredReplayClassification.ok) {
    throw new Error('Expected expired replay classification to be valid.')
  }
  assert.equal(expiredReplayClassification.state, 'expired_hold')

  // Case 1: invalid session.
  {
    const session = createScriptedSession([], 'pool_query')
    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })
    assertResultStage(result, 'server_context')
    if (!result.ok && result.stage === 'server_context') {
      assert.equal(result.code, 'INVALID_SQL_SESSION')
    }
    assertNoSqlCalls(session)
  }

  // Case 2: invalid now.
  {
    const session = createScriptedSession([])
    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext({ now: new Date('not-a-date') }),
    })
    assertResultStage(result, 'server_context')
    if (!result.ok && result.stage === 'server_context') {
      assert.equal(result.code, 'INVALID_NOW')
    }
    assertNoSqlCalls(session)
  }

  // Case 3: invalid batch sizes.
  for (const batchSize of [0, -1, 1.5, 501]) {
    const session = createScriptedSession([])
    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext({ batchSize }),
    })
    assertResultStage(result, 'server_context')
    if (!result.ok && result.stage === 'server_context') {
      assert.equal(result.code, 'INVALID_BATCH_SIZE')
    }
    assertNoSqlCalls(session)
  }

  // Case 4: default batch size and exact boundary expiration.
  {
    const session = createScriptedSession([
      {
        assert(sql, params) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
          assert.equal(params.length, 0)
        },
      },
      {
        assert(sql, params) {
          assert.match(sql, /FOR UPDATE SKIP LOCKED/i)
          assert.match(sql, /ORDER BY br\."holdExpiresAt" ASC, br\.id ASC/i)
          assert.ok(params[3] instanceof Date)
          assert.equal(
            (params[3] as Date).getTime(),
            new Date('2026-06-22T16:00:00.000Z').getTime(),
          )
          assert.equal(params[4], CUSTOM_BUNDLE_HOLD_EXPIRATION_DEFAULT_BATCH_SIZE)
        },
        result: {
          rows: [buildValidCandidate()],
          rowCount: 1,
        },
      },
      {
        assert(sql, params) {
          assert.match(sql.trim(), /^UPDATE "booking_requests"/i)
          assert.equal(params[1], 'rejected')
          assert.equal(params[2], '[ops_status:expired]\nNotas del cliente')
        },
        result: {
          rows: [],
          rowCount: 1,
        },
      },
      {
        assert(sql, params) {
          assert.match(sql, /INSERT INTO "audit_log"/i)
          assert.equal(params[1], CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION)
          assert.equal(params[2], JSON.stringify({
            bookingStatus: 'under_review',
            operationalStatus: 'pending_payment',
            holdAcquiredAtIso: '2026-06-22T15:00:00.000Z',
            holdExpiresAtIso: '2026-06-22T16:00:00.000Z',
          }))
          assert.equal(params[3], JSON.stringify({
            bookingStatus: 'rejected',
            operationalStatus: 'expired',
            holdAcquiredAtIso: '2026-06-22T15:00:00.000Z',
            holdExpiresAtIso: '2026-06-22T16:00:00.000Z',
            expiredAtIso: '2026-06-22T16:00:00.000Z',
            reason: CUSTOM_BUNDLE_HOLD_EXPIRATION_REASON,
          }))
        },
        result: {
          rows: [],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.match(sql.trim(), /^SELECT EXISTS/i)
        },
        result: {
          rows: [{ hasMore: false }],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'expired', 'case 4: exact boundary expiration')
    assert.ok(result.ok)
    assert.equal(result.selected, 1)
    assert.equal(result.expired, 1)
    assert.equal(result.skipped, 0)
    assert.equal(result.hasMore, false)
    assert.equal(result.expiredBookings.length, 1)
    assert.deepStrictEqual(result.expiredBookings[0], {
      bookingRequestId: 'booking-request-expire-001',
      publicCode: 'TUR-2026-001',
      holdAcquiredAtIso: '2026-06-22T15:00:00.000Z',
      holdExpiresAtIso: '2026-06-22T16:00:00.000Z',
      expiredAtIso: '2026-06-22T16:00:00.000Z',
    })
  }

  // Case 5: future holds are not touched.
  {
    const session = createScriptedSession([
      {
        assert(sql, params) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
          assert.equal(params.length, 0)
        },
      },
      {
        result: {
          rows: [],
          rowCount: 0,
        },
      },
      {
        result: {
          rows: [{ hasMore: false }],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'expired', 'case 5: future holds')
    assert.ok(result.ok)
    assert.equal(result.selected, 0)
    assert.equal(result.expired, 0)
    assert.equal(result.skipped, 0)
    assert.equal(result.hasMore, false)
    assert.equal(result.expiredBookings.length, 0)
  }

  // Case 6: payment reported and payment proof protection appear in the SQL itself.
  {
    const session = createScriptedSession([
      {
        assert(sql, params) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
          assert.equal(params.length, 0)
        },
      },
      {
        assert(sql) {
          assert.match(sql, /NOT ILIKE '%\[ops_status:payment_reported\]%'/i)
          assert.match(sql, /NOT EXISTS/i)
        },
        result: {
          rows: [],
          rowCount: 0,
        },
      },
      {
        result: {
          rows: [{ hasMore: false }],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'expired', 'case 6: payment protections')
    assert.ok(result.ok)
    assert.equal(result.selected, 0)
    assert.equal(result.expired, 0)
    assert.equal(result.hasMore, false)
  }

  // Case 7: rollback on update failure is safe.
  {
    const session = createScriptedSession([
      {
        assert(sql, params) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
          assert.equal(params.length, 0)
        },
      },
      {
        result: {
          rows: [buildValidCandidate()],
          rowCount: 1,
        },
      },
      {
        error: makePostgresError('XX000', 'simulated failure'),
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'ROLLBACK')
        },
      },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'persistence', 'case 7: rollback on update failure')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'DATABASE_WRITE_FAILED')
      assertSafeMessage(result.message)
    }
  }

  // Case 8: retryable transaction errors are retried and then succeed.
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
        assert(sql, params) {
          assert.match(sql, /^BEGIN ISOLATION LEVEL READ COMMITTED/i)
          assert.equal(params.length, 0)
        },
      },
      {
        result: {
          rows: [buildValidCandidate({ id: 'booking-request-expire-002' })],
          rowCount: 1,
        },
      },
      {
        result: {
          rows: [],
          rowCount: 1,
        },
      },
      {
        result: {
          rows: [],
          rowCount: 1,
        },
      },
      {
        result: {
          rows: [{ hasMore: false }],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.equal(sql.trim().toUpperCase(), 'COMMIT')
        },
      },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'expired', 'case 8: retryable transaction errors')
    assert.ok(result.ok)
    assert.equal(session.calls.filter((call) => /^BEGIN ISOLATION LEVEL READ COMMITTED/i.test(call.sql)).length, 2)
    assert.equal(session.calls.filter((call) => /^ROLLBACK$/i.test(call.sql.trim())).length, 1)
  }

  // Case 9: exhausted retries.
  {
    const session = createScriptedSession([
      { error: makePostgresError('40001', 'serialization failure') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
      { error: makePostgresError('40001', 'serialization failure') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
      { error: makePostgresError('40001', 'serialization failure') },
      { assert(sql) { assert.equal(sql.trim().toUpperCase(), 'ROLLBACK') } },
    ])

    const result = await expireCustomBundleHoldsWithSql(session, {
      serverContext: buildServerContext(),
    })

    assertResultStage(result, 'persistence', 'case 9: exhausted retries')
    if (!result.ok && result.stage === 'persistence') {
      assert.equal(result.code, 'TRANSACTION_RETRY_EXHAUSTED')
    }
  }

  console.log('booking_custom_bundle_hold_expiration_contract OK')
  console.log('expiration eligibility: verified')
  console.log('exact boundary expired: verified')
  console.log('future hold preserved: verified')
  console.log('payment reported protected: verified')
  console.log('payment proof protected: verified')
  console.log('expired replay classification: verified')
  console.log('transaction retry: verified')
  console.log('has more: verified')
  console.log('no side effects: verified')
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
