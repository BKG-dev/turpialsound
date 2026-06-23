import assert from 'node:assert/strict'

import {
  acquireCustomBundleHoldWithSql,
  countCustomBundleRequirementsByMode,
  type AcquireCustomBundleHoldInput,
} from '@/lib/bookings/custom-bundle-hold-acquisition'
import {
  prepareCustomBundleHoldContract,
  type CustomBundleHoldServerContext,
} from '@/lib/bookings/custom-bundle-hold-contract'
import {
  buildCustomBundlePersistableLineDescriptors,
  type CustomBundlePersistableLineDescriptor,
  type CustomBundleSqlSession,
} from '@/lib/bookings/custom-bundle-persistence'
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

function buildReplayFixture(input: {
  prepared: ReturnType<typeof buildCanonicalPreparedHold>['prepared']
  serviceVariantRows: Array<{
    variantId: string
    variantSlug: string
    variantIsActive?: boolean
    serviceSlug: string
    serviceIsActive?: boolean
  }>
  resourceIdsBySlug: Record<string, string | null>
}): {
  serviceVariantRows: Array<{
    variantId: string
    variantSlug: string
    variantIsActive: boolean
    serviceSlug: string
    serviceIsActive: boolean
  }>
  descriptors: readonly CustomBundlePersistableLineDescriptor[]
  persistedItems: Array<Record<string, unknown>>
} {
  const serviceVariantRows = input.serviceVariantRows.map((row) => ({
    variantId: row.variantId,
    variantSlug: row.variantSlug,
    variantIsActive: row.variantIsActive ?? true,
    serviceSlug: row.serviceSlug,
    serviceIsActive: row.serviceIsActive ?? true,
  }))

  const resolvedServiceVariants = new Map(
    serviceVariantRows.map((row) => [row.variantSlug, row] as const),
  )

  const descriptorsResult = buildCustomBundlePersistableLineDescriptors(
    input.prepared.quote,
    resolvedServiceVariants,
  )

  if (!Array.isArray(descriptorsResult)) {
    throw new Error(`Unable to build replay fixture descriptors: ${descriptorsResult.stage}`)
  }

  return {
    serviceVariantRows,
    descriptors: descriptorsResult,
    persistedItems: descriptorsResult.map((descriptor) => ({
      itemSlug: descriptor.itemSlug,
      itemName: descriptor.itemName,
      itemKind: descriptor.itemKind,
      serviceVariantId: descriptor.serviceVariantId,
      resourceId: input.resourceIdsBySlug[descriptor.itemSlug] ?? null,
      quantity: descriptor.quantity,
      sessionDurationMinutes: descriptor.sessionDurationMinutes,
      durationMinutes: descriptor.durationMinutes,
      unitPriceUsdSnapshot: descriptor.unitPriceUsdSnapshot,
      lineTotalUsdSnapshot: descriptor.lineTotalUsdSnapshot,
      clientPriceDisplay: descriptor.clientPriceDisplay,
    })),
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

function buildReplayParitySubmission(): CustomBundleSubmissionInputV1 {
  return buildSubmission({
    items: [
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'master', quantity: 1, sessionDurationMinutes: null },
    ],
  })
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0, 'Expected a safe error message.')
  assert.ok(!/postgres|connection|string|host|sql/i.test(message), 'Message leaked infrastructure details.')
}

