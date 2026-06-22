import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

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

type BookingRequestFixture = {
  id: string
  publicCode: string
  status: string
  priorityLevel: string
  source: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string | null
  eventTitle: string
  eventDate: Date
  eventEndDate: Date | null
  notes: string | null
  internalNotes: string | null
  estimatedTotal: number | null
  currency: string
  submittedAt: Date | null
  bookingMode: string
  pricingSource: string | null
  idempotencyKey: string | null
  requestFingerprint: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_hold_schema FAILED')
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

function assertNoForbiddenSql(
  sql: string,
  label: string,
  options: {
    allowMarketplaceTables?: boolean
  } = {},
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
  assertNoForbiddenSql(sql, 'BKG-04 SQL', {
    allowMarketplaceTables: false,
  })
}

function assertBkg07Sql(sql: string): void {
  assertSqlPatterns(sql, 'BKG-07 SQL', BKG07_SQL_PATTERNS)
  assertNoForbiddenSql(sql, 'BKG-07 SQL', {
    allowMarketplaceTables: false,
  })
}

function normalizeMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return Number.NaN
}

function assertMoneyValue(
  value: string | number | null | undefined,
  expected: number,
  label: string,
): void {
  assert.equal(normalizeMoney(value), expected, label)
}

function buildBookingRequestFixture(overrides: Partial<BookingRequestFixture> = {}): BookingRequestFixture {
  return {
    id: 'hold-fixture-0001',
    publicCode: 'TUR-0707-001',
    status: 'under_review',
    priorityLevel: 'normal',
    source: 'web',
    requesterName: 'Ana Perez',
    requesterEmail: 'ana@example.com',
    requesterPhone: '+584121234567',
    eventTitle: 'Solicitud - Hold schema',
    eventDate: new Date('2026-06-22T16:00:00.000Z'),
    eventEndDate: null,
    notes: null,
    internalNotes: null,
    estimatedTotal: null,
    currency: 'USD',
    submittedAt: new Date('2026-06-22T16:00:00.000Z'),
    bookingMode: 'single',
    pricingSource: null,
    idempotencyKey: null,
    requestFingerprint: null,
    holdAcquiredAt: null,
    holdExpiresAt: null,
    ...overrides,
  }
}

const BOOKING_REQUEST_COLUMNS = [
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
  'submittedAt',
  'bookingMode',
  'pricingSource',
  'idempotencyKey',
  'requestFingerprint',
  'holdAcquiredAt',
  'holdExpiresAt',
] as const

async function insertBookingRequest(client: Client, fixture: BookingRequestFixture): Promise<void> {
  const values = BOOKING_REQUEST_COLUMNS.map((column) => fixture[column as keyof BookingRequestFixture])
  const placeholders = BOOKING_REQUEST_COLUMNS.map((_, index) => `$${index + 1}`)
  const sql = `
    INSERT INTO "booking_requests" (${BOOKING_REQUEST_COLUMNS.map((column) => `"${column}"`).join(', ')})
    VALUES (${placeholders.join(', ')})
  `
  await client.query(sql, values)
}

async function withTransaction(
  client: Client,
  run: () => Promise<void>,
): Promise<void> {
  await client.query('BEGIN')
  try {
    await run()
  } finally {
    await client.query('ROLLBACK').catch(() => {})
  }
}

async function assertConstraintNames(client: Client): Promise<void> {
  const constraintRows = await client.query<{ conname: string }>(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'booking_requests'::regclass
    ORDER BY conname
  `)

  const expectedConstraintNames = [
    'booking_requests_idempotency_pair_chk',
    'booking_requests_idempotency_key_format_chk',
    'booking_requests_request_fingerprint_format_chk',
    'booking_requests_hold_window_pair_chk',
    'booking_requests_hold_window_order_chk',
  ]

  for (const name of expectedConstraintNames) {
    assert.ok(
      constraintRows.rows.some((row) => row.conname === name),
      `Missing constraint: ${name}.`,
    )
  }

  const indexRows = await client.query<{ indexname: string; indexdef: string }>(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'booking_requests'
    ORDER BY indexname
  `)

  const idempotencyIndex = indexRows.rows.find(
    (row) => row.indexname === 'booking_requests_idempotency_key_uniq',
  )
  assert.ok(idempotencyIndex, 'Missing idempotency unique index.')
  assert.match(idempotencyIndex!.indexdef, /CREATE UNIQUE INDEX/i)
  assert.match(idempotencyIndex!.indexdef, /WHERE .*"idempotencyKey" IS NOT NULL/i)

  const holdIndex = indexRows.rows.find((row) => row.indexname === 'booking_requests_hold_expires_at_idx')
  assert.ok(holdIndex, 'Missing hold expiration index.')
  assert.match(holdIndex!.indexdef, /CREATE INDEX/i)
  assert.match(holdIndex!.indexdef, /WHERE .*"holdExpiresAt" IS NOT NULL/i)
}

