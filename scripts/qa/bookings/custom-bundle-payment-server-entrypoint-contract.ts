import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCustomBundlePaymentServerIdempotencyKey,
  CUSTOM_BUNDLE_PAYMENT_SERVER_ENTRYPOINT_VERSION,
  runCustomBundlePaymentServerEntrypointCore,
  type CustomBundlePaymentServerEntrypointDependencies,
  type CustomBundlePaymentServerEntrypointInput,
  type CustomBundlePaymentServerEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import type { CustomBundlePaymentProofFileLike } from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type { CustomBundlePrivateBlobStore } from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { CustomBundlePaymentProofFlowResult } from '@/lib/bookings/custom-bundle-payment-proof-flow'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_server_entrypoint_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}

function makeBytes(kind: 'jpeg' | 'png' | 'webp' | 'avif' | 'plain' | 'spoof'): Uint8Array {
  switch (kind) {
    case 'jpeg':
      return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    case 'png':
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    case 'webp':
      return new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
        0x38, 0x20,
      ])
    case 'avif':
      return new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00,
        0x00, 0x00, 0x61, 0x76, 0x69, 0x66,
      ])
    case 'spoof':
      return new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x61, 0x62, 0x63, 0x64,
      ])
    case 'plain':
    default:
      return new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
  }
}

function makeFileLike(input: {
  name: string
  type: string
  bytes: Uint8Array
  throws?: boolean
}): CustomBundlePaymentProofFileLike & { arrayBufferCalls: { count: number } } {
  const calls = { count: 0 }
  return {
    name: input.name,
    type: input.type,
    size: input.bytes.byteLength,
    async arrayBuffer(): Promise<ArrayBuffer> {
      calls.count += 1
      if (input.throws) {
        throw new Error('arrayBuffer failure')
      }

      return input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength,
      ) as ArrayBuffer
    },
    arrayBufferCalls: calls,
  }
}

function makeSubmission(overrides: Partial<CustomBundlePaymentServerEntrypointInput['submission']> = {}): Record<string, unknown> {
  return {
    publicCode: 'TUR-2026-001',
    paymentMethod: 'pago_movil',
    paymentReference: ' REF-100 ',
    ...overrides,
  }
}

type SessionStub = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
  closeCalls: { count: number }
}

type StoreStub = CustomBundlePrivateBlobStore & {
  calls: {
    head: Array<{ pathname: string }>
    put: Array<{ pathname: string; bodyBytes: number }>
    delete: Array<{ pathname: string }>
  }
}

function makeSessionStub(options: {
  closeThrows?: boolean
} = {}): SessionStub & { close: () => Promise<void> } {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  const closeCalls = { count: 0 }
  return {
    transactionScope: 'single_connection',
    calls,
    closeCalls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      calls.push({ sql, params: [...params] })
      return { rows: [], rowCount: 0 }
    },
    async close(): Promise<void> {
      closeCalls.count += 1
      if (options.closeThrows) {
        throw new Error('close failure')
      }
    },
  }
}

function makeStoreStub(): StoreStub {
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{ pathname: string; bodyBytes: number }>,
    delete: [] as Array<{ pathname: string }>,
  }

  return {
    calls,
    async headPrivate(pathname: string): Promise<ReturnType<CustomBundlePrivateBlobStore['headPrivate']> extends Promise<infer T> ? T : never> {
      calls.head.push({ pathname })
      return null
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
      access: 'private'
      addRandomSuffix: false
    }): Promise<any> {
      calls.put.push({ pathname: input.pathname, bodyBytes: input.body.byteLength })
      return {
        pathname: input.pathname,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        uploadedAt: new Date('2026-06-24T17:59:59.000Z'),
        access: 'private' as const,
      }
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
    },
  }
}

