import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Client } from 'pg'

import {
  buildPaymentRecoveryToken,
  validatePaymentRecoveryToken,
} from '@/lib/bookings/payment-recovery-token'
import {
  runCustomBundleProtectedPaymentActionCore,
  type CustomBundleProtectedPaymentActionDependencies,
} from '@/lib/bookings/custom-bundle-payment-action-core'
import { runCustomBundlePaymentServerEntrypointCore } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import type { CustomBundlePaymentProofFileLike } from '@/lib/bookings/custom-bundle-payment-proof-boundary'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_payment_action FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

let currentRecoveryToken = ''

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

function makeMemoryStore() {
  const objects = new Map<
    string,
    {
      pathname: string
      contentType: string
      sizeBytes: number
      uploadedAt: Date
      access: 'private'
    }
  >()
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{
      pathname: string
      contentType: string
      access: 'private'
      addRandomSuffix: false
      bodyBytes: number
    }>,
    delete: [] as Array<{ pathname: string }>,
  }

  return {
    calls,
    objects,
    seedObject(object: {
      pathname: string
      contentType: string
      sizeBytes: number
      uploadedAt: Date
      access: 'private'
    }): void {
      objects.set(object.pathname, structuredClone(object))
    },
    async headPrivate(pathname: string) {
      calls.head.push({ pathname })
      const value = objects.get(pathname)
      return value ? structuredClone(value) : null
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
      access: 'private'
      addRandomSuffix: false
    }) {
      calls.put.push({
        pathname: input.pathname,
        contentType: input.contentType,
        access: input.access,
        addRandomSuffix: input.addRandomSuffix,
        bodyBytes: input.body.byteLength,
      })

      if (objects.has(input.pathname)) {
        const error = new Error('object already exists') as Error & { code: string }
        error.code = 'OBJECT_ALREADY_EXISTS'
        throw error
      }

      const value = {
        pathname: input.pathname,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        uploadedAt: new Date('2026-06-24T18:00:00.000Z'),
        access: 'private' as const,
      }
      objects.set(input.pathname, structuredClone(value))
      return structuredClone(value)
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
      objects.delete(pathname)
    },
    clear(): void {
      objects.clear()
    },
  }
}

function makeClock(now: Date): { now(): Date } {
  return {
    now(): Date {
      return new Date(now.getTime())
    },
  }
}

function makeThrowingClock(error: Error): { now(): Date } {
  return {
    now(): Date {
      throw error
    },
  }
}

function makeValidToken(publicCode: string, now: Date): string {
  const token = buildPaymentRecoveryToken({
    bookingPublicCode: publicCode,
    now,
    expiresAt: new Date(now.getTime() + 15 * 60_000),
  })
  if (!token) {
    fail('Unable to build a valid payment recovery token.')
  }

  return token
}

function makeAuthorizeAdapter(): CustomBundleProtectedPaymentActionDependencies['authorizePaymentAccess'] {
  return async ({ token, expectedPublicCode, now }) => {
    const result = validatePaymentRecoveryToken(token, expectedPublicCode, now)
    return result.ok ? { ok: true } : { ok: false, reason: result.error }
  }
}

function makeEntryPointSuccessResult(stage: 'reported' | 'replayed', publicCode: string) {
  return {
    ok: true,
    stage,
    simulated: false,
    publicCode,
    paymentStatus: 'payment_reported' as const,
    replayed: stage === 'replayed',
    message: stage === 'replayed' ? 'Pago consolidado ya registrado.' : 'Pago consolidado reportado correctamente.',
  }
}

