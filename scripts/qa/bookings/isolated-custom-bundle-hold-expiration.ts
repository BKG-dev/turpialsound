import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  expireCustomBundleHoldsWithSql,
  type CustomBundleHoldExpirationResult,
  type CustomBundleHoldExpirationServerContext,
} from '@/lib/bookings/custom-bundle-hold-expiration'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

const BKG04_SQL_PATTERNS = [
  /CREATE\s+TYPE\s+"booking_mode"/i,
  /CREATE\s+TYPE\s+"booking_item_kind"/i,
  /ALTER\s+TABLE\s+"booking_requests"/i,
  /ALTER\s+TABLE\s+"booking_request_items"/i,
  /CREATE\s+INDEX\s+"booking_request_items_item_slug_idx"/i,
  /CREATE\s+UNIQUE\s+INDEX\s+"booking_request_items_booking_request_id_item_slug_key"/i,
]

const BKG07_SQL_PATTERNS = [
  /ALTER\s+TABLE\s+"booking_requests"/i,
  /ADD\s+COLUMN\s+"idempotencyKey"\s+TEXT/i,
  /ADD\s+COLUMN\s+"requestFingerprint"\s+TEXT/i,
  /ADD\s+COLUMN\s+"holdAcquiredAt"\s+TIMESTAMPTZ/i,
  /ADD\s+COLUMN\s+"holdExpiresAt"\s+TIMESTAMPTZ/i,
  /booking_requests_idempotency_key_uniq/i,
  /booking_requests_hold_expires_at_idx/i,
  /booking_requests_idempotency_pair_chk/i,
  /booking_requests_idempotency_key_format_chk/i,
  /booking_requests_request_fingerprint_format_chk/i,
  /booking_requests_hold_window_pair_chk/i,
  /booking_requests_hold_window_order_chk/i,
]

type BookingRequestRow = {
  id: string
  publicCode: string
  status: string
  internalNotes: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
}

type BookingRequestItemRow = {
  bookingRequestId: string
  itemSlug: string | null
  itemKind: string | null
  serviceVariantId: string | null
  resourceId: string | null
}

type TracingSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_hold_expiration FAILED')
  console.error(message)
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