function createDependencies(
  overrides: Partial<CustomBundlePaymentServerEntrypointDependencies> = {},
): CustomBundlePaymentServerEntrypointDependencies & {
  counts: {
    openSqlSession: number
    createPrivateBlobStore: number
    runPaymentProofFlow: number
  }
  session?: SessionStub
  store?: StoreStub
} {
  const counts = {
    openSqlSession: 0,
    createPrivateBlobStore: 0,
    runPaymentProofFlow: 0,
  }

  const session = makeSessionStub()
  const store = makeStoreStub()

  const dependencies: CustomBundlePaymentServerEntrypointDependencies & {
    counts: typeof counts
    session?: SessionStub
    store?: StoreStub
  } = {
    runtime: 'isolated_test',
    counts,
    session,
    store,
    clock: overrides.clock ?? {
      now(): Date {
        return new Date('2026-06-24T18:00:00.000Z')
      },
    },
    async openSqlSession() {
      counts.openSqlSession += 1
      return {
        session,
        async close(): Promise<void> {
          await session.close()
        },
      }
    },
    async createPrivateBlobStore() {
      counts.createPrivateBlobStore += 1
      return store
    },
    async runPaymentProofFlow(
      flowDependencies: Parameters<
        NonNullable<CustomBundlePaymentServerEntrypointDependencies['runPaymentProofFlow']>
      >[0],
      flowInput: Parameters<
        NonNullable<CustomBundlePaymentServerEntrypointDependencies['runPaymentProofFlow']>
      >[1],
    ): Promise<CustomBundlePaymentProofFlowResult> {
      counts.runPaymentProofFlow += 1
      if (overrides.runPaymentProofFlow) {
        return overrides.runPaymentProofFlow(flowDependencies, flowInput)
      }

      return {
        ok: true,
        stage: 'reported',
        reportingResult: {
          ok: true,
          stage: 'reported',
          replayed: false,
          bookingRequestId: 'booking-001',
          publicCode: 'TUR-2026-001',
          operationalStatus: 'payment_reported',
          bookingStatus: 'under_review',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-100',
          normalizedReference: 'REF100',
          paymentReportedAtIso: '2026-06-24T18:00:00.000Z',
          expectedTotalUsd: 280,
          currency: 'USD',
          paymentReportIdempotencyKey: 'PAYMENT_0000000000000000000000000000000000000000000000000000000000000000',
          paymentReportFingerprint: 'a'.repeat(64),
          paymentProofId: null,
          duplicateStatus: null,
        } as never,
        createdByThisCall: false,
        cleanupPerformed: false,
        proofMetadata: null,
      } as CustomBundlePaymentProofFlowResult
    },
    ...overrides,
  }

  return dependencies
}

function assertNoLeak(result: unknown): void {
  const text = JSON.stringify(result)
  assert.equal(text.includes('DATABASE_URL'), false)
  assert.equal(text.includes('BLOB_READ_WRITE_TOKEN'), false)
  assert.equal(text.includes('https://'), false)
  assert.equal(text.includes('paymentReportIdempotencyKey'), false)
  assert.equal(text.includes('paymentReportFingerprint'), false)
  assert.equal(text.includes('blobPathname'), false)
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0)
  assert.equal(/postgres|host|connection|string|sql/i.test(message), false)
}

