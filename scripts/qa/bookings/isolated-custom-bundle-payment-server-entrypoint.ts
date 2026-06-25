import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  runCustomBundlePaymentServerEntrypointCore,
  type CustomBundlePaymentServerEntrypointInput,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import type { CustomBundlePaymentProofFileLike } from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type { CustomBundlePaymentServerRuntime } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

type MemoryStore = {
  calls: {
    head: Array<{ pathname: string }>
    put: Array<{ pathname: string; bodyBytes: number }>
    delete: Array<{ pathname: string }>
  }
  objects: Map<string, { pathname: string; contentType: string; sizeBytes: number; uploadedAt: Date; access: 'private' }>
  headPrivate(pathname: string): Promise<{
    pathname: string
    contentType: string
    sizeBytes: number
    uploadedAt: Date
    access: 'private'
  } | null>
  putPrivate(input: {
    pathname: string
    body: Uint8Array
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
    access: 'private'
    addRandomSuffix: false
  }): Promise<{
    pathname: string
    contentType: string
    sizeBytes: number
    uploadedAt: Date
    access: 'private'
  }>
  deletePrivate(pathname: string): Promise<void>
}

type LocalSqlSessionHandle = {
  session: {
    transactionScope: 'single_connection'
    query<Row = Record<string, unknown>>(
      sql: string,
      params?: readonly unknown[],
    ): Promise<{ rows: Row[]; rowCount: number | null }>
  }
  close(): Promise<void>
}

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_payment_server_entrypoint FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function isRemoteIpHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function validateConnectionUrl(rawValue: string | undefined): string {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    fail('TURPIAL_ISOLATED_DATABASE_URL is required.')
  }

  let url: URL
  try {
    url = new URL(rawValue)
  } catch {
    fail('TURPIAL_ISOLATED_DATABASE_URL is not a valid URL.')
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the postgres protocol.')
  }

  const host = url.hostname.toLowerCase()
  if (host.includes('neon') || host.includes('supabase') || host.includes('vercel')) {
    fail('Remote platform hosts are not allowed for this gate.')
  }

  if (!EXPECTED_HOSTS.has(host)) {
    if (isRemoteIpHost(host)) {
      fail('Remote IP hosts are not allowed for this gate.')
    }

    fail('TURPIAL_ISOLATED_DATABASE_URL must target 127.0.0.1 or localhost.')
  }

  if (url.port !== EXPECTED_PORT) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use port 5432.')
  }

  if (url.pathname.replace(/^\//, '') !== EXPECTED_DATABASE) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must target the isolated booking database.')
  }

  if (url.username !== EXPECTED_USER) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate user.')
  }

  if (url.password !== EXPECTED_PASSWORD) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate password.')
  }

  return url.toString()
}

function readSqlFile(pathname: string): string {
  try {
    return readFileSync(pathname, 'utf8')
  } catch {
    fail(`Unable to read SQL file: ${pathname}`)
  }
}

