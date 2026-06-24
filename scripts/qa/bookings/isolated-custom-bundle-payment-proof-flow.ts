import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  runCustomBundlePaymentProofFlow,
  type CustomBundlePaymentProofFlowResult,
} from '@/lib/bookings/custom-bundle-payment-proof-flow'
import {
  buildCustomBundlePaymentProofPrivatePathname,
  deleteCustomBundlePaymentProofFromPrivateStore,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobObject,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type { CustomBundlePaymentReportSubmission } from '@/lib/bookings/custom-bundle-payment-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

type TracingSession = CustomBundleSqlSession & {
  calls: Array<{
    sql: string
    params: readonly unknown[]
    error?: { code: string | null; message: string }
  }>
}

type ProofStoreControls = CustomBundlePrivateBlobStore & {
  calls: {
    head: Array<{ pathname: string }>
    put: Array<{ pathname: string; bodyBytes: number; contentType: string; access: 'private'; addRandomSuffix: false }>
    delete: Array<{ pathname: string }>
  }
  seedObject(object: CustomBundlePrivateBlobObject): void
  queueHeadError(error: Error & { code?: string }): void
  queueHeadResponse(object: CustomBundlePrivateBlobObject | null): void
  queuePutError(error: Error & { code?: string }): void
  queuePutResponse(object: CustomBundlePrivateBlobObject): void
  queueDeleteError(error: Error & { code?: string }): void
  readObject(pathname: string): CustomBundlePrivateBlobObject | null
}

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_payment_proof_flow FAILED')
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
  const patterns: Array<[RegExp, string]> = [
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
    patterns.push([/\bmarketplace\b/i, 'marketplace'])
    patterns.push([/\bmp_/i, 'marketplace prefix'])
  }

  for (const [pattern, labelText] of patterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${labelText}.`)
    }
  }
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

function createTracingSession(
  client: Client,
  options: {
    injectError?: {
      pattern: RegExp
      error: Error & { code?: string; constraint?: string }
      remainingHits: number
    }
  } = {},
): TracingSession {
  const calls: Array<{
    sql: string
    params: readonly unknown[]
    error?: { code: string | null; message: string }
  }> = []
  const injectError = options.injectError

  return {
    transactionScope: 'single_connection',
    calls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      const call: (typeof calls)[number] = { sql, params: [...params] }
      calls.push(call)
      if (
        injectError &&
        injectError.remainingHits > 0 &&
        injectError.pattern.test(sql)
      ) {
        injectError.remainingHits -= 1
        throw injectError.error
      }

      try {
        const result = (await client.query<Row>(sql, [...params])) as {
          rows: Row[]
          rowCount: number | null
        }
        return {
          rows: result.rows,
          rowCount: result.rowCount,
        }
      } catch (error) {
        call.error = {
          code:
            typeof error === 'object' && error !== null && 'code' in error
              ? typeof (error as { code?: unknown }).code === 'string'
                ? (error as { code: string }).code
                : null
              : null,
          message: error instanceof Error ? error.message : String(error),
        }
        throw error
      }
    },
  }
}

function makeHexFingerprint(seed: string): string {
  return seed.toLowerCase().replace(/[^0-9a-f]/g, 'a').padEnd(64, 'a').slice(0, 64)
}

function makeFileLike(input: {
  name: string
  type: string
  bytes: Uint8Array
  throws?: boolean
}): CustomBundlePaymentProofFileLike {
  return {
    name: input.name,
    type: input.type,
    size: input.bytes.byteLength,
    async arrayBuffer(): Promise<ArrayBuffer> {
      if (input.throws) {
        throw new Error('arrayBuffer failure')
      }

      return input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength,
      ) as ArrayBuffer
    },
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
      return new Uint8Array([0x01, 0x02, 0x03, 0x04])
  }
}

function makeBookingInput(input: {
  publicCode: string
  paymentMethod: CustomBundlePaymentReportSubmission['paymentMethod']
  paymentReference: string
  paymentReportIdempotencyKey: string
  paymentProofFile?: CustomBundlePaymentProofFileLike | null
  now?: Date[]
}): {
  submission: CustomBundlePaymentReportSubmission
  paymentReportIdempotencyKey: string
  paymentProofFile: CustomBundlePaymentProofFileLike | null
  clock: { now(): Date }
} {
  return {
    submission: {
      publicCode: input.publicCode,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
    },
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
    paymentProofFile: input.paymentProofFile ?? null,
    clock: makeClock(...(input.now ?? [new Date('2026-06-23T14:30:00.000Z')])),
  }
}

function createProofStore(): ProofStoreControls {
  const objects = new Map<string, CustomBundlePrivateBlobObject>()
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{
      pathname: string
      bodyBytes: number
      contentType: string
      access: 'private'
      addRandomSuffix: false
    }>,
    delete: [] as Array<{ pathname: string }>,
  }
  const headQueue: Array<CustomBundlePrivateBlobObject | null> = []
  const headErrorQueue: Array<Error & { code?: string }> = []
  const putErrorQueue: Array<Error & { code?: string }> = []
  const putResponseQueue: Array<CustomBundlePrivateBlobObject> = []
  const deleteErrorQueue: Array<Error & { code?: string }> = []

  return {
    calls,
    seedObject(object: CustomBundlePrivateBlobObject): void {
      objects.set(object.pathname, structuredClone(object))
    },
    queueHeadError(error: Error & { code?: string }): void {
      headErrorQueue.push(error)
    },
    queueHeadResponse(object: CustomBundlePrivateBlobObject | null): void {
      headQueue.push(object ? structuredClone(object) : null)
      if (object) {
        objects.set(object.pathname, structuredClone(object))
      }
    },
    queuePutError(error: Error & { code?: string }): void {
      putErrorQueue.push(error)
    },
    queuePutResponse(object: CustomBundlePrivateBlobObject): void {
      putResponseQueue.push(structuredClone(object))
    },
    queueDeleteError(error: Error & { code?: string }): void {
      deleteErrorQueue.push(error)
    },
    readObject(pathname: string): CustomBundlePrivateBlobObject | null {
      const value = objects.get(pathname)
      return value ? structuredClone(value) : null
    },
    async headPrivate(pathname: string): Promise<CustomBundlePrivateBlobObject | null> {
      calls.head.push({ pathname })
      if (headErrorQueue.length > 0) {
        throw headErrorQueue.shift()!
      }
      if (headQueue.length > 0) {
        const queued = headQueue.shift()!
        return queued ? structuredClone(queued) : null
      }
      const value = objects.get(pathname)
      return value ? structuredClone(value) : null
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
      access: 'private'
      addRandomSuffix: false
    }): Promise<CustomBundlePrivateBlobObject> {
      calls.put.push({
        pathname: input.pathname,
        bodyBytes: input.body.byteLength,
        contentType: input.contentType,
        access: input.access,
        addRandomSuffix: input.addRandomSuffix,
      })

      if (putErrorQueue.length > 0) {
        throw putErrorQueue.shift()!
      }

      const stored: CustomBundlePrivateBlobObject =
        putResponseQueue.length > 0
          ? putResponseQueue.shift()!
          : {
              pathname: input.pathname,
              contentType: input.contentType,
              sizeBytes: input.body.byteLength,
              uploadedAt: new Date('2026-06-23T14:30:00.000Z'),
              access: 'private',
            }
      objects.set(input.pathname, structuredClone(stored))
      return structuredClone(stored)
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
      if (deleteErrorQueue.length > 0) {
        throw deleteErrorQueue.shift()!
      }
      objects.delete(pathname)
    },
  }
}

async function queryRows<Row = Record<string, unknown>>(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await client.query<Row>(sql, [...values])
  return result.rows
}

async function seedCatalog(client: Client): Promise<{
  serviceId: string
  variantId: string
  resourceId: string
}> {
  const serviceId = 'bkg08c_service_sala'
  const variantId = 'bkg08c_variant_sala_premium'
  const resourceId = 'bkg08c_resource_sala_3'

  await client.query(
    `
      INSERT INTO "services" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES ($1, 'sala-ensayo', 'Sala de ensayo', 'Servicio de prueba', true, NOW(), NOW())
    `,
    [serviceId],
  )

  await client.query(
    `
      INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId", "createdAt", "updatedAt")
      VALUES ($1, 'sala-ensayo-premium', 'Sala Premium', 'Variante de prueba', true, $2, NOW(), NOW())
    `,
    [variantId, serviceId],
  )

  await client.query(
    `
      INSERT INTO "resources" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES ($1, 'sala-3-ensayo', 'Sala 3', 'Recurso de prueba', true, NOW(), NOW())
    `,
    [resourceId],
  )

  return { serviceId, variantId, resourceId }
}

async function insertFixtureBooking(
  client: Client,
  input: {
    id: string
    publicCode: string
    status?: string
    internalNotes?: string | null
    holdAcquiredAt?: Date
    holdExpiresAt?: Date
    estimatedTotal?: number
    paymentMethod?: string | null
    paymentReference?: string | null
    paymentNormalizedReference?: string | null
    paymentReportedAt?: Date | null
    paymentExpectedTotalUsdSnapshot?: number | null
    paymentReportIdempotencyKey?: string | null
    paymentReportFingerprint?: string | null
    resourceId?: string | null
    serviceVariantId: string
  },
): Promise<void> {
  const eventDate = new Date('2026-06-24T14:00:00.000Z')
  const eventEndDate = new Date('2026-06-24T16:00:00.000Z')
  const holdAcquiredAt = input.holdAcquiredAt ?? new Date('2026-06-23T13:00:00.000Z')
  const holdExpiresAt = input.holdExpiresAt ?? new Date('2026-06-23T15:00:00.000Z')

  await client.query(
    `
      INSERT INTO "booking_requests" (
        id,
        "publicCode",
        status,
        "priorityLevel",
        source,
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "eventDate",
        "eventEndDate",
        notes,
        "internalNotes",
        "estimatedTotal",
        currency,
        "submittedAt",
        "bookingMode",
        "pricingSource",
        "idempotencyKey",
        "requestFingerprint",
        "holdAcquiredAt",
        "holdExpiresAt",
        "paymentMethod",
        "paymentReference",
        "paymentNormalizedReference",
        "paymentReportedAt",
        "paymentExpectedTotalUsdSnapshot",
        "paymentReportIdempotencyKey",
        "paymentReportFingerprint",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, 'normal', 'web', 'Ana Perez', 'ana@example.com', '+584121234567',
        'Solicitud - Arma tu paquete', $4, $5, 'Notas externas', $6, $7, 'USD', $4,
        'custom_bundle', 'server_catalog_v1', $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      )
    `,
    [
      input.id,
      input.publicCode,
      input.status ?? 'under_review',
      eventDate,
      eventEndDate,
      input.internalNotes ?? '[ops_status:pending_payment]\nnota interna',
      (input.estimatedTotal ?? 280).toFixed(2),
      `hold-idem-${input.id}`,
      makeHexFingerprint(input.id),
      holdAcquiredAt,
      holdExpiresAt,
      input.paymentMethod ?? null,
      input.paymentReference ?? null,
      input.paymentNormalizedReference ?? null,
      input.paymentReportedAt ?? null,
      input.paymentExpectedTotalUsdSnapshot?.toFixed(2) ?? null,
      input.paymentReportIdempotencyKey ?? null,
      input.paymentReportFingerprint ?? null,
    ],
  )

  await client.query(
    `
      INSERT INTO "booking_request_items" (
        id,
        "bookingRequestId",
        "serviceVariantId",
        "resourceId",
        "itemSlug",
        "itemName",
        "itemKind",
        quantity,
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay",
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'sala-premium', 'Sala Premium', 'service', 2, NULL, 120, 25, 50, 'itemized', NULL, NOW(), NOW()
      )
    `,
    [
      `${input.id}_item`,
      input.id,
      input.serviceVariantId,
      input.resourceId ?? null,
    ],
  )
}

async function fetchBooking(client: Client, publicCode: string): Promise<Record<string, unknown> | null> {
  const rows = await queryRows<Record<string, unknown>>(
    client,
    `
      SELECT
        id,
        "publicCode",
        status,
        "internalNotes",
        "holdAcquiredAt",
        "holdExpiresAt",
        "paymentMethod",
        "paymentReference",
        "paymentNormalizedReference",
        "paymentReportedAt",
        "paymentExpectedTotalUsdSnapshot",
        "paymentReportIdempotencyKey",
        "paymentReportFingerprint",
        "estimatedTotal",
        currency
      FROM "booking_requests"
      WHERE "publicCode" = $1
    `,
    [publicCode],
  )
  return rows[0] ?? null
}

async function fetchItems(client: Client, bookingRequestId: string): Promise<Array<Record<string, unknown>>> {
  return queryRows(
    client,
    `
      SELECT
        "resourceId",
        "serviceVariantId",
        "itemSlug"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      ORDER BY id ASC
    `,
    [bookingRequestId],
  )
}

async function fetchProofs(client: Client, bookingRequestId: string): Promise<Array<Record<string, unknown>>> {
  return queryRows(
    client,
    `
      SELECT
        id,
        "blobPathname",
        sha256,
        "reportedReference",
        "normalizedReference",
        "duplicateStatus"
      FROM "payment_proofs"
      WHERE "bookingRequestId" = $1
        AND "isActive" = true
      ORDER BY "uploadedAt" ASC, id ASC
    `,
    [bookingRequestId],
  )
}

async function fetchAuditCount(client: Client, bookingRequestId: string): Promise<number> {
  const rows = await queryRows<{ count: string }>(
    client,
    `
      SELECT COUNT(*)::text AS count
      FROM "audit_log"
      WHERE "bookingRequestId" = $1
        AND action = $2
    `,
    [bookingRequestId, 'custom_bundle_payment_reported'],
  )
  return Number(rows[0]?.count ?? 0)
}

async function cleanupFixtures(client: Client): Promise<void> {
  await client.query(`DELETE FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DELETE FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg08c_%' OR id LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DELETE FROM "booking_request_items" WHERE "bookingRequestId" LIKE 'bkg08c_%' OR id LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DELETE FROM "booking_requests" WHERE id LIKE 'bkg08c_%' OR "publicCode" LIKE 'TUR-0808-%'`).catch(() => {})
  await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg08c_%'`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08c_fail_payment_audit_trigger ON "audit_log"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08c_fail_payment_audit()`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08c_fail_payment_update_trigger ON "booking_requests"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08c_fail_payment_update()`).catch(() => {})
}

function assertNoForbiddenSource(source: string, label: string): void {
  for (const [pattern, patternLabel] of [
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db'],
    [/from\s+['"]pg['"]/, 'pg'],
    [/process\.env/, 'process.env'],
    [/@vercel\/blob/, 'Blob'],
    [/payment-proof-upload/, 'payment-proof-upload'],
    [/['"]use server['"]/, 'use server'],
  ] as const) {
    assert.equal(pattern.test(source), false, `${label}: ${patternLabel}`)
  }
}

function assertResultStage(
  result: CustomBundlePaymentProofFlowResult,
  expected: 'reported' | 'replayed',
  label: string,
): void {
  assert.equal(result.ok, true, `${label}: ${JSON.stringify(result)}`)
  assert.equal(result.stage, expected, `${label}: ${JSON.stringify(result)}`)
}

async function runFlow(
  client: Client,
  store: ProofStoreControls,
  input: ReturnType<typeof makeBookingInput>,
  tracingOptions: Parameters<typeof createTracingSession>[1] = {},
): Promise<{
  result: CustomBundlePaymentProofFlowResult
  trace: TracingSession['calls']
}> {
  const session = createTracingSession(client, tracingOptions)
  try {
    const result = await runCustomBundlePaymentProofFlow(
      {
        store,
        session,
        clock: input.clock,
      },
      {
        submission: input.submission,
        paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
        paymentProofFile: input.paymentProofFile,
      },
    )
    return { result, trace: session.calls }
  } finally {
    await client.query('ROLLBACK').catch(() => {})
  }
}

function createPostgresError(
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

async function main(): Promise<void> {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const boundarySource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-proof-boundary.ts'),
    'utf8',
  )
  const flowSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-proof-flow.ts'),
    'utf8',
  )
  assertNoForbiddenSource(boundarySource, 'Boundary module')
  assertNoForbiddenSource(flowSource, 'Flow module')

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
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

  const client = new Client({ connectionString })
  try {
    await client.connect()

    const identity = await client.query<{ current_database: string; current_user: string }>(
      `SELECT current_database(), current_user`,
    )
    assert.equal(identity.rows[0].current_database, EXPECTED_DATABASE)
    assert.equal(identity.rows[0].current_user, EXPECTED_USER)

    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query(baselineSql)
    await client.query(bkg04Sql)
    await client.query(bkg07Sql)
    await client.query(bkg08Sql)

    const catalog = await seedCatalog(client)

    // Case 1: pago movil with trusted proof.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_pm',
      publicCode: 'TUR-0808-201',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const proofFile = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('png'),
    })
    const sharedStore = createProofStore()
    const paymentMovil = await runFlow(
      client,
      sharedStore,
      makeBookingInput({
        publicCode: 'TUR-0808-201',
        paymentMethod: 'pago_movil',
        paymentReference: ' PM-201 ',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_201',
        paymentProofFile: proofFile,
        now: [new Date('2026-06-23T14:30:00.000Z'), new Date('2026-06-23T14:30:01.000Z')],
      }),
    )
    assertResultStage(paymentMovil.result, 'reported', 'pago movil flow')
    if (paymentMovil.result.ok) {
      assert.equal(paymentMovil.result.createdByThisCall, true)
      assert.equal(paymentMovil.result.cleanupPerformed, false)
      assert.equal(paymentMovil.result.proofMetadata?.blobPathname.startsWith('payment-proofs/TUR-0808-201/'), true)
    }
    assert.equal(sharedStore.calls.put.length, 1)
    assert.equal(sharedStore.calls.delete.length, 0)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_pm')).length, 1)
    assert.equal(await fetchAuditCount(client, 'bkg08c_booking_pm'), 1)

    // Case 2: transferencia.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_transfer',
      publicCode: 'TUR-0808-202',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const transfer = await runFlow(
      client,
      createProofStore(),
      makeBookingInput({
        publicCode: 'TUR-0808-202',
        paymentMethod: 'transferencia',
        paymentReference: 'transfer-202',
        paymentReportIdempotencyKey: 'PAYMENT_0808_TRANSFER_202',
        paymentProofFile: makeFileLike({
          name: 'transfer.webp',
          type: 'image/webp',
          bytes: makeBytes('webp'),
        }),
      }),
    )
    assertResultStage(transfer.result, 'reported', 'transferencia flow')

    // Case 3: binance.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_binance',
      publicCode: 'TUR-0808-203',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const binance = await runFlow(
      client,
      createProofStore(),
      makeBookingInput({
        publicCode: 'TUR-0808-203',
        paymentMethod: 'binance',
        paymentReference: 'binance-203',
        paymentReportIdempotencyKey: 'PAYMENT_0808_BINANCE_203',
        paymentProofFile: makeFileLike({
          name: 'binance.avif',
          type: 'image/avif',
          bytes: makeBytes('avif'),
        }),
      }),
    )
    assertResultStage(binance.result, 'reported', 'binance flow')

    // Case 4: efectivo without proof.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_cash',
      publicCode: 'TUR-0808-204',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const cashStore = createProofStore()
    const cash = await runFlow(
      client,
      cashStore,
      makeBookingInput({
        publicCode: 'TUR-0808-204',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-204',
        paymentReportIdempotencyKey: 'PAYMENT_0808_CASH_204',
      }),
    )
    assertResultStage(cash.result, 'reported', 'cash without proof')
    assert.equal(cashStore.calls.head.length, 0)
    assert.equal(cashStore.calls.put.length, 0)
    assert.equal(cashStore.calls.delete.length, 0)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_cash')).length, 0)

    // Case 5: efectivo with optional proof.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_cash_proof',
      publicCode: 'TUR-0808-205',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const cashProofStore = createProofStore()
    const cashProof = await runFlow(
      client,
      cashProofStore,
      makeBookingInput({
        publicCode: 'TUR-0808-205',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-205',
        paymentReportIdempotencyKey: 'PAYMENT_0808_CASH_205',
        paymentProofFile: makeFileLike({
          name: 'cash.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assertResultStage(cashProof.result, 'reported', 'cash with proof')
    assert.equal(cashProofStore.calls.put.length, 1)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_cash_proof')).length, 1)

    // Case 6: exact replay without reupload.
    const replay = await runFlow(
      client,
      sharedStore,
      makeBookingInput({
        publicCode: 'TUR-0808-201',
        paymentMethod: 'pago_movil',
        paymentReference: ' PM-201 ',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_201',
        paymentProofFile: proofFile,
        now: [new Date('2026-06-23T14:35:00.000Z'), new Date('2026-06-23T14:35:01.000Z')],
      }),
    )
    assertResultStage(replay.result, 'replayed', 'exact replay')
    if (replay.result.ok) {
      assert.equal(replay.result.createdByThisCall, false)
      assert.equal(replay.result.cleanupPerformed, false)
      assert.equal(replay.result.reportingResult.replayed, true)
    }
    assert.equal(sharedStore.calls.put.length, 1)
    assert.equal(sharedStore.calls.delete.length, 0)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_pm')).length, 1)
    assert.equal(await fetchAuditCount(client, 'bkg08c_booking_pm'), 1)

    // Case 7: same key, different file -> conflict and cleanup.
    const conflictStore = sharedStore
    const conflictPathBefore = sharedStore.readObject(
      (paymentMovil.result.ok && paymentMovil.result.proofMetadata ? paymentMovil.result.proofMetadata.blobPathname : ''),
    )
    const conflict = await runFlow(
      client,
      conflictStore,
      makeBookingInput({
        publicCode: 'TUR-0808-201',
        paymentMethod: 'pago_movil',
        paymentReference: ' PM-201 ',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_201',
        paymentProofFile: makeFileLike({
          name: 'proof-alt.png',
          type: 'image/png',
          bytes: new Uint8Array([...makeBytes('png'), 0x01, 0x02, 0x03, 0x04]),
        }),
        now: [new Date('2026-06-23T14:36:00.000Z'), new Date('2026-06-23T14:36:01.000Z')],
      }),
    )
    assert.equal(conflict.result.ok, false)
    if (!conflict.result.ok) {
      assert.equal(conflict.result.stage === 'reporting' || conflict.result.stage === 'cleanup', true)
    }
    assert.equal(conflictStore.calls.delete.length >= 1, true)
    assert.equal(conflictStore.readObject(conflictStore.calls.put[1]?.pathname ?? ''), null)
    assert.ok(conflictPathBefore)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_pm')).length, 1)

    // Case 8: different key on already reported booking -> cleanup new object, original preserved.
    const alreadyReported = await runFlow(
      client,
      conflictStore,
      makeBookingInput({
        publicCode: 'TUR-0808-201',
        paymentMethod: 'pago_movil',
        paymentReference: ' PM-201 ',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_201_ALT',
        paymentProofFile: makeFileLike({
          name: 'proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
        now: [new Date('2026-06-23T14:37:00.000Z'), new Date('2026-06-23T14:37:01.000Z')],
      }),
    )
    assert.equal(alreadyReported.result.ok, false)
    assert.equal(conflictStore.calls.delete.length >= 2, true)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_pm')).length, 1)

    // Case 9: expired hold -> object created then removed, no payment rows.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_expired',
      publicCode: 'TUR-0808-206',
      holdExpiresAt: new Date('2026-06-23T14:00:00.000Z'),
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const expiredStore = createProofStore()
    const expired = await runFlow(
      client,
      expiredStore,
      makeBookingInput({
        publicCode: 'TUR-0808-206',
        paymentMethod: 'pago_movil',
        paymentReference: 'expired-206',
        paymentReportIdempotencyKey: 'PAYMENT_0808_EXPIRED_206',
        paymentProofFile: makeFileLike({
          name: 'expired.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
        now: [new Date('2026-06-23T14:30:00.000Z'), new Date('2026-06-23T14:30:01.000Z')],
      }),
    )
    assert.equal(expired.result.ok, false)
    assert.equal(expiredStore.calls.delete.length, 1)
    assert.equal((await fetchProofs(client, 'bkg08c_booking_expired')).length, 0)
    assert.equal(await fetchAuditCount(client, 'bkg08c_booking_expired'), 0)

    // Case 10: boundary exact, still expired.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_boundary',
      publicCode: 'TUR-0808-207',
      holdExpiresAt: new Date('2026-06-23T14:30:00.000Z'),
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const boundaryStore = createProofStore()
    const boundary = await runFlow(
      client,
      boundaryStore,
      makeBookingInput({
        publicCode: 'TUR-0808-207',
        paymentMethod: 'pago_movil',
        paymentReference: 'boundary-207',
        paymentReportIdempotencyKey: 'PAYMENT_0808_BOUNDARY_207',
        paymentProofFile: makeFileLike({
          name: 'boundary.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
        now: [new Date('2026-06-23T14:30:00.000Z'), new Date('2026-06-23T14:30:00.000Z')],
      }),
    )
    assert.equal(boundary.result.ok, false)
    assert.equal(boundaryStore.calls.delete.length, 1)

    // Case 11: update conflict.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_update_conflict',
      publicCode: 'TUR-0808-208',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08c_fail_payment_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW."publicCode" = 'TUR-0808-208' THEN
          RAISE EXCEPTION 'bkg08c payment update conflict';
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      CREATE TRIGGER bkg08c_fail_payment_update_trigger
      BEFORE UPDATE ON "booking_requests"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08c_fail_payment_update();
    `)
    const updateConflictStore = createProofStore()
    const updateConflict = await runFlow(
      client,
      updateConflictStore,
      makeBookingInput({
        publicCode: 'TUR-0808-208',
        paymentMethod: 'pago_movil',
        paymentReference: 'update-208',
        paymentReportIdempotencyKey: 'PAYMENT_0808_UPDATE_208',
        paymentProofFile: makeFileLike({
          name: 'update.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assert.equal(updateConflict.result.ok, false)
    assert.equal(updateConflictStore.calls.delete.length, 1)

    // Case 12: audit failure.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_audit_fail',
      publicCode: 'TUR-0808-209',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08c_fail_payment_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.action = 'custom_bundle_payment_reported' THEN
          RAISE EXCEPTION 'bkg08c audit failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      CREATE TRIGGER bkg08c_fail_payment_audit_trigger
      BEFORE INSERT ON "audit_log"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08c_fail_payment_audit();
    `)
    const auditStore = createProofStore()
    const auditFailure = await runFlow(
      client,
      auditStore,
      makeBookingInput({
        publicCode: 'TUR-0808-209',
        paymentMethod: 'pago_movil',
        paymentReference: 'audit-209',
        paymentReportIdempotencyKey: 'PAYMENT_0808_AUDIT_209',
        paymentProofFile: makeFileLike({
          name: 'audit.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assert.equal(auditFailure.result.ok, false)
    assert.equal(auditStore.calls.delete.length, 1)
    await client.query(`DROP TRIGGER IF EXISTS bkg08c_fail_payment_audit_trigger ON "audit_log"`)
    await client.query(`DROP FUNCTION IF EXISTS bkg08c_fail_payment_audit()`)

    // Case 13: put failure, no reporting transaction.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_put_fail',
      publicCode: 'TUR-0808-210',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const putFailureStore = createProofStore()
    putFailureStore.queuePutError(createPostgresError('500', 'put failure'))
    const putFailure = await runFlow(
      client,
      putFailureStore,
      makeBookingInput({
        publicCode: 'TUR-0808-210',
        paymentMethod: 'pago_movil',
        paymentReference: 'put-210',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PUT_210',
        paymentProofFile: makeFileLike({
          name: 'put.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assert.equal(putFailure.result.ok, false)
    assert.equal(putFailureStore.calls.head.length, 1)
    assert.equal(putFailureStore.calls.put.length, 1)
    assert.equal((await fetchAuditCount(client, 'bkg08c_booking_put_fail')), 0)

    // Case 14: head failure, no reporting.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_head_fail',
      publicCode: 'TUR-0808-211',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const headFailureStore = createProofStore()
    headFailureStore.queueHeadError(createPostgresError('head failure', 'head failure'))
    const headFailure = await runFlow(
      client,
      headFailureStore,
      makeBookingInput({
        publicCode: 'TUR-0808-211',
        paymentMethod: 'pago_movil',
        paymentReference: 'head-211',
        paymentReportIdempotencyKey: 'PAYMENT_0808_HEAD_211',
        paymentProofFile: makeFileLike({
          name: 'head.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assert.equal(headFailure.result.ok, false)
    assert.equal(headFailureStore.calls.put.length, 0)
    assert.equal((await fetchAuditCount(client, 'bkg08c_booking_head_fail')), 0)

    // Case 15: cleanup failure preserves reporting cause.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_cleanup_fail',
      publicCode: 'TUR-0808-212',
      holdExpiresAt: new Date('2026-06-23T14:00:00.000Z'),
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const cleanupFailureStore = createProofStore()
    cleanupFailureStore.queueDeleteError(createPostgresError('cleanup-failure', 'cleanup failure'))
    const cleanupFailure = await runFlow(
      client,
      cleanupFailureStore,
      makeBookingInput({
        publicCode: 'TUR-0808-212',
        paymentMethod: 'pago_movil',
        paymentReference: 'cleanup-212',
        paymentReportIdempotencyKey: 'PAYMENT_0808_CLEANUP_212',
        paymentProofFile: makeFileLike({
          name: 'cleanup.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        }),
      }),
    )
    assert.equal(cleanupFailure.result.ok, false)
    assert.equal(cleanupFailure.result.stage, 'cleanup')

    // Case 16: reused object + reporting failure must not delete.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_reused_hold_expired',
      publicCode: 'TUR-0808-213',
      holdExpiresAt: new Date('2026-06-23T14:00:00.000Z'),
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const reusedFailureStore = createProofStore()
    const reusedFailureBytes = new Uint8Array([...makeBytes('png'), 0x21])
    const reusedFailurePath = buildCustomBundlePaymentProofPrivatePathname({
      publicCode: 'TUR-0808-213',
      paymentReportIdempotencyKey: 'PAYMENT_0808_REUSED_213',
      sha256: createHash('sha256').update(reusedFailureBytes).digest('hex'),
      mimeType: 'image/png',
    })
    reusedFailureStore.seedObject({
      pathname: reusedFailurePath,
      contentType: 'image/png',
      sizeBytes: reusedFailureBytes.byteLength,
      uploadedAt: new Date('2026-06-23T13:59:00.000Z'),
      access: 'private',
    })
    const reusedFailure = await runFlow(
      client,
      reusedFailureStore,
      makeBookingInput({
        publicCode: 'TUR-0808-213',
        paymentMethod: 'pago_movil',
        paymentReference: 'reused-213',
        paymentReportIdempotencyKey: 'PAYMENT_0808_REUSED_213',
        paymentProofFile: makeFileLike({
          name: 'seed.png',
          type: 'image/png',
          bytes: reusedFailureBytes,
        }),
      }),
    )
    assert.equal(reusedFailure.result.ok, false)
    assert.equal(reusedFailureStore.calls.delete.length, 0)

    // Case 17: race recovery via object-already-exists.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_race',
      publicCode: 'TUR-0808-214',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const raceStore = createProofStore()
    const raceBytes = new Uint8Array([...makeBytes('png'), 0x22])
    const racePath = buildCustomBundlePaymentProofPrivatePathname({
      publicCode: 'TUR-0808-214',
      paymentReportIdempotencyKey: 'PAYMENT_0808_RACE_214',
      sha256: createHash('sha256').update(raceBytes).digest('hex'),
      mimeType: 'image/png',
    })
    raceStore.queueHeadResponse(null)
    raceStore.queueHeadResponse({
      pathname: racePath,
      contentType: 'image/png',
      sizeBytes: raceBytes.byteLength,
      uploadedAt: new Date('2026-06-23T14:29:30.000Z'),
      access: 'private',
    })
    raceStore.queuePutError(createPostgresError('OBJECT_ALREADY_EXISTS', 'object already exists'))
    const raceResult = await runFlow(
      client,
      raceStore,
      makeBookingInput({
        publicCode: 'TUR-0808-214',
        paymentMethod: 'pago_movil',
        paymentReference: 'race-214',
        paymentReportIdempotencyKey: 'PAYMENT_0808_RACE_214',
        paymentProofFile: makeFileLike({
          name: 'race.png',
          type: 'image/png',
          bytes: raceBytes,
        }),
      }),
    )
    if (!raceResult.result.ok) {
      console.error('race recovery trace', JSON.stringify(raceResult.trace, null, 2))
    }
    assertResultStage(raceResult.result, 'reported', 'race recovery')
    assert.equal(raceStore.calls.head.length >= 2, true)
    assert.equal(raceStore.calls.put.length, 1)

    // Case 18: content spoofing rejected before storage.
    await insertFixtureBooking(client, {
      id: 'bkg08c_booking_spoof',
      publicCode: 'TUR-0808-215',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const spoofStore = createProofStore()
    const spoof = await runFlow(
      client,
      spoofStore,
      makeBookingInput({
        publicCode: 'TUR-0808-215',
        paymentMethod: 'pago_movil',
        paymentReference: 'spoof-215',
        paymentReportIdempotencyKey: 'PAYMENT_0808_SPOOF_215',
        paymentProofFile: makeFileLike({
          name: 'spoof.png',
          type: 'image/png',
          bytes: makeBytes('plain'),
        }),
      }),
    )
    assert.equal(spoof.result.ok, false)
    assert.equal(spoofStore.calls.put.length, 0)
    assert.equal(spoofStore.calls.head.length, 0)

    // Case 19: traversal cleanup is rejected.
    const traversalCleanup = await deleteCustomBundlePaymentProofFromPrivateStore({
      store: spoofStore,
      pathname: '../escape',
    })
    assert.equal(traversalCleanup.ok, false)

    // Case 20: cleanup final state.
    await cleanupFixtures(client)
    const remainingBookings = await queryRows<{ count: string }>(
      client,
      `
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE id LIKE 'bkg08c_%'
           OR "publicCode" LIKE 'TUR-0808-%'
      `,
    )
    assert.equal(Number(remainingBookings[0]?.count ?? 0), 0)
    assert.equal((await queryRows(client, `SELECT COUNT(*)::text AS count FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg08c_%'`))[0]?.count ?? '0', '0')

    console.log('booking_isolated_custom_bundle_payment_proof_flow OK')
    console.log('private upload: verified')
    console.log('trusted metadata: verified')
    console.log('transactional reporting integration: verified')
    console.log('exact replay without reupload: verified')
    console.log('idempotency conflict cleanup: verified')
    console.log('expired hold cleanup: verified')
    console.log('rollback cleanup: verified')
    console.log('reused object preserved: verified')
    console.log('upload race: verified')
    console.log('database cleanup: verified')
    console.log('storage cleanup: verified')
  } catch (error) {
    await cleanupFixtures(client).catch(() => {})
    throw error
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((error) => fail('Unexpected failure while validating payment proof flow.', error))