async function main(): Promise<void> {
  const canonical = buildCanonicalPreparedHold()
  const canonicalInput = buildAcquireInput(canonical.submission, canonical.serverContext)
  const canonicalReplayFixture = buildReplayFixture({
    prepared: canonical.prepared,
    serviceVariantRows: [
      {
        variantId: 'bkg07b_variant_sala_premium',
        variantSlug: 'sala-ensayo-premium',
        serviceSlug: 'sala-ensayo',
      },
      {
        variantId: 'bkg07b_variant_studio_session',
        variantSlug: 'studio-session-fija',
        serviceSlug: 'video-session',
      },
      {
        variantId: 'bkg07b_variant_consultoria',
        variantSlug: 'consultoria-produccion',
        serviceSlug: 'consultoria',
      },
      {
        variantId: 'bkg07b_variant_podcast',
        variantSlug: 'podcast-por-episodio',
        serviceSlug: 'podcast-locucion',
      },
    ],
    resourceIdsBySlug: {
      'sala-premium': 'bkg07b_resource_sala_3',
      'studio-session': null,
      'consultoria-produccion': null,
      podcast: 'bkg07b_resource_sala_2',
      'combo-percusion': null,
      'grabaciones-voces': null,
      'tecnico-sonido': null,
      'backline-equipamiento': null,
    },
  })
  const replayParitySubmission = buildReplayParitySubmission()
  const replayParityPrepared = prepareCustomBundleHoldContract({
    submission: replayParitySubmission,
    serverContext: canonical.serverContext,
  })

  if (!replayParityPrepared.ok || replayParityPrepared.stage !== 'ready') {
    throw new Error('Replay parity hold preparation failed in the contract harness.')
  }

  const replayParityFixture = buildReplayFixture({
    prepared: replayParityPrepared.value,
    serviceVariantRows: [
      {
        variantId: 'bkg07b_variant_sala_premium',
        variantSlug: 'sala-ensayo-premium',
        serviceSlug: 'sala-ensayo',
      },
      {
        variantId: 'bkg07b_variant_studio_session',
        variantSlug: 'studio-session-fija',
        serviceSlug: 'video-session',
      },
      {
        variantId: 'bkg07b_variant_mezcla',
        variantSlug: 'mezcla-por-tema',
        serviceSlug: 'mezcla-masterizacion',
      },
      {
        variantId: 'bkg07b_variant_master',
        variantSlug: 'master-por-tema',
        serviceSlug: 'mezcla-masterizacion',
      },
    ],
    resourceIdsBySlug: {
      'sala-premium': 'bkg07b_resource_sala_3',
      'studio-session': null,
      mezcla: null,
      master: null,
      'tecnico-sonido': null,
      'backline-equipamiento': null,
    },
  })
  const replayParityAllocationCounts = countCustomBundleRequirementsByMode(
    replayParityPrepared.value.requirements,
  )

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
              internalNotes: '[ops_status:pending_payment]',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "service_variants"/i)
        },
        result: {
          rows: canonicalReplayFixture.serviceVariantRows,
          rowCount: canonicalReplayFixture.serviceVariantRows.length,
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "booking_request_items"/i)
        },
        result: {
          rows: canonicalReplayFixture.persistedItems,
          rowCount: canonicalReplayFixture.persistedItems.length,
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

  // Case 6: replay allocation parity.
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
              id: 'hold-replay-parity-001',
              publicCode: 'TUR-0707-092',
              idempotencyKey: replayParityPrepared.value.idempotencyKey,
              requestFingerprint: replayParityPrepared.value.requestFingerprint,
              holdAcquiredAt: new Date(replayParityPrepared.value.holdAcquiredAtIso),
              holdExpiresAt: new Date(replayParityPrepared.value.holdExpiresAtIso),
              eventDate: new Date('2026-06-24T14:00:00.000Z'),
              eventEndDate: new Date('2026-06-24T16:00:00.000Z'),
              estimatedTotal: replayParityPrepared.value.quote.estimate.estimatedTotalUsd,
              status: 'under_review',
              internalNotes: '[ops_status:pending_payment]',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "service_variants"/i)
        },
        result: {
          rows: replayParityFixture.serviceVariantRows,
          rowCount: replayParityFixture.serviceVariantRows.length,
        },
      },
      {
        assert(sql) {
          assert.match(sql, /FROM "booking_request_items"/i)
        },
        result: {
          rows: replayParityFixture.persistedItems,
          rowCount: replayParityFixture.persistedItems.length,
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
      buildAcquireInput(
        replayParitySubmission,
        buildServerContext({
          publicCode: 'TUR-0707-093',
          idempotencyKey: replayParityPrepared.value.idempotencyKey,
          now: canonical.serverContext.now,
        }),
      ),
    )

    expectResultStage(result, 'replayed', 'expected replay allocation parity')
    assert.ok(result.ok)
    assert.equal(result.replayed, true)
    assert.equal(result.publicCode, 'TUR-0707-092')
    assert.equal(result.bookingRequestId, 'hold-replay-parity-001')
    assert.equal(result.itemCount, 6)
    assert.equal(result.serviceItemCount, 4)
    assert.equal(result.addonItemCount, 0)
    assert.equal(result.includedItemCount, 2)
    assert.equal(result.physicalAllocationCount, 1)
    assert.equal(result.noPhysicalAllocationCount, 1)
    assert.equal(replayParityAllocationCounts.physicalAllocationCount, 1)
    assert.equal(replayParityAllocationCounts.noPhysicalAllocationCount, 1)
    assertNoCallIncludes(session, /INSERT\s+INTO/i)
    assertNoCallIncludes(session, /COMMIT/i)
  }

  // Case 7: expired replay.
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
              internalNotes: '[ops_status:pending_payment]',
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

  // Case 8: key conflict.
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
              internalNotes: '[ops_status:pending_payment]',
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

  // Case 9: error after BEGIN.
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

  // Case 10: retryable 40001.
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
              internalNotes: '[ops_status:pending_payment]',
              bookingMode: 'custom_bundle',
              pricingSource: 'server_catalog_v1',
            },
          ],
          rowCount: 1,
        },
      },
      {
        result: {
          rows: canonicalReplayFixture.serviceVariantRows,
          rowCount: canonicalReplayFixture.serviceVariantRows.length,
        },
      },
      {
        result: {
          rows: canonicalReplayFixture.persistedItems,
          rowCount: canonicalReplayFixture.persistedItems.length,
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

  // Case 11: maximum retries exhausted.
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
  console.log('replay allocation parity: verified')
  console.log('expired replay: verified')
  console.log('idempotency conflict: verified')
  console.log('safe rollback: verified')
  console.log('serializable retry: verified')
  console.log('maximum retries: verified')
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