async function main(): Promise<void> {
  assert.equal(CUSTOM_BUNDLE_PAYMENT_SERVER_ENTRYPOINT_VERSION, 'custom_bundle_payment_server_entrypoint_v1')

  const source = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-server-entrypoint-core.ts'),
    'utf8',
  )
  const wrapperSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-server-entrypoint.ts'),
    'utf8',
  )

  for (const [pattern, label] of [
    [/from\s+['"]@vercel\/blob['"]/, '@vercel/blob import'],
    [/from\s+['"]pg['"]/, 'pg import'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db import'],
    [/process\.env/, 'process.env'],
    [/['"]use server['"]/, 'use server'],
    [/server actions/i, 'server actions'],
    [/React/, 'React'],
    [/Next/, 'Next'],
  ] as const) {
    assert.equal(pattern.test(source), false, label)
  }

  assert.equal(wrapperSource.includes("import 'server-only'"), true)
  assert.equal(/['"]use server['"]/.test(wrapperSource), false)

  // Case 1: invalid submission.
  {
    const result = buildCustomBundlePaymentServerIdempotencyKey({
      submission: {},
      paymentProofFile: null,
    })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.contractIssues.length > 0)
    }
  }

  // Case 2: proof required absent.
  {
    const dependencies = createDependencies()
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...dependencies,
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'pago_movil' }),
        paymentProofFile: null,
      },
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'proof')
    assert.equal(dependencies.counts.openSqlSession, 0)
    assert.equal(dependencies.counts.createPrivateBlobStore, 0)
  }

  // Case 3-7: server idempotency key derivation.
  {
    const base = buildCustomBundlePaymentServerIdempotencyKey({
      paymentProofFile: null,
      submission: makeSubmission({ paymentReference: ' Pago-123-ABC ' }),
    })
    const same = buildCustomBundlePaymentServerIdempotencyKey({
      paymentProofFile: null,
      submission: makeSubmission({ paymentReference: 'pago123abc' }),
    })
    const different = buildCustomBundlePaymentServerIdempotencyKey({
      paymentProofFile: null,
      submission: makeSubmission({ paymentReference: 'Pago-124-ABC' }),
    })

    assert.equal(base.ok, true)
    assert.equal(same.ok, true)
    assert.equal(different.ok, true)
    if (base.ok && same.ok && different.ok) {
      assert.match(base.idempotencyKey, /^PAYMENT_[a-f0-9]{64}$/)
      assert.equal(base.idempotencyKey, same.idempotencyKey)
      assert.notEqual(base.idempotencyKey, different.idempotencyKey)
      assert.ok(base.idempotencyKey.startsWith('PAYMENT_'))
    }
  }

  // Case 8: key not present in public result.
  {
    const dependencies = createDependencies()
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...dependencies,
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'efectivo' }),
        paymentProofFile: null,
      },
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'simulated')
    assertNoLeak(result)
  }

  // Case 9: preview cash without proof, no infra.
  {
    const dependencies = createDependencies()
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...dependencies,
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'efectivo' }),
        paymentProofFile: null,
      },
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'simulated')
    assert.equal(dependencies.counts.openSqlSession, 0)
    assert.equal(dependencies.counts.createPrivateBlobStore, 0)
  }

  // Case 10: preview with proof validates bytes and remains write-free.
  {
    const dependencies = createDependencies()
    const file = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('png'),
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...dependencies,
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'pago_movil' }),
        paymentProofFile: file,
      },
    )
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'simulated')
    assert.equal(file.arrayBufferCalls.count, 1)
    assert.equal(dependencies.counts.openSqlSession, 0)
    assert.equal(dependencies.counts.createPrivateBlobStore, 0)
  }

  // Case 11: preview MIME spoof rejects without infra.
  {
    const dependencies = createDependencies()
    const file = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('plain'),
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...dependencies,
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'pago_movil' }),
        paymentProofFile: file,
      },
    )
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'proof')
    assert.equal(dependencies.counts.openSqlSession, 0)
    assert.equal(dependencies.counts.createPrivateBlobStore, 0)
  }

  // Case 12: production opens SQL before Blob.
  {
    const callOrder: string[] = []
    const dependencies = createDependencies({
      runtime: 'isolated_test',
      async openSqlSession() {
        callOrder.push('openSqlSession')
        return {
          session: makeSessionStub(),
          async close(): Promise<void> {
            callOrder.push('close')
          },
        }
      },
      async createPrivateBlobStore() {
        callOrder.push('createPrivateBlobStore')
        return makeStoreStub()
      },
      async runPaymentProofFlow() {
        callOrder.push('runPaymentProofFlow')
        return {
          ok: true,
          stage: 'reported',
          reportingResult: {
            ok: true,
            stage: 'reported',
            replayed: false,
            bookingRequestId: 'booking-001',
            publicCode: 'TUR-2026-001',
            operationalStatus: 'payment_reported',
            bookingStatus: 'under_review',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
            normalizedReference: 'REF100',
            paymentReportedAtIso: '2026-06-24T18:00:00.000Z',
            expectedTotalUsd: 280,
            currency: 'USD',
            paymentReportIdempotencyKey: 'PAYMENT_0000000000000000000000000000000000000000000000000000000000000000',
            paymentReportFingerprint: 'a'.repeat(64),
            paymentProofId: null,
            duplicateStatus: null,
          } as never,
          createdByThisCall: false,
          cleanupPerformed: false,
          proofMetadata: null,
        } as CustomBundlePaymentProofFlowResult
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, true)
    assert.deepEqual(callOrder.slice(0, 3), ['openSqlSession', 'createPrivateBlobStore', 'runPaymentProofFlow'])
  }

  // Case 13: SQL open failure skips Blob.
  {
    const dependencies = createDependencies({
      async openSqlSession() {
        throw new Error('db down')
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'infrastructure')
    assert.equal(result.code, 'SERVER_DATABASE_UNAVAILABLE')
    assert.equal(dependencies.counts.createPrivateBlobStore, 0)
  }

  // Case 14: store creation failure closes SQL.
  {
    const session = makeSessionStub()
    const dependencies = createDependencies({
      async openSqlSession() {
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async createPrivateBlobStore() {
        throw new Error('blob down')
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'infrastructure')
    assert.equal(result.code, 'PRIVATE_STORAGE_UNAVAILABLE')
    assert.equal(session.closeCalls.count > 0, true)
  }

  // Case 15: flow success reported closes SQL.
  {
    const session = makeSessionStub()
    const dependencies = createDependencies({
      async openSqlSession() {
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async runPaymentProofFlow() {
        return {
          ok: true,
          stage: 'reported',
          reportingResult: {
            ok: true,
            stage: 'reported',
            replayed: false,
            bookingRequestId: 'booking-001',
            publicCode: 'TUR-2026-001',
            operationalStatus: 'payment_reported',
            bookingStatus: 'under_review',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
            normalizedReference: 'REF100',
            paymentReportedAtIso: '2026-06-24T18:00:00.000Z',
            expectedTotalUsd: 280,
            currency: 'USD',
            paymentReportIdempotencyKey: 'PAYMENT_0000000000000000000000000000000000000000000000000000000000000000',
            paymentReportFingerprint: 'a'.repeat(64),
            paymentProofId: null,
            duplicateStatus: null,
          } as never,
          createdByThisCall: true,
          cleanupPerformed: false,
          proofMetadata: null,
        } as CustomBundlePaymentProofFlowResult
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'reported')
    assert.equal(session.closeCalls.count > 0, true)
  }

  // Case 16: flow replayed closes SQL.
  {
    const session = makeSessionStub()
    const dependencies = createDependencies({
      async openSqlSession() {
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async runPaymentProofFlow() {
        return {
          ok: true,
          stage: 'replayed',
          reportingResult: {
            ok: true,
            stage: 'replayed',
            replayed: true,
            bookingRequestId: 'booking-001',
            publicCode: 'TUR-2026-001',
            operationalStatus: 'payment_reported',
            bookingStatus: 'under_review',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
            normalizedReference: 'REF100',
            paymentReportedAtIso: '2026-06-24T18:00:00.000Z',
            expectedTotalUsd: 280,
            currency: 'USD',
            paymentReportIdempotencyKey: 'PAYMENT_0000000000000000000000000000000000000000000000000000000000000000',
            paymentReportFingerprint: 'a'.repeat(64),
            paymentProofId: null,
            duplicateStatus: null,
          } as never,
          createdByThisCall: false,
          cleanupPerformed: false,
          proofMetadata: null,
        } as CustomBundlePaymentProofFlowResult
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, true)
    assert.equal(result.stage, 'replayed')
    assert.equal(session.closeCalls.count > 0, true)
  }

  // Case 17: flow failure closes SQL.
  {
    const session = makeSessionStub()
    const dependencies = createDependencies({
      async openSqlSession() {
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async runPaymentProofFlow() {
        return {
          ok: false,
          stage: 'proof_boundary',
          proofBoundaryIssues: [
            {
              code: 'INVALID_FILE',
              message: 'invalid file',
            },
          ],
        } as CustomBundlePaymentProofFlowResult
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'proof')
    assert.equal(session.closeCalls.count > 0, true)
  }

  // Case 18: flow throw is sanitized and closes SQL.
  {
    const session = makeSessionStub()
    const dependencies = createDependencies({
      async openSqlSession() {
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async runPaymentProofFlow() {
        throw new Error('postgres boom')
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'infrastructure')
    assert.equal(result.code, 'PAYMENT_FLOW_EXECUTION_FAILED')
    assert.equal(session.closeCalls.count > 0, true)
    assertSafeMessage(result.message)
  }

  // Case 19: close throws but result remains controlled.
  {
    const dependencies = createDependencies({
      runtime: 'isolated_test',
      async openSqlSession() {
        const session = makeSessionStub({ closeThrows: true })
        return {
          session,
          async close(): Promise<void> {
            await session.close()
          },
        }
      },
      async createPrivateBlobStore() {
        return makeStoreStub()
      },
      async runPaymentProofFlow() {
        return {
          ok: true,
          stage: 'reported',
          reportingResult: {
            ok: true,
            stage: 'reported',
            replayed: false,
            bookingRequestId: 'booking-001',
            publicCode: 'TUR-2026-001',
            operationalStatus: 'payment_reported',
            bookingStatus: 'under_review',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
            normalizedReference: 'REF100',
            paymentReportedAtIso: '2026-06-24T18:00:00.000Z',
            expectedTotalUsd: 280,
            currency: 'USD',
            paymentReportIdempotencyKey: 'PAYMENT_0000000000000000000000000000000000000000000000000000000000000000',
            paymentReportFingerprint: 'a'.repeat(64),
            paymentProofId: null,
            duplicateStatus: null,
          } as never,
          createdByThisCall: false,
          cleanupPerformed: false,
          proofMetadata: null,
        } as CustomBundlePaymentProofFlowResult
      },
    })
    const result = await runCustomBundlePaymentServerEntrypointCore(dependencies, {
      submission: makeSubmission({ paymentMethod: 'pago_movil' }),
      paymentProofFile: makeFileLike({
        name: 'proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.stage, 'infrastructure')
    assert.equal(result.code, 'SQL_SESSION_CLOSE_FAILED')
  }

  // Case 20: runtime not allowed.
  {
    assert.equal(wrapperSource.includes('ENVIRONMENT_NOT_ALLOWED'), true)
    assert.equal(wrapperSource.includes('isPreviewDeployment()'), true)
    assert.equal(wrapperSource.includes('process.env.VERCEL_ENV'), true)
  }

  // Case 21-25: result sanitization.
  {
    const result = await runCustomBundlePaymentServerEntrypointCore(
      {
        ...createDependencies(),
        runtime: 'preview',
      },
      {
        submission: makeSubmission({ paymentMethod: 'efectivo' }),
        paymentProofFile: null,
      },
    )
    assert.equal(result.ok, true)
    assertNoLeak(result)
    assert.equal('paymentProofFile' in result, false)
  }

  // Case 26-30: source safety.
  {
    assert.equal(source.includes('wizard'), false)
    assert.equal(source.includes('notifications'), false)
    assert.equal(wrapperSource.includes('wizard'), false)
    assert.equal(wrapperSource.includes('notifications'), false)
  }

  console.log('booking_custom_bundle_payment_server_entrypoint_contract OK')
  console.log('server idempotency key: verified')
  console.log('preview no writes: verified')
  console.log('sql before storage: verified')
  console.log('session close: verified')
  console.log('sanitized public result: verified')
  console.log('no client key: verified')
  console.log('no public action: verified')
}

main().catch((error) => fail('Unexpected failure while validating the payment server entrypoint contract.', error))