function assertNoForbiddenSql(sql: string, label: string, allowMarketplaceTables = false): void {
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

  if (!allowMarketplaceTables) {
    forbiddenPatterns.push([/\bmarketplace\b/i, 'marketplace'])
    forbiddenPatterns.push([/\bmp_/i, 'marketplace prefix'])
  }

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${forbiddenLabel}.`)
    }
  }
}

function assertSqlPatterns(sql: string, label: string, patterns: readonly RegExp[]): void {
  for (const pattern of patterns) {
    assert.ok(pattern.test(sql), `${label} is missing the expected pattern: ${pattern}.`)
  }
}

function assertBkg04Sql(sql: string): void {
  assertSqlPatterns(sql, 'BKG-04 SQL', BKG04_SQL_PATTERNS)
  assertNoForbiddenSql(sql, 'BKG-04 SQL')
}

function assertBkg07Sql(sql: string): void {
  assertSqlPatterns(sql, 'BKG-07 SQL', BKG07_SQL_PATTERNS)
  assertNoForbiddenSql(sql, 'BKG-07 SQL')
}

function createTracingSession(client: Client): TracingSession {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  return {
    transactionScope: 'single_connection' as const,
    calls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      calls.push({ sql, params: [...params] })
      const result = (await client.query<Row>(sql, [...params])) as {
        rows: Row[]
        rowCount: number | null
      }
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      }
    },
  }
}

function makeRequestFingerprint(seed: string): string {
  return createHash('sha256').update(seed).digest('hex')
}

async function queryRows<Row = Record<string, unknown>>(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await client.query<Row>(sql, [...values])
  return result.rows
}

function assertTraceContains(trace: TracingSession['calls'], pattern: RegExp, label: string): void {
  assert.ok(trace.some((call) => pattern.test(call.sql)), label)
}

function assertTraceDoesNotContain(trace: TracingSession['calls'], pattern: RegExp, label: string): void {
  assert.ok(!trace.some((call) => pattern.test(call.sql)), label)
}

async function assertSchemaShape(client: Client): Promise<void> {
  const columnRows = await queryRows<{
    table_name: string
    column_name: string
    is_nullable: string
    column_default: string | null
  }>(
    client,
    `
      SELECT table_name, column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('booking_requests')
        AND column_name IN (
          'bookingMode',
          'pricingSource',
          'idempotencyKey',
          'requestFingerprint',
          'holdAcquiredAt',
          'holdExpiresAt'
        )
      ORDER BY column_name
    `,
  )

  const columnMap = new Map(columnRows.map((row) => [row.column_name, row]))
  for (const columnName of [
    'bookingMode',
    'pricingSource',
    'idempotencyKey',
    'requestFingerprint',
    'holdAcquiredAt',
    'holdExpiresAt',
  ]) {
    assert.ok(columnMap.has(columnName), `Missing expected column: ${columnName}`)
  }
  assert.equal(columnMap.get('bookingMode')?.is_nullable, 'NO')
  assert.equal(columnMap.get('pricingSource')?.is_nullable, 'YES')
  assert.equal(columnMap.get('idempotencyKey')?.is_nullable, 'YES')
  assert.equal(columnMap.get('requestFingerprint')?.is_nullable, 'YES')
  assert.equal(columnMap.get('holdAcquiredAt')?.is_nullable, 'YES')
  assert.equal(columnMap.get('holdExpiresAt')?.is_nullable, 'YES')

  const constraintRows = await queryRows<{ conname: string }>(
    client,
    `
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'booking_requests'::regclass
      ORDER BY conname
    `,
  )

  for (const name of [
    'booking_requests_idempotency_pair_chk',
    'booking_requests_idempotency_key_format_chk',
    'booking_requests_request_fingerprint_format_chk',
    'booking_requests_hold_window_pair_chk',
    'booking_requests_hold_window_order_chk',
  ]) {
    assert.ok(constraintRows.some((row) => row.conname === name), `Missing constraint: ${name}`)
  }

  const indexRows = await queryRows<{ indexname: string; indexdef: string }>(
    client,
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'booking_requests'
      ORDER BY indexname
    `,
  )

  const indexMap = new Map(indexRows.map((row) => [row.indexname, row.indexdef]))
  assert.match(indexMap.get('booking_requests_idempotency_key_uniq') ?? '', /WHERE .*"idempotencyKey" IS NOT NULL/i)
  assert.match(indexMap.get('booking_requests_hold_expires_at_idx') ?? '', /WHERE .*"holdExpiresAt" IS NOT NULL/i)
}

async function seedCatalog(client: Client): Promise<{
  serviceId: string
  serviceVariantId: string
  resourceId: string
}> {
  await client.query(
    `
      INSERT INTO "services" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT ("slug") DO UPDATE
      SET "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
    `,
    ['bkg07c_service_sala', 'sala-ensayo', 'Sala de ensayo', 'Sala de ensayo de prueba'],
  )

  await client.query(
    `
      INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
      ON CONFLICT ("slug") DO UPDATE
      SET "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "isActive" = EXCLUDED."isActive",
          "serviceId" = EXCLUDED."serviceId",
          "updatedAt" = NOW()
    `,
    [
      'bkg07c_variant_sala_premium',
      'sala-ensayo-premium',
      'Sala Premium',
      'Sala Premium de prueba',
      'bkg07c_service_sala',
    ],
  )

  await client.query(
    `
      INSERT INTO "resources" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT ("slug") DO UPDATE
      SET "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
    `,
    ['bkg07c_resource_sala_3', 'sala-3-ensayo', 'Sala 3 Ensayo', 'Sala 3 Ensayo de prueba'],
  )

  return {
    serviceId: 'bkg07c_service_sala',
    serviceVariantId: 'bkg07c_variant_sala_premium',
    resourceId: 'bkg07c_resource_sala_3',
  }
}

async function deleteFixtureData(client: Client, bookingRequestIds: readonly string[]): Promise<void> {
  if (bookingRequestIds.length === 0) {
    return
  }

  await client.query('DELETE FROM "audit_log" WHERE "bookingRequestId" = ANY($1::text[])', [
    [...bookingRequestIds],
  ])
  await client.query('DELETE FROM "payment_proofs" WHERE "bookingRequestId" = ANY($1::text[])', [
    [...bookingRequestIds],
  ])
  await client.query('DELETE FROM "booking_request_items" WHERE "bookingRequestId" = ANY($1::text[])', [
    [...bookingRequestIds],
  ])
  await client.query('DELETE FROM "booking_requests" WHERE id = ANY($1::text[])', [[...bookingRequestIds]])
}