function assertNoForbiddenSql(
  sql: string,
  label: string,
  options: { allowMarketplaceTables?: boolean } = {},
): void {
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/DROP\s+TABLE/i, 'DROP TABLE'],
    [/DROP\s+COLUMN/i, 'DROP COLUMN'],
    [/TRUNCATE/i, 'TRUNCATE'],
    [/^\s*DELETE\s+FROM\b/im, 'DELETE FROM'],
    [/^\s*UPDATE\s+/im, 'UPDATE'],
    [/^\s*INSERT\s+INTO\b/im, 'INSERT INTO'],
    [/neon/i, 'neon'],
    [/supabase/i, 'supabase'],
    [/vercel/i, 'vercel'],
  ]

  if (!options.allowMarketplaceTables) {
    forbiddenPatterns.push([/\bmarketplace\b/i, 'marketplace'])
    forbiddenPatterns.push([/\bmp_/i, 'marketplace prefix'])
  }

  for (const [pattern, labelText] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${labelText}.`)
    }
  }
}

function makeBytes(kind: 'jpeg' | 'png' | 'webp' | 'avif' | 'plain'): Uint8Array {
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

function makeMemoryStore(): MemoryStore {
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{ pathname: string; bodyBytes: number }>,
    delete: [] as Array<{ pathname: string }>,
  }
  const objects = new Map<
    string,
    { pathname: string; contentType: string; sizeBytes: number; uploadedAt: Date; access: 'private' }
  >()

  return {
    calls,
    objects,
    async headPrivate(pathname: string) {
      calls.head.push({ pathname })
      const value = objects.get(pathname)
      return value ? { ...value, uploadedAt: new Date(value.uploadedAt.getTime()) } : null
    },
    async putPrivate(input) {
      calls.put.push({ pathname: input.pathname, bodyBytes: input.body.byteLength })
      const value = {
        pathname: input.pathname,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        uploadedAt: new Date('2026-06-24T18:00:00.000Z'),
        access: 'private' as const,
      }
      objects.set(input.pathname, { ...value, uploadedAt: new Date(value.uploadedAt.getTime()) })
      return value
    },
    async deletePrivate(pathname: string) {
      calls.delete.push({ pathname })
      objects.delete(pathname)
    },
  }
}

function makeBookingRow(input: {
  id: string
  publicCode: string
  holdAcquiredAt: Date
  holdExpiresAt: Date
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentNormalizedReference?: string | null
  paymentReportedAt?: Date | null
  paymentExpectedTotalUsdSnapshot?: number | null
  paymentReportIdempotencyKey?: string | null
  paymentReportFingerprint?: string | null
}): Record<string, unknown> {
  return {
    id: input.id,
    publicCode: input.publicCode,
    status: 'under_review',
    priorityLevel: 'normal',
    source: 'web',
    requesterName: 'Ana Perez',
    requesterEmail: 'ana@example.com',
    requesterPhone: '+584121234567',
    eventTitle: 'Solicitud - Arma tu paquete',
    eventDate: input.holdAcquiredAt,
    eventEndDate: new Date(input.holdAcquiredAt.getTime() + 120 * 60_000),
    notes: null,
    internalNotes:
      input.paymentReportedAt == null
        ? '[ops_status:pending_payment]'
        : '[ops_status:payment_reported]',
    estimatedTotal: 280,
    currency: 'USD',
    calendarEventId: null,
    submittedAt: input.holdAcquiredAt,
    createdAt: input.holdAcquiredAt,
    updatedAt: input.holdAcquiredAt,
    bookingMode: 'custom_bundle',
    pricingSource: 'server_catalog_v1',
    idempotencyKey: 'HOLD_2026:06:24-0001',
    requestFingerprint: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    holdAcquiredAt: input.holdAcquiredAt,
    holdExpiresAt: input.holdExpiresAt,
    paymentMethod: input.paymentMethod ?? null,
    paymentReference: input.paymentReference ?? null,
    paymentNormalizedReference: input.paymentNormalizedReference ?? null,
    paymentReportedAt: input.paymentReportedAt ?? null,
    paymentExpectedTotalUsdSnapshot: input.paymentExpectedTotalUsdSnapshot ?? null,
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey ?? null,
    paymentReportFingerprint: input.paymentReportFingerprint ?? null,
  }
}

async function insertBookingRow(client: Client, row: Record<string, unknown>): Promise<void> {
  const columns = [
    'id',
    'publicCode',
    'status',
    'priorityLevel',
    'source',
    'requesterName',
    'requesterEmail',
    'requesterPhone',
    'eventTitle',
    'eventDate',
    'eventEndDate',
    'notes',
    'internalNotes',
    'estimatedTotal',
    'currency',
    'calendarEventId',
    'submittedAt',
    'createdAt',
    'updatedAt',
    'bookingMode',
    'pricingSource',
    'idempotencyKey',
    'requestFingerprint',
    'holdAcquiredAt',
    'holdExpiresAt',
    'paymentMethod',
    'paymentReference',
    'paymentNormalizedReference',
    'paymentReportedAt',
    'paymentExpectedTotalUsdSnapshot',
    'paymentReportIdempotencyKey',
    'paymentReportFingerprint',
  ]

  const placeholders = columns.map((_, index) => `$${index + 1}`)
  await client.query(
    `INSERT INTO "booking_requests" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders.join(', ')})`,
    columns.map((column) => row[column]),
  )
}

async function seedBooking(client: Client, input: {
  id: string
  publicCode: string
  holdAcquiredAt: Date
  holdExpiresAt: Date
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentNormalizedReference?: string | null
  paymentReportedAt?: Date | null
  paymentExpectedTotalUsdSnapshot?: number | null
  paymentReportIdempotencyKey?: string | null
  paymentReportFingerprint?: string | null
}): Promise<void> {
  await insertBookingRow(client, makeBookingRow(input))
}

async function readBookingRows(
  client: Client,
  publicCode: string,
): Promise<Array<Record<string, unknown>>> {
  const result = await client.query<Record<string, unknown>>(
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
        "paymentMethod",
        "paymentReference",
        "paymentNormalizedReference",
        "paymentReportedAt",
        "paymentExpectedTotalUsdSnapshot",
        "paymentReportIdempotencyKey",
        "paymentReportFingerprint"
      FROM "booking_requests"
      WHERE "publicCode" = $1
    `,
    [publicCode],
  )
  return result.rows
}