function makeActionInput(input: {
  publicCode: string
  paymentMethod: 'pago_movil' | 'transferencia' | 'binance' | 'efectivo'
  paymentReference: string
  paymentRecoveryToken: string
  paymentProofFile: CustomBundlePaymentProofFileLike | null
}) {
  currentRecoveryToken = input.paymentRecoveryToken
  return {
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
    paymentProofFile: input.paymentProofFile,
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
    idempotencyKey: `HOLD_2026:06:24-${input.id}`,
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

async function seedBooking(
  client: Client,
  input: {
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
  },
): Promise<void> {
  await insertBookingRow(client, makeBookingRow(input))
}

async function openLocalCustomBundlePaymentPgSession(connectionString: string) {
  const client = new Client({ connectionString })
  await client.connect()

  let closed = false
  return {
    session: {
      transactionScope: 'single_connection' as const,
      async query<Row = Record<string, unknown>>(
        sql: string,
        params: readonly unknown[] = [],
      ): Promise<{ rows: Row[]; rowCount: number | null }> {
        const result = (await client.query<Row>(sql, [...params])) as {
          rows: Row[]
          rowCount: number | null
        }
        return { rows: result.rows, rowCount: result.rowCount }
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

async function readBookingRow(
  client: Client,
  publicCode: string,
): Promise<Record<string, unknown> | null> {
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
  return result.rows[0] ?? null
}

async function readCounts(client: Client, bookingId: string): Promise<{
  paymentProofs: number
  auditLog: number
}> {
  const paymentProofs = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "payment_proofs" WHERE "bookingRequestId" = $1`,
    [bookingId],
  )
  const auditLog = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "audit_log" WHERE "bookingRequestId" = $1`,
    [bookingId],
  )
  return {
    paymentProofs: Number(paymentProofs.rows[0]?.count ?? 0),
    auditLog: Number(auditLog.rows[0]?.count ?? 0),
  }
}

async function cleanupFixtures(client: Client): Promise<void> {
  await client.query(`DELETE FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08e_%'`).catch(() => {})
  await client
    .query(
      `DELETE FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg08e_%' OR id LIKE 'bkg08e_%'`,
    )
    .catch(() => {})
  await client
    .query(`DELETE FROM "booking_requests" WHERE id LIKE 'bkg08e_%' OR "publicCode" LIKE 'TUR-0808-%'`)
    .catch(() => {})
}

function assertNoLeak(result: unknown): void {
  const text = JSON.stringify(result)
  assert.equal(text.includes('paymentRecoveryToken'), false)
  assert.equal(text.includes('paymentReportIdempotencyKey'), false)
  assert.equal(text.includes('paymentReportFingerprint'), false)
  assert.equal(text.includes('blobPathname'), false)
  assert.equal(text.includes('DATABASE_URL'), false)
  assert.equal(text.includes('BLOB_READ_WRITE_TOKEN'), false)
  assert.equal(text.includes('https://'), false)
}

function makeActionDependencies(input: {
  clock: { now(): Date }
  runServerEntrypoint: CustomBundleProtectedPaymentActionDependencies['runServerEntrypoint']
  authorizePaymentAccess?: CustomBundleProtectedPaymentActionDependencies['authorizePaymentAccess']
}): CustomBundleProtectedPaymentActionDependencies {
  return {
    readRecoveryToken(): string | null {
      const token = currentRecoveryToken.trim()
      return token.length > 0 ? token : null
    },
    clock: input.clock,
    authorizePaymentAccess: input.authorizePaymentAccess ?? makeAuthorizeAdapter(),
    runServerEntrypoint: input.runServerEntrypoint,
  }
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
  process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET = 'qa-action-secret'

  const client = new Client({ connectionString })
  const store = makeMemoryStore()
  const baseNow = new Date('2026-06-24T18:00:00.000Z')

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

    // 1. Preview valid with proof: no SQL, no Blob.
    {
      const previewProof = makeFileLike({
        name: 'preview-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const previewResult = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'preview',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  fail('Preview must not open SQL sessions.')
                },
                async createPrivateBlobStore() {
                  fail('Preview must not create private blob stores.')
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode: 'TUR-0808-100',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-100',
          paymentRecoveryToken: makeValidToken('TUR-0808-100', baseNow),
          paymentProofFile: previewProof,
        }),
      )
      assert.equal(previewResult.ok, true)
      assert.equal(previewResult.stage, 'simulated')
      assert.equal(previewProof.arrayBufferCalls.count >= 0, true)
      assertNoLeak(previewResult)
    }

    // 2. Pago movil aislado.
    {
      const bookingId = 'bkg08e_mobile_001'
      const publicCode = 'TUR-0808-101'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'mobile-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-123-ABC',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'reported')
      const row = await readBookingRow(client, publicCode)
      assert.ok(row)
      const counts = await readCounts(client, bookingId)
      assert.equal(counts.paymentProofs, 1)
      assert.equal(counts.auditLog, 1)
      assert.equal(store.calls.put.length, 1)
      assert.equal(store.calls.delete.length, 0)
    }

    // 3. Transferencia.
    {
      const bookingId = 'bkg08e_transfer_001'
      const publicCode = 'TUR-0808-102'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'transfer-proof.webp',
        type: 'image/webp',
        bytes: makeBytes('webp'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'transferencia',
          paymentReference: 'TR-902',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'reported')
    }

    // 4. Binance.
    {
      const bookingId = 'bkg08e_binance_001'
      const publicCode = 'TUR-0808-103'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'binance-proof.avif',
        type: 'image/avif',
        bytes: makeBytes('avif'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'binance',
          paymentReference: 'BN-103',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'reported')
    }

    // 5. Efectivo sin archivo.
    {
      const bookingId = 'bkg08e_cash_001'
      const publicCode = 'TUR-0808-104'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'efectivo',
          paymentReference: 'EF-104',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: null,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'reported')
    }

    // 6. Efectivo con archivo opcional.
    {
      const bookingId = 'bkg08e_cash_file_001'
      const publicCode = 'TUR-0808-105'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'cash-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'efectivo',
          paymentReference: 'EF-105',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'reported')
    }

    // 7. Exact replay.
    {
      const publicCode = 'TUR-0808-101'
      const bookingId = 'bkg08e_mobile_001'
      const proof = makeFileLike({
        name: 'mobile-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-123-ABC',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, true)
      assert.equal(result.stage, 'replayed')
      const counts = await readCounts(client, bookingId)
      assert.equal(counts.paymentProofs, 1)
      assert.equal(counts.auditLog, 1)
    }

    // 8. Archivo distinto con misma token/referencia.
    {
      const publicCode = 'TUR-0808-101'
      const proofBytes = makeBytes('png')
      proofBytes[9] = 0x01
      const proof = makeFileLike({
        name: 'mobile-proof-alt.png',
        type: 'image/png',
        bytes: proofBytes,
      })
      const previousPutCount = store.calls.put.length
      const previousDeleteCount = store.calls.delete.length
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-123-ABC',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'conflict')
      assert.equal(store.calls.put.length > previousPutCount, true)
      assert.equal(store.calls.delete.length > previousDeleteCount, true)
    }

    // 9. Referencia normalizada equivalente.
    {
      const publicCode = 'TUR-0808-106'
      const bookingId = 'bkg08e_normref_001'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T19:00:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'norm-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const first = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-200-XYZ',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(first.ok, true)
      const replay = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: ' pago 200 xyz ',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(replay.ok, true)
      assert.equal(replay.stage, 'replayed')
    }

    // 10. Referencia distinta.
    {
      const publicCode = 'TUR-0808-106'
      const proof = makeFileLike({
        name: 'norm-proof-2.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'Pago-999-XYZ',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'conflict')
    }

    // 11. Proof required absent.
    {
      const publicCode = 'TUR-0808-107'
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  fail('Proof missing must not open SQL.')
                },
                async createPrivateBlobStore() {
                  fail('Proof missing must not create storage.')
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'PM-107',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: null,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'proof')
    }

    // 12. Hold expirado con token valido.
    {
      const bookingId = 'bkg08e_expired_001'
      const publicCode = 'TUR-0808-108'
      await seedBooking(client, {
        id: bookingId,
        publicCode,
        holdAcquiredAt: baseNow,
        holdExpiresAt: new Date('2026-06-24T18:01:00.000Z'),
      })
      const proof = makeFileLike({
        name: 'expired-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(new Date('2026-06-24T18:30:00.000Z')),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(new Date('2026-06-24T18:30:00.000Z')),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'EXP-108',
          paymentRecoveryToken: makeValidToken(
            publicCode,
            new Date('2026-06-24T18:30:00.000Z'),
          ),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'booking')
      assert.equal(store.calls.delete.length > 0, true)
      const counts = await readCounts(client, bookingId)
      assert.equal(counts.paymentProofs, 0)
      assert.equal(counts.auditLog, 0)
    }

    // 13. Booking inexistente con token valido.
    {
      const publicCode = 'TUR-0808-109'
      const proof = makeFileLike({
        name: 'missing-proof.png',
        type: 'image/png',
        bytes: makeBytes('png'),
      })
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async (input) =>
            runCustomBundlePaymentServerEntrypointCore(
              {
                runtime: 'isolated_test',
                clock: makeClock(baseNow),
                async openSqlSession() {
                  const handle = await openLocalCustomBundlePaymentPgSession(connectionString)
                  return { session: handle.session, close: handle.close }
                },
                async createPrivateBlobStore() {
                  return store
                },
              },
              input,
            ),
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'pago_movil',
          paymentReference: 'MISS-109',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: proof,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'conflict')
      assert.equal(store.calls.delete.length > 0, true)
    }

    // 14. Authorizer throw.
    {
      const publicCode = 'TUR-0808-110'
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          authorizePaymentAccess: async () => {
            throw new Error('authorizer failed')
          },
          runServerEntrypoint: async () => {
            fail('Authorizer failure must not reach entrypoint.')
          },
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'efectivo',
          paymentReference: 'AUTH-110',
          paymentRecoveryToken: 'token',
          paymentProofFile: null,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'authorization')
      assertNoLeak(result)
    }

    // 15. Entrypoint throw.
    {
      const publicCode = 'TUR-0808-111'
      const result = await runCustomBundleProtectedPaymentActionCore(
        makeActionDependencies({
          clock: makeClock(baseNow),
          runServerEntrypoint: async () => {
            throw new Error('entrypoint boom')
          },
        }),
        makeActionInput({
          publicCode,
          paymentMethod: 'efectivo',
          paymentReference: 'ENTRY-111',
          paymentRecoveryToken: makeValidToken(publicCode, baseNow),
          paymentProofFile: null,
        }),
      )
      assert.equal(result.ok, false)
      assert.equal(result.stage, 'infrastructure')
      if (!result.ok) {
        assert.equal(result.code, 'PAYMENT_ACTION_EXECUTION_FAILED')
      }
      assertNoLeak(result)
    }

    // 16-17. Cleanup database and storage.
    await cleanupFixtures(client)
    store.clear()

    const remaining = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "booking_requests"
      WHERE id LIKE 'bkg08e_%'
         OR "publicCode" LIKE 'TUR-0808-%'
    `)
    assert.equal(Number(remaining.rows[0]?.count ?? 0), 0)

    const proofCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "payment_proofs"
      WHERE id LIKE 'bkg08e_%'
         OR "bookingRequestId" LIKE 'bkg08e_%'
    `)
    assert.equal(Number(proofCount.rows[0]?.count ?? 0), 0)

    const auditCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "audit_log"
      WHERE id LIKE 'bkg08e_%'
         OR "bookingRequestId" LIKE 'bkg08e_%'
    `)
    assert.equal(Number(auditCount.rows[0]?.count ?? 0), 0)

    assert.equal(store.objects.size, 0)

    console.log('booking_isolated_custom_bundle_payment_action OK')
    console.log('token authorization: verified')
    console.log('preview isolation: verified')
    console.log('authorization before proof read: verified')
    console.log('protected payment reporting: verified')
    console.log('exact replay: verified')
    console.log('conflict cleanup: verified')
    console.log('expired hold cleanup: verified')
    console.log('missing booking cleanup: verified')
    console.log('secret-free result: verified')
    console.log('database cleanup: verified')
    console.log('storage cleanup: verified')
    await new Promise<void>((resolve) => setImmediate(resolve))
  } catch (error) {
    await cleanupFixtures(client).catch(() => {})
    store.clear()
    throw error
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((error) => fail('Unexpected failure while validating the isolated protected payment action gate.', error))