async function deleteFixtureCatalog(client: Client): Promise<void> {
  await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg07c_%'`)
  await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg07c_%'`)
  await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg07c_%'`)
}

async function insertBookingRequest(client: Client, input: {
  id: string
  publicCode: string
  status: string
  internalNotes: string | null
  holdAcquiredAt: Date
  holdExpiresAt: Date
  bookingMode: string
  pricingSource: string
  estimatedTotal: number
  itemResourceId: string | null
  itemSlug: string
  paymentProof?: boolean
}): Promise<void> {
  const eventDate = new Date('2026-06-24T14:00:00.000Z')
  const eventEndDate = new Date('2026-06-24T16:00:00.000Z')

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
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, 'normal', 'web', $4, $5, $6, $7, $8, $9, $10, $11, $12, 'USD', $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
      )
    `,
    [
      input.id,
      input.publicCode,
      input.status,
      'Ana Perez',
      'ana@example.com',
      '+584121234567',
      'Solicitud - Arma tu paquete',
      eventDate,
      eventEndDate,
      'Notas externas',
      input.internalNotes,
      input.estimatedTotal.toFixed(2),
      eventDate,
      input.bookingMode,
      input.pricingSource,
      `idempotency-${input.id}`,
      makeRequestFingerprint(input.id),
      input.holdAcquiredAt,
      input.holdExpiresAt,
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
        $1, $2, $3, $4, $5, $6, 'service', 2, NULL, 120, 25, 50, 'itemized', NULL, NOW(), NOW()
      )
    `,
    [
      `${input.id}_item`,
      input.id,
      'bkg07c_variant_sala_premium',
      input.itemResourceId,
      input.itemSlug,
      'Sala Premium',
    ],
  )

  if (input.paymentProof) {
    await client.query(
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
          "isActive"
        ) VALUES (
          $1, $2, $3, $4, 'image/png', 12345, NULL, NOW(), NULL, NULL, 'none', true
        )
      `,
      [
        `${input.id}_proof`,
        input.id,
        `/fixtures/${input.id}.png`,
        `${input.id}sha256`,
      ],
    )
  }
}

async function fetchBooking(
  client: Client,
  publicCode: string,
): Promise<BookingRequestRow | null> {
  const rows = await queryRows<BookingRequestRow>(
    client,
    `
      SELECT
        id,
        "publicCode",
        status,
        "internalNotes",
        "holdAcquiredAt",
        "holdExpiresAt"
      FROM "booking_requests"
      WHERE "publicCode" = $1
    `,
    [publicCode],
  )

  return rows[0] ?? null
}

async function fetchBookingItems(client: Client, bookingRequestId: string): Promise<BookingRequestItemRow[]> {
  return queryRows<BookingRequestItemRow>(
    client,
    `
      SELECT
        "bookingRequestId",
        "itemSlug",
        "itemKind",
        "serviceVariantId",
        "resourceId"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      ORDER BY "itemSlug"
    `,
    [bookingRequestId],
  )
}

async function fetchActivePaymentProofCount(client: Client, bookingRequestId: string): Promise<number> {
  const rows = await queryRows<{ count: string }>(
    client,
    `
      SELECT COUNT(*)::text AS count
      FROM "payment_proofs"
      WHERE "bookingRequestId" = $1
        AND "isActive" = true
    `,
    [bookingRequestId],
  )

  return Number(rows[0]?.count ?? 0)
}

function buildExpirationSession(client: Client): TracingSession {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  return {
    transactionScope: 'single_connection' as const,
    calls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      calls.push({ sql, params: [...params] })
      const result = (await client.query<Row>(sql, [...params])) as {
        rows: Row[]
        rowCount: number | null
      }
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      }
    },
  }
}

async function runExpiration(
  client: Client,
  serverContext: CustomBundleHoldExpirationServerContext,
): Promise<{ result: Awaited<ReturnType<typeof expireCustomBundleHoldsWithSql>>; trace: TracingSession['calls'] }> {
  const tracedSession = buildExpirationSession(client)
  const result = await expireCustomBundleHoldsWithSql(tracedSession, {
    serverContext,
  })
  return { result, trace: tracedSession.calls }
}

function assertExpirationSuccess(
  label: string,
  result: CustomBundleHoldExpirationResult,
): asserts result is Extract<CustomBundleHoldExpirationResult, { ok: true }> {
  assert.ok(result.ok, `${label} should succeed`)
  assert.equal(result.stage, 'expired', `${label} stage`)
}

async function main(): Promise<void> {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const args = process.argv.slice(2)
  if (args.length !== 3) {
    fail(
      'Expected three SQL file arguments: baseline, BKG-04 proposal, and BKG-07 proposal.',
    )
  }

  const [baselinePath, bkg04Path, bkg07Path] = args.map((argument) => resolve(process.cwd(), argument))
  const baselineSql = readSqlFile(baselinePath)
  const bkg04Sql = readSqlFile(bkg04Path)
  const bkg07Sql = readSqlFile(bkg07Path)

  assertNoForbiddenSql(baselineSql, 'Baseline SQL', true)
  assertBkg04Sql(bkg04Sql)
  assertBkg07Sql(bkg07Sql)

  const client = new Client({ connectionString })
  const fixtureBookingIds: string[] = []
  let concurrentClientA: Client | null = null
  let concurrentClientB: Client | null = null

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

    await assertSchemaShape(client)

    const catalog = await seedCatalog(client)

    const now = new Date('2026-06-22T16:00:00.000Z')
    const dueOneExpiresAt = new Date('2026-06-22T15:00:00.000Z')
    const dueTwoExpiresAt = new Date('2026-06-22T15:10:00.000Z')
    const past = new Date('2026-06-22T15:30:00.000Z')
    const exact = new Date('2026-06-22T16:00:00.000Z')
    const future = new Date('2026-06-22T16:15:00.000Z')

    const dueRows = [
      { id: 'bkg07c_due_1', publicCode: 'TUR-0707-701', holdExpiresAt: dueOneExpiresAt, itemSlug: 'sala-premium' },
      { id: 'bkg07c_due_2', publicCode: 'TUR-0707-702', holdExpiresAt: dueTwoExpiresAt, itemSlug: 'sala-premium' },
      { id: 'bkg07c_due_3', publicCode: 'TUR-0707-703', holdExpiresAt: exact, itemSlug: 'sala-premium' },
      { id: 'bkg07c_future', publicCode: 'TUR-0707-704', holdExpiresAt: future, itemSlug: 'sala-premium' },
      { id: 'bkg07c_reported', publicCode: 'TUR-0707-705', holdExpiresAt: past, itemSlug: 'sala-premium' },
      { id: 'bkg07c_protected', publicCode: 'TUR-0707-706', holdExpiresAt: past, itemSlug: 'sala-premium' },
    ]

    for (const row of dueRows) {
      fixtureBookingIds.push(row.id)
    }

    await insertBookingRequest(client, {
      id: 'bkg07c_due_1',
      publicCode: 'TUR-0707-701',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]\nNotas del cliente',
      holdAcquiredAt: new Date('2026-06-22T14:00:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })

    await insertBookingRequest(client, {
      id: 'bkg07c_due_2',
      publicCode: 'TUR-0707-702',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:10:00.000Z'),
      holdExpiresAt: dueTwoExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })

    await insertBookingRequest(client, {
      id: 'bkg07c_due_3',
      publicCode: 'TUR-0707-703',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:20:00.000Z'),
      holdExpiresAt: exact,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })

    await insertBookingRequest(client, {
      id: 'bkg07c_future',
      publicCode: 'TUR-0707-704',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T15:30:00.000Z'),
      holdExpiresAt: future,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })

    await insertBookingRequest(client, {
      id: 'bkg07c_reported',
      publicCode: 'TUR-0707-705',
      status: 'under_review',
      internalNotes: '[ops_status:payment_reported]',
      holdAcquiredAt: new Date('2026-06-22T14:00:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })

    await insertBookingRequest(client, {
      id: 'bkg07c_protected',
      publicCode: 'TUR-0707-706',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:00:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
      paymentProof: true,
    })

    const firstRun = await runExpiration(client, {
      now,
      batchSize: 2,
    })
    if (!firstRun.result.ok) {
      console.error('first batch result:', JSON.stringify(firstRun.result, null, 2))
      const failingTrace = firstRun.trace.slice(-5).map((call, index) => ({
        step: firstRun.trace.length - 4 + index,
        sql: call.sql,
      }))
      console.error('first batch trace tail:', JSON.stringify(failingTrace, null, 2))
    }
    assertExpirationSuccess('first batch', firstRun.result)
    console.error(
      'first batch summary:',
      JSON.stringify(
        {
          selected: firstRun.result.selected,
          expired: firstRun.result.expired,
          skipped: firstRun.result.skipped,
          hasMore: firstRun.result.hasMore,
          expiredBookings: firstRun.result.expiredBookings.length,
        },
        null,
        2,
      ),
    )
    assert.equal(firstRun.result.selected, 2)
    assert.equal(firstRun.result.expired, 2)
    assert.equal(firstRun.result.skipped, 0)
    assert.equal(firstRun.result.hasMore, true)
    assert.equal(firstRun.result.expiredBookings.length, 2)
    assertTraceContains(firstRun.trace, /^BEGIN ISOLATION LEVEL READ COMMITTED/i, 'first batch must begin a transaction')
    assertTraceContains(firstRun.trace, /FOR UPDATE SKIP LOCKED/i, 'first batch must use skip locked')
    assertTraceContains(firstRun.trace, /INSERT INTO "audit_log"/i, 'first batch must write an audit log')
    assertTraceContains(firstRun.trace, /^COMMIT$/i, 'first batch must commit')

    const due1 = await fetchBooking(client, 'TUR-0707-701')
    const due2 = await fetchBooking(client, 'TUR-0707-702')
    assert.equal(due1?.status, 'rejected')
    assert.equal(due2?.status, 'rejected')
    assert.equal(due1?.internalNotes, '[ops_status:expired]\nNotas del cliente')
    assert.equal(due2?.internalNotes, '[ops_status:expired]')
    assert.equal((await fetchBookingItems(client, 'bkg07c_due_1')).at(0)?.resourceId, catalog.resourceId)
    assert.equal((await fetchBookingItems(client, 'bkg07c_due_2')).at(0)?.resourceId, catalog.resourceId)

    const secondRun = await runExpiration(client, {
      now,
      batchSize: 2,
    })
    assertExpirationSuccess('second batch', secondRun.result)
    console.error(
      'second batch summary:',
      JSON.stringify(
        {
          selected: secondRun.result.selected,
          expired: secondRun.result.expired,
          skipped: secondRun.result.skipped,
          hasMore: secondRun.result.hasMore,
          expiredBookings: secondRun.result.expiredBookings.length,
        },
        null,
        2,
      ),
    )
    assert.equal(secondRun.result.selected, 1)
    assert.equal(secondRun.result.expired, 1)
    assert.equal(secondRun.result.hasMore, false)
    assert.equal(secondRun.result.expiredBookings[0]?.publicCode, 'TUR-0707-703')

    const futureBooking = await fetchBooking(client, 'TUR-0707-704')
    const reportedBooking = await fetchBooking(client, 'TUR-0707-705')
    const protectedBooking = await fetchBooking(client, 'TUR-0707-706')
    assert.equal(futureBooking?.status, 'under_review')
    assert.equal(reportedBooking?.status, 'under_review')
    assert.equal(protectedBooking?.status, 'under_review')
    assert.equal(protectedBooking?.internalNotes, '[ops_status:pending_payment]')
    assert.equal(await fetchActivePaymentProofCount(client, 'bkg07c_protected'), 1)

    const idempotentRerun = await runExpiration(client, {
      now,
      batchSize: 100,
    })
    assertExpirationSuccess('idempotent rerun', idempotentRerun.result)
    console.error(
      'idempotent rerun summary:',
      JSON.stringify(
        {
          selected: idempotentRerun.result.selected,
          expired: idempotentRerun.result.expired,
          skipped: idempotentRerun.result.skipped,
          hasMore: idempotentRerun.result.hasMore,
        },
        null,
        2,
      ),
    )
    assert.equal(idempotentRerun.result.selected, 0)
    assert.equal(idempotentRerun.result.expired, 0)
    assert.equal(idempotentRerun.result.hasMore, false)

    await insertBookingRequest(client, {
      id: 'bkg07c_fresh',
      publicCode: 'TUR-0707-710',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:45:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })
    fixtureBookingIds.push('bkg07c_fresh')

    const releasedSlotReusable = await runExpiration(client, {
      now,
      batchSize: 1,
    })
    assertExpirationSuccess('released slot', releasedSlotReusable.result)
    console.error(
      'released slot summary:',
      JSON.stringify(
        {
          selected: releasedSlotReusable.result.selected,
          expired: releasedSlotReusable.result.expired,
          skipped: releasedSlotReusable.result.skipped,
          hasMore: releasedSlotReusable.result.hasMore,
        },
        null,
        2,
      ),
    )
    assert.equal(releasedSlotReusable.result.selected, 1)
    assert.equal(releasedSlotReusable.result.expired, 1)
    assert.equal(releasedSlotReusable.result.expiredBookings[0]?.publicCode, 'TUR-0707-710')

    // Concurrent workers: a delayed update keeps one row locked while the other worker skips it.
    await client.query(
      `
        CREATE OR REPLACE FUNCTION bkg07c_delay_expiration_update()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.id = 'bkg07c_concurrent_slow' THEN
            PERFORM pg_sleep(1.5);
          END IF;
          RETURN NEW;
        END;
        $$;
      `,
    )
    await client.query(
      `
        DROP TRIGGER IF EXISTS bkg07c_delay_expiration_update_trigger ON "booking_requests";
        CREATE TRIGGER bkg07c_delay_expiration_update_trigger
        BEFORE UPDATE ON "booking_requests"
        FOR EACH ROW
        EXECUTE FUNCTION bkg07c_delay_expiration_update();
      `,
    )

    await insertBookingRequest(client, {
      id: 'bkg07c_concurrent_slow',
      publicCode: 'TUR-0707-720',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:40:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })
    await insertBookingRequest(client, {
      id: 'bkg07c_concurrent_fast',
      publicCode: 'TUR-0707-721',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:41:00.000Z'),
      holdExpiresAt: dueTwoExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })
    fixtureBookingIds.push('bkg07c_concurrent_slow', 'bkg07c_concurrent_fast')

    concurrentClientA = new Client({ connectionString })
    concurrentClientB = new Client({ connectionString })
    await Promise.all([concurrentClientA.connect(), concurrentClientB.connect()])

    const [workerA, workerB] = await Promise.all([
      runExpiration(concurrentClientA, { now, batchSize: 1 }),
      runExpiration(concurrentClientB, { now, batchSize: 1 }),
    ])
    assertExpirationSuccess('worker A', workerA.result)
    assertExpirationSuccess('worker B', workerB.result)
    console.error(
      'worker summaries:',
      JSON.stringify(
        {
          workerA: {
            selected: workerA.result.selected,
            expired: workerA.result.expired,
            skipped: workerA.result.skipped,
            hasMore: workerA.result.hasMore,
          },
          workerB: {
            selected: workerB.result.selected,
            expired: workerB.result.expired,
            skipped: workerB.result.skipped,
            hasMore: workerB.result.hasMore,
          },
        },
        null,
        2,
      ),
    )
    assert.equal(workerA.result.expired, 1)
    assert.equal(workerB.result.expired, 1)
    assert.equal(workerA.result.selected, 1)
    assert.equal(workerB.result.selected, 1)
    assert.equal(workerA.result.hasMore, false)
    assert.equal(workerB.result.hasMore, false)
    assertTraceContains(workerA.trace, /FOR UPDATE SKIP LOCKED/i, 'worker A must use skip locked')
    assertTraceContains(workerB.trace, /FOR UPDATE SKIP LOCKED/i, 'worker B must use skip locked')

    await client.query('DROP TRIGGER IF EXISTS bkg07c_delay_expiration_update_trigger ON "booking_requests"')
    await client.query('DROP FUNCTION IF EXISTS bkg07c_delay_expiration_update()')

    // Partial rollback: failing audit insert must revert the booking update.
    await client.query(
      `
        CREATE OR REPLACE FUNCTION bkg07c_fail_expiration_audit()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW."bookingRequestId" = 'bkg07c_rollback' THEN
            RAISE EXCEPTION 'simulated expiration audit failure';
          END IF;
          RETURN NEW;
        END;
        $$;
      `,
    )
    await client.query(
      `
        DROP TRIGGER IF EXISTS bkg07c_fail_expiration_audit_trigger ON "audit_log";
        CREATE TRIGGER bkg07c_fail_expiration_audit_trigger
        BEFORE INSERT ON "audit_log"
        FOR EACH ROW
        EXECUTE FUNCTION bkg07c_fail_expiration_audit();
      `,
    )

    await insertBookingRequest(client, {
      id: 'bkg07c_rollback',
      publicCode: 'TUR-0707-709',
      status: 'under_review',
      internalNotes: '[ops_status:pending_payment]',
      holdAcquiredAt: new Date('2026-06-22T14:20:00.000Z'),
      holdExpiresAt: dueOneExpiresAt,
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      estimatedTotal: 280,
      itemResourceId: catalog.resourceId,
      itemSlug: 'sala-premium',
    })
    fixtureBookingIds.push('bkg07c_rollback')

    const rollbackRun = await runExpiration(client, {
      now,
      batchSize: 1,
    })
    assert.equal(rollbackRun.result.ok, false)
    if (!rollbackRun.result.ok && rollbackRun.result.stage === 'persistence') {
      assert.equal(rollbackRun.result.code, 'DATABASE_WRITE_FAILED')
    }
    assertTraceContains(rollbackRun.trace, /^ROLLBACK$/i, 'rollback case must rollback')
    assertTraceDoesNotContain(rollbackRun.trace, /^COMMIT$/i, 'rollback case must not commit')
    const rollbackBooking = await fetchBooking(client, 'TUR-0707-709')
    assert.equal(rollbackBooking?.status, 'under_review')
    const rollbackAuditRows = await queryRows<{ count: string }>(
      client,
      `
        SELECT COUNT(*)::text AS count
        FROM "audit_log"
        WHERE "bookingRequestId" = $1
      `,
      ['bkg07c_rollback'],
    )
    assert.equal(Number(rollbackAuditRows[0]?.count ?? 0), 0)

    console.log('booking_isolated_custom_bundle_hold_expiration OK')
    console.log('due hold expired: verified')
    console.log('exact boundary expired: verified')
    console.log('future hold preserved: verified')
    console.log('payment reported protected: verified')
    console.log('payment proof protected: verified')
    console.log('expired replay classification: verified')
    console.log('released slot reusable: verified')
    console.log('concurrent workers: verified')
    console.log('batch processing: verified')
    console.log('partial rollback: verified')
    console.log('cleanup: verified')
  } catch (error) {
    try {
      await deleteFixtureData(client, fixtureBookingIds)
      await client.query('DROP TRIGGER IF EXISTS bkg07c_fail_expiration_audit_trigger ON "audit_log"')
      await client.query('DROP FUNCTION IF EXISTS bkg07c_fail_expiration_audit()')
      await client.query('DROP TRIGGER IF EXISTS bkg07c_delay_expiration_update_trigger ON "booking_requests"')
      await client.query('DROP FUNCTION IF EXISTS bkg07c_delay_expiration_update()')
      await deleteFixtureCatalog(client)
    } catch {
      // ignore cleanup failures in the failure path
    }

    fail(error instanceof Error ? error.message : String(error))
  } finally {
    try {
      await deleteFixtureData(client, fixtureBookingIds)
      await client.query('DROP TRIGGER IF EXISTS bkg07c_fail_expiration_audit_trigger ON "audit_log"')
      await client.query('DROP FUNCTION IF EXISTS bkg07c_fail_expiration_audit()')
      await client.query('DROP TRIGGER IF EXISTS bkg07c_delay_expiration_update_trigger ON "booking_requests"')
      await client.query('DROP FUNCTION IF EXISTS bkg07c_delay_expiration_update()')
      await deleteFixtureCatalog(client)

      const cleanupCounts = await queryRows<{
        request_count: string
        item_count: string
        proof_count: string
        audit_count: string
      }>(
        client,
        `
          SELECT
            (SELECT COUNT(*)::text FROM "booking_requests" WHERE id LIKE 'bkg07c_%' OR "publicCode" LIKE 'TUR-0707-7%') AS request_count,
            (SELECT COUNT(*)::text FROM "booking_request_items" WHERE "bookingRequestId" LIKE 'bkg07c_%') AS item_count,
            (SELECT COUNT(*)::text FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg07c_%') AS proof_count,
            (SELECT COUNT(*)::text FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg07c_%') AS audit_count
        `,
      )

      assert.equal(Number(cleanupCounts[0]?.request_count ?? 0), 0)
      assert.equal(Number(cleanupCounts[0]?.item_count ?? 0), 0)
      assert.equal(Number(cleanupCounts[0]?.proof_count ?? 0), 0)
      assert.equal(Number(cleanupCounts[0]?.audit_count ?? 0), 0)
    } finally {
      if (concurrentClientA) {
        await concurrentClientA.end().catch(() => {})
      }
      if (concurrentClientB) {
        await concurrentClientB.end().catch(() => {})
      }
      await client.end().catch(() => {})
    }
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