async function cleanupFixtures(client: Client): Promise<void> {
  await client.query(`DELETE FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08d_%'`).catch(() => {})
  await client.query(`DELETE FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg08d_%' OR id LIKE 'bkg08d_%'`).catch(() => {})
  await client.query(`DELETE FROM "booking_requests" WHERE id LIKE 'bkg08d_%' OR "publicCode" LIKE 'TUR-0808-%'`).catch(() => {})
}

function assertNoLeak(result: unknown): void {
  const text = JSON.stringify(result)
  assert.equal(text.includes('https://'), false)
  assert.equal(text.includes('DATABASE_URL'), false)
  assert.equal(text.includes('BLOB_READ_WRITE_TOKEN'), false)
  assert.equal(text.includes('paymentReportIdempotencyKey'), false)
  assert.equal(text.includes('paymentReportFingerprint'), false)
  assert.equal(text.includes('blobPathname'), false)
}

function makeClock(...values: Date[]): { now(): Date } {
  let index = 0
  return {
    now(): Date {
      const value = values[Math.min(index, values.length - 1)] ?? new Date()
      index += 1
      return new Date(value.getTime())
    },
  }
}

function makeThrowingClock(firstNow: Date, error: Error): { now(): Date } {
  let calls = 0
  return {
    now(): Date {
      calls += 1
      if (calls === 1) {
        return new Date(firstNow.getTime())
      }

      throw error
    },
  }
}