async function main(): Promise<void> {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const args = process.argv.slice(2)
  if (args.length !== 3) {
    fail('Expected three SQL file arguments: baseline, BKG-04 proposal, and BKG-07 proposal.')
  }

  const [baselinePath, bkg04Path, bkg07Path] = args.map((argument) => resolve(process.cwd(), argument))
  const baselineSql = readSqlFile(baselinePath)
  const bkg04Sql = readSqlFile(bkg04Path)
  const bkg07Sql = readSqlFile(bkg07Path)

  assertNoForbiddenSql(baselineSql, 'Baseline SQL', { allowMarketplaceTables: true })
  assertBkg04Sql(bkg04Sql)
  assertBkg07Sql(bkg07Sql)

  const client = new Client({ connectionString })

  try {
    await client.connect()

    const identity = await client.query<{ current_database: string; current_user: string }>(`
      SELECT current_database(), current_user
    `)
    assert.equal(identity.rows[0].current_database, EXPECTED_DATABASE)
    assert.equal(identity.rows[0].current_user, EXPECTED_USER)

    await client.query(baselineSql)
    await client.query(bkg04Sql)
    await client.query(bkg07Sql)

    const columnRows = await client.query<{
      column_name: string
      is_nullable: string
      column_default: string | null
    }>(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'booking_requests'
        AND column_name IN ('idempotencyKey', 'requestFingerprint', 'holdAcquiredAt', 'holdExpiresAt')
      ORDER BY column_name
    `)

    const columnByName = new Map(columnRows.rows.map((row) => [row.column_name, row]))
    for (const columnName of ['idempotencyKey', 'requestFingerprint', 'holdAcquiredAt', 'holdExpiresAt']) {
      const row = columnByName.get(columnName)
      assert.ok(row, `Missing column metadata for ${columnName}.`)
      assert.equal(row?.is_nullable, 'YES', `${columnName} must remain nullable.`)
      assert.equal(row?.column_default, null, `${columnName} must not have a default.`)
    }

    await withTransaction(client, async () => {
      const fixture = buildBookingRequestFixture({
        id: 'hold-fixture-legacy-001',
        publicCode: 'TUR-0707-001',
        bookingMode: 'single',
        pricingSource: null,
      })
      await insertBookingRequest(client, fixture)
      const rows = await client.query<{
        idempotencyKey: string | null
        requestFingerprint: string | null
        holdAcquiredAt: Date | null
        holdExpiresAt: Date | null
        bookingMode: string
        pricingSource: string | null
      }>(`
        SELECT "idempotencyKey", "requestFingerprint", "holdAcquiredAt", "holdExpiresAt", "bookingMode", "pricingSource"
        FROM "booking_requests"
        WHERE id = $1
      `, [fixture.id])

      assert.equal(rows.rows.length, 1)
      assert.equal(rows.rows[0].idempotencyKey, null)
      assert.equal(rows.rows[0].requestFingerprint, null)
      assert.equal(rows.rows[0].holdAcquiredAt, null)
      assert.equal(rows.rows[0].holdExpiresAt, null)
      assert.equal(rows.rows[0].bookingMode, 'single')
      assert.equal(rows.rows[0].pricingSource, null)
    })

    await withTransaction(client, async () => {
      const acquiredAt = new Date('2026-06-22T16:00:00.000Z')
      const expiresAt = new Date('2026-06-22T17:00:00.000Z')
      const fixture = buildBookingRequestFixture({
        id: 'hold-fixture-hold-001',
        publicCode: 'TUR-0707-002',
        bookingMode: 'custom_bundle',
        pricingSource: 'server_catalog_v1',
        idempotencyKey: 'HOLD_2026:06:22-0001',
        requestFingerprint: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        holdAcquiredAt: acquiredAt,
        holdExpiresAt: expiresAt,
      })
      await insertBookingRequest(client, fixture)
      const rows = await client.query<{
        idempotencyKey: string | null
        requestFingerprint: string | null
        holdAcquiredAt: Date | null
        holdExpiresAt: Date | null
      }>(`
        SELECT "idempotencyKey", "requestFingerprint", "holdAcquiredAt", "holdExpiresAt"
        FROM "booking_requests"
        WHERE id = $1
      `, [fixture.id])

      assert.equal(rows.rows.length, 1)
      assert.equal(rows.rows[0].idempotencyKey, fixture.idempotencyKey)
      assert.equal(rows.rows[0].requestFingerprint, fixture.requestFingerprint)
      assert.ok(rows.rows[0].holdAcquiredAt instanceof Date)
      assert.ok(rows.rows[0].holdExpiresAt instanceof Date)
      assert.equal(
        rows.rows[0].holdExpiresAt!.getTime() - rows.rows[0].holdAcquiredAt!.getTime(),
        60 * 60_000,
      )
    })

    await withTransaction(client, async () => {
      const fixtureA = buildBookingRequestFixture({
        id: 'hold-fixture-dup-001',
        publicCode: 'TUR-0707-003',
        bookingMode: 'custom_bundle',
        pricingSource: 'server_catalog_v1',
        idempotencyKey: 'HOLD_2026:06:22-0002',
        requestFingerprint: '2222222222222222222222222222222222222222222222222222222222222222',
        holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
        holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
      })
      const fixtureB = buildBookingRequestFixture({
        id: 'hold-fixture-dup-002',
        publicCode: 'TUR-0707-004',
        bookingMode: 'custom_bundle',
        pricingSource: 'server_catalog_v1',
        idempotencyKey: fixtureA.idempotencyKey,
        requestFingerprint: '3333333333333333333333333333333333333333333333333333333333333333',
        holdAcquiredAt: new Date('2026-06-22T16:05:00.000Z'),
        holdExpiresAt: new Date('2026-06-22T17:05:00.000Z'),
      })

      await insertBookingRequest(client, fixtureA)
      const firstCount = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "idempotencyKey" = $1
      `, [fixtureA.idempotencyKey])
      assert.equal(firstCount.rows[0].count, '1')

      await assert.rejects(
        insertBookingRequest(client, fixtureB),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23505')
          assert.equal(pgError.constraint, 'booking_requests_idempotency_key_uniq')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      const fixtureA = buildBookingRequestFixture({
        id: 'hold-fixture-null-001',
        publicCode: 'TUR-0707-005',
      })
      const fixtureB = buildBookingRequestFixture({
        id: 'hold-fixture-null-002',
        publicCode: 'TUR-0707-006',
      })

      await insertBookingRequest(client, fixtureA)
      await insertBookingRequest(client, fixtureB)

      const countRows = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "publicCode" IN ($1, $2)
      `, [fixtureA.publicCode, fixtureB.publicCode])

      assert.equal(countRows.rows[0].count, '2')
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-001',
            publicCode: 'TUR-0707-007',
            idempotencyKey: 'HOLD_2026:06:22-0003',
            requestFingerprint: null,
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_idempotency_pair_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-002',
            publicCode: 'TUR-0707-008',
            idempotencyKey: null,
            requestFingerprint: '4444444444444444444444444444444444444444444444444444444444444444',
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_idempotency_pair_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-003',
            publicCode: 'TUR-0707-009',
            idempotencyKey: 'HOLD_2026:06:22-0004',
            requestFingerprint: 'ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_request_fingerprint_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-004',
            publicCode: 'TUR-0707-010',
            idempotencyKey: 'HOLD KEY WITH SPACES',
            requestFingerprint: '5555555555555555555555555555555555555555555555555555555555555555',
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_idempotency_key_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-005',
            publicCode: 'TUR-0707-011',
            idempotencyKey: 'HOLD_2026:06:22-0005',
            requestFingerprint: '6666666666666666666666666666666666666666666666666666666666666666',
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: null,
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_hold_window_pair_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-006',
            publicCode: 'TUR-0707-012',
            idempotencyKey: null,
            requestFingerprint: null,
            holdAcquiredAt: null,
            holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_hold_window_pair_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-007',
            publicCode: 'TUR-0707-013',
            idempotencyKey: 'HOLD_2026:06:22-0006',
            requestFingerprint: '7777777777777777777777777777777777777777777777777777777777777777',
            holdAcquiredAt: new Date('2026-06-22T16:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T16:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_hold_window_order_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      await assert.rejects(
        insertBookingRequest(
          client,
          buildBookingRequestFixture({
            id: 'hold-fixture-invalid-008',
            publicCode: 'TUR-0707-014',
            idempotencyKey: 'HOLD_2026:06:22-0007',
            requestFingerprint: '8888888888888888888888888888888888888888888888888888888888888888',
            holdAcquiredAt: new Date('2026-06-22T17:00:00.000Z'),
            holdExpiresAt: new Date('2026-06-22T16:00:00.000Z'),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_hold_window_order_chk')
          return true
        },
      )
    })

    await assertConstraintNames(client)

    const cleanupCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "booking_requests"
      WHERE "publicCode" LIKE 'TUR-0707-%'
    `)
    assert.equal(cleanupCount.rows[0].count, '0')

    console.log('booking_isolated_custom_bundle_hold_schema OK')
    console.log('legacy compatibility: verified')
    console.log('idempotency uniqueness: verified')
    console.log('idempotency pair: verified')
    console.log('fingerprint format: verified')
    console.log('hold window constraint: verified')
    console.log('indexes: verified')
    console.log('cleanup: verified')
  } catch (error) {
    if (error instanceof Error) {
      fail(error.message)
    }

    fail('Unexpected failure while validating the isolated hold schema.')
  } finally {
    await client.end().catch(() => {})
  }
}

void main()