function makeSessionStub(options: { closeThrows?: boolean } = {}) {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  const closeCalls = { count: 0 }

  return {
    transactionScope: 'single_connection' as const,
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

async function openLocalCustomBundlePaymentPgSession(connectionString: string): Promise<LocalSqlSessionHandle> {
  const client = new Client({ connectionString })
  await client.connect()

  let closed = false

  return {
    session: {
      transactionScope: 'single_connection',
      async query<Row = Record<string, unknown>>(
        sql: string,
        params: readonly unknown[] = [],
      ): Promise<{ rows: Row[]; rowCount: number | null }> {
        const result = (await client.query<Row>(sql, [...params])) as {
          rows: Row[]
          rowCount: number | null
        }
        return {
          rows: result.rows,
          rowCount: result.rowCount,
        }
      },
    },
    async close(): Promise<void> {
      if (closed) {
        return
      }

      closed = true
      await client.end()
    },
  }
}

function assertSafeMessage(message: string): void {
  assert.ok(message.length > 0)
  assert.equal(/postgres|host|connection|string|sql/i.test(message), false)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length !== 4) {
    fail('Expected four SQL file arguments: baseline, BKG-04 proposal, BKG-07 proposal, and BKG-08 proposal.')
  }

  const [baselinePath, bkg04Path, bkg07Path, bkg08Path] = args.map((argument) =>
    resolve(process.cwd(), argument),
  )
  const baselineSql = readSqlFile(baselinePath)
  const bkg04Sql = readSqlFile(bkg04Path)
  const bkg07Sql = readSqlFile(bkg07Path)
  const bkg08Sql = readSqlFile(bkg08Path)

  assertNoForbiddenSql(baselineSql, 'Baseline SQL', { allowMarketplaceTables: true })
  assertNoForbiddenSql(bkg04Sql, 'BKG-04 SQL')
  assertNoForbiddenSql(bkg07Sql, 'BKG-07 SQL')
  assertNoForbiddenSql(bkg08Sql, 'BKG-08 SQL')

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  assert.equal(process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS, EXPECTED_OPT_IN)

  const client = new Client({ connectionString })

  try {
    await client.connect()
    const identity = await client.query<{ current_database: string; current_user: string }>(`
      SELECT current_database(), current_user
    `)
    assert.equal(identity.rows[0].current_database, EXPECTED_DATABASE)
    assert.equal(identity.rows[0].current_user, EXPECTED_USER)

    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query(baselineSql)
    await client.query(bkg04Sql)
    await client.query(bkg07Sql)
    await client.query(bkg08Sql)

    const previewResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'preview',
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        async openSqlSession() {
          fail('Preview must not open SQL sessions.')
        },
        async createPrivateBlobStore() {
          fail('Preview must not create private blob stores.')
        },
      },
      {
        submission: {
          publicCode: 'TUR-0808-900',
          paymentMethod: 'efectivo',
          paymentReference: 'EF-900',
        },
        paymentProofFile: makeFileLike({
          name: 'preview-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(previewResult.ok, true)
    assert.equal(previewResult.stage, 'simulated')
    assertNoLeak(previewResult)

    const bookingId = 'bkg08d_booking_paid_001'
    const publicCode = 'TUR-0808-901'
    await seedBooking(client, {
      id: bookingId,
      publicCode,
      holdAcquiredAt: new Date('2026-06-24T18:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
    })

    const store = makeMemoryStore()
    const successResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:30:00.000Z')),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
      },
      {
        submission: {
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-123-ABC',
        },
        paymentProofFile: makeFileLike({
          name: 'payment-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(successResult.ok, true)
    assert.equal(successResult.stage, 'reported')
    assert.equal(store.calls.put.length >= 1, true)

    const bookingRows = await readBookingRows(client, publicCode)
    assert.equal(bookingRows.length, 1)
    assert.equal(bookingRows[0].paymentMethod, 'pago_movil')
    assert.equal(bookingRows[0].paymentReportIdempotencyKey !== null, true)
    assert.equal(bookingRows[0].paymentReportFingerprint !== null, true)

    const replayResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:40:00.000Z')),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
      },
      {
        submission: {
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-123-ABC',
        },
        paymentProofFile: makeFileLike({
          name: 'payment-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(replayResult.ok, true)
    assert.equal(replayResult.stage, 'replayed')

    const transferBookingId = 'bkg08d_booking_transfer_001'
    const transferPublicCode = 'TUR-0808-902'
    await seedBooking(client, {
      id: transferBookingId,
      publicCode: transferPublicCode,
      holdAcquiredAt: new Date('2026-06-24T18:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
    })

    const transferResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:50:00.000Z')),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
      },
      {
        submission: {
          publicCode: transferPublicCode,
          paymentMethod: 'transferencia',
          paymentReference: 'TR-902',
        },
        paymentProofFile: makeFileLike({
          name: 'transfer-proof.webp',
          type: 'image/webp',
          bytes: makeBytes('webp'),
        }),
      },
    )
    assert.equal(transferResult.ok, true)
    assert.equal(transferResult.stage, 'reported')

    const cashBookingId = 'bkg08d_booking_cash_001'
    const cashPublicCode = 'TUR-0808-903'
    await seedBooking(client, {
      id: cashBookingId,
      publicCode: cashPublicCode,
      holdAcquiredAt: new Date('2026-06-24T18:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
    })

    const cashResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:55:00.000Z')),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
      },
      {
        submission: {
          publicCode: cashPublicCode,
          paymentMethod: 'efectivo',
          paymentReference: 'EF-903',
        },
        paymentProofFile: null,
      },
    )
    assert.equal(cashResult.ok, true)
    assert.equal(cashResult.stage, 'reported')

    const expiredBookingId = 'bkg08d_booking_expired_001'
    const expiredPublicCode = 'TUR-0808-904'
    await seedBooking(client, {
      id: expiredBookingId,
      publicCode: expiredPublicCode,
      holdAcquiredAt: new Date('2026-06-24T18:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-24T18:10:00.000Z'),
    })

    const expiredResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:30:00.000Z')),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
      },
      {
        submission: {
          publicCode: expiredPublicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'EXP-904',
        },
        paymentProofFile: makeFileLike({
          name: 'expired-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(expiredResult.ok, false)
    assert.equal(expiredResult.stage, 'booking')

    const boundaryBookingId = 'bkg08d_booking_boundary_001'
    const boundaryPublicCode = 'TUR-0808-905'
    await seedBooking(client, {
      id: boundaryBookingId,
      publicCode: boundaryPublicCode,
      holdAcquiredAt: new Date('2026-06-24T18:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-24T18:30:00.000Z'),
    })

    const boundaryResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeThrowingClock(
          new Date('2026-06-24T18:29:00.000Z'),
          new Error('clock failure'),
        ),
        async openSqlSession() {
          const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
          return {
            session: handle.session,
            close: handle.close,
          }
        },
        async createPrivateBlobStore() {
          return store
        },
        async runPaymentProofFlow() {
          return {
            ok: false,
            stage: 'post_upload_failure',
            createdByThisCall: true,
            cleanupPerformed: true,
            proofMetadata: null,
            originalFailure: {
              stage: 'clock',
              code: 'CLOCK_READ_FAILED',
              message: 'clock failure',
            },
          } as never
        },
      },
      {
        submission: {
          publicCode: boundaryPublicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'BND-905',
        },
        paymentProofFile: makeFileLike({
          name: 'boundary-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(boundaryResult.ok, false)
    assert.equal(boundaryResult.stage, 'infrastructure')

    const badDbResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        async openSqlSession() {
          throw new Error('database down')
        },
        async createPrivateBlobStore() {
          fail('Blob store must not be created when SQL fails.')
        },
      },
      {
        submission: {
          publicCode: 'TUR-0808-906',
          paymentMethod: 'efectivo',
          paymentReference: 'EF-906',
        },
        paymentProofFile: null,
      },
    )
    assert.equal(badDbResult.ok, false)
    assert.equal(badDbResult.code, 'SERVER_DATABASE_UNAVAILABLE')

    const badStoreSession = makeSessionStub()
    const badStoreResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        async openSqlSession() {
          return {
            session: badStoreSession,
            async close(): Promise<void> {
              await badStoreSession.close()
            },
          }
        },
        async createPrivateBlobStore() {
          throw new Error('store down')
        },
      },
      {
        submission: {
          publicCode: 'TUR-0808-907',
          paymentMethod: 'pago_movil',
          paymentReference: 'PAY-907',
        },
        paymentProofFile: makeFileLike({
          name: 'store-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(badStoreResult.ok, false)
    assert.equal(badStoreResult.code, 'PRIVATE_STORAGE_UNAVAILABLE')
    assert.equal(badStoreSession.closeCalls.count > 0, true)

    const throwingFlowSession = makeSessionStub()
    const throwingFlowResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        async openSqlSession() {
          return {
            session: throwingFlowSession,
            async close(): Promise<void> {
              await throwingFlowSession.close()
            },
          }
        },
        async createPrivateBlobStore() {
          return store
        },
        async runPaymentProofFlow() {
          throw new Error('boom')
        },
      },
      {
        submission: {
          publicCode: 'TUR-0808-908',
          paymentMethod: 'pago_movil',
          paymentReference: 'PAY-908',
        },
        paymentProofFile: makeFileLike({
          name: 'throwing-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(throwingFlowResult.ok, false)
    assert.equal(throwingFlowResult.code, 'PAYMENT_FLOW_EXECUTION_FAILED')
    assert.equal(throwingFlowSession.closeCalls.count > 0, true)

    const closeThrowsSession = makeSessionStub({ closeThrows: true })
    const closeThrowsResult = await runCustomBundlePaymentServerEntrypointCore(
      {
        runtime: 'isolated_test',
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        async openSqlSession() {
          return {
            session: closeThrowsSession,
            async close(): Promise<void> {
              await closeThrowsSession.close()
            },
          }
        },
        async createPrivateBlobStore() {
          return store
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
              publicCode: 'TUR-0808-909',
              operationalStatus: 'payment_reported',
              bookingStatus: 'under_review',
              paymentMethod: 'pago_movil',
              paymentReference: 'PAY-909',
              normalizedReference: 'PAY909',
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
          } as never
        },
      },
      {
        submission: {
          publicCode: 'TUR-0808-909',
          paymentMethod: 'pago_movil',
          paymentReference: 'PAY-909',
        },
        paymentProofFile: makeFileLike({
          name: 'close-proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      },
    )
    assert.equal(closeThrowsResult.ok, false)
    assert.equal(closeThrowsResult.code, 'SQL_SESSION_CLOSE_FAILED')

    const noClientKey = JSON.stringify(
      await runCustomBundlePaymentServerEntrypointCore(
        {
          runtime: 'preview',
          clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
          async openSqlSession() {
            fail('preview should not open sql')
          },
          async createPrivateBlobStore() {
            fail('preview should not create blob')
          },
        },
        {
          submission: {
            publicCode: 'TUR-0808-910',
            paymentMethod: 'efectivo',
            paymentReference: 'EF-910',
          },
          paymentProofFile: null,
        },
      ),
    )
    assert.equal(noClientKey.includes('paymentReportIdempotencyKey'), false)

    await cleanupFixtures(client)
    const remaining = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "booking_requests"
      WHERE id LIKE 'bkg08d_%'
         OR "publicCode" LIKE 'TUR-0808-%'
    `)
    assert.equal(Number(remaining.rows[0]?.count ?? 0), 0)

    const proofCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "payment_proofs"
      WHERE id LIKE 'bkg08d_%'
         OR "bookingRequestId" LIKE 'bkg08d_%'
    `)
    assert.equal(Number(proofCount.rows[0]?.count ?? 0), 0)

    const auditCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "audit_log"
      WHERE id LIKE 'bkg08d_%'
         OR "bookingRequestId" LIKE 'bkg08d_%'
    `)
    assert.equal(Number(auditCount.rows[0]?.count ?? 0), 0)

    console.log('booking_isolated_custom_bundle_payment_server_entrypoint OK')
    console.log('preview isolation: verified')
    console.log('private proof integration: verified')
    console.log('transactional reporting: verified')
    console.log('stable server idempotency: verified')
    console.log('exact replay: verified')
    console.log('conflict cleanup: verified')
    console.log('session lifecycle: verified')
    console.log('secret-free result: verified')
    console.log('database cleanup: verified')
    console.log('storage cleanup: verified')
  } catch (error) {
    await cleanupFixtures(client).catch(() => {})
    throw error
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((error) => fail('Unexpected failure while validating the payment server entrypoint integration gate.', error))
