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

const PAYMENT_SQL_PATTERNS = [
  /ALTER\s+TABLE\s+"booking_requests"/i,
  /ADD\s+COLUMN\s+"paymentMethod"\s+TEXT/i,
  /ADD\s+COLUMN\s+"paymentReference"\s+TEXT/i,
  /ADD\s+COLUMN\s+"paymentNormalizedReference"\s+TEXT/i,
  /ADD\s+COLUMN\s+"paymentReportedAt"\s+TIMESTAMPTZ/i,
  /ADD\s+COLUMN\s+"paymentExpectedTotalUsdSnapshot"\s+NUMERIC\(10,2\)/i,
  /ADD\s+COLUMN\s+"paymentReportIdempotencyKey"\s+TEXT/i,
  /ADD\s+COLUMN\s+"paymentReportFingerprint"\s+TEXT/i,
  /booking_requests_payment_report_idempotency_key_uniq/i,
  /booking_requests_payment_reported_at_idx/i,
  /booking_requests_payment_normalized_reference_idx/i,
  /booking_requests_payment_report_all_or_none_chk/i,
  /booking_requests_payment_method_chk/i,
  /booking_requests_payment_reference_format_chk/i,
  /booking_requests_payment_normalized_reference_format_chk/i,
  /booking_requests_payment_report_idempotency_key_format_chk/i,
  /booking_requests_payment_report_fingerprint_format_chk/i,
  /booking_requests_payment_expected_total_chk/i,
  /booking_requests_payment_report_hold_window_chk/i,
]

type LegacyBookingRequestFixture = {
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
  calendarEventId: string | null
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type PaymentBookingRequestFixture = LegacyBookingRequestFixture & {
  bookingMode: string
  pricingSource: string | null
  idempotencyKey: string | null
  requestFingerprint: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
  paymentMethod: string | null
  paymentReference: string | null
  paymentNormalizedReference: string | null
  paymentReportedAt: Date | null
  paymentExpectedTotalUsdSnapshot: number | null
  paymentReportIdempotencyKey: string | null
  paymentReportFingerprint: string | null
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_payment_schema FAILED')
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

function assertPaymentSql(sql: string): void {
  assertSqlPatterns(sql, 'Payment SQL', PAYMENT_SQL_PATTERNS)
  assertNoForbiddenSql(sql, 'Payment SQL', { allowMarketplaceTables: false })
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

function buildLegacyBookingRequestFixture(
  overrides: Partial<LegacyBookingRequestFixture> = {},
): LegacyBookingRequestFixture {
  return {
    id: 'payment-fixture-legacy-001',
    publicCode: 'TUR-0808-001',
    status: 'under_review',
    priorityLevel: 'normal',
    source: 'web',
    requesterName: 'Ana Perez',
    requesterEmail: 'ana@example.com',
    requesterPhone: '+584121234567',
    eventTitle: 'Solicitud - Payment schema',
    eventDate: new Date('2026-06-23T16:00:00.000Z'),
    eventEndDate: null,
    notes: null,
    internalNotes: null,
    estimatedTotal: null,
    currency: 'USD',
    calendarEventId: null,
    submittedAt: new Date('2026-06-23T16:00:00.000Z'),
    createdAt: new Date('2026-06-23T16:00:00.000Z'),
    updatedAt: new Date('2026-06-23T16:00:00.000Z'),
    ...overrides,
  }
}

function buildPaymentBookingRequestFixture(
  overrides: Partial<PaymentBookingRequestFixture> = {},
): PaymentBookingRequestFixture {
  return {
    ...buildLegacyBookingRequestFixture({
      id: 'payment-fixture-report-001',
      publicCode: 'TUR-0808-010',
      eventTitle: 'Solicitud - Payment report',
      eventDate: new Date('2026-06-23T17:00:00.000Z'),
      submittedAt: new Date('2026-06-23T17:00:00.000Z'),
      createdAt: new Date('2026-06-23T17:00:00.000Z'),
      updatedAt: new Date('2026-06-23T17:00:00.000Z'),
    }),
    bookingMode: 'custom_bundle',
    pricingSource: 'server_catalog_v1',
    idempotencyKey: 'HOLD_2026:06:23-0001',
    requestFingerprint: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    holdAcquiredAt: new Date('2026-06-23T17:00:00.000Z'),
    holdExpiresAt: new Date('2026-06-23T18:00:00.000Z'),
    paymentMethod: 'pago_movil',
    paymentReference: 'Pago-123-ABC',
    paymentNormalizedReference: 'PAGO123ABC',
    paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
    paymentExpectedTotalUsdSnapshot: 280,
    paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0001',
    paymentReportFingerprint: 'a'.repeat(64),
    ...overrides,
  }
}

const LEGACY_BOOKING_REQUEST_COLUMNS = [
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
] as const

const PAYMENT_BOOKING_REQUEST_COLUMNS = [
  ...LEGACY_BOOKING_REQUEST_COLUMNS,
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
] as const

const BOOKING_REQUEST_ITEM_COLUMNS = [
  'id',
  'bookingRequestId',
  'serviceVariantId',
  'resourceId',
  'quantity',
  'notes',
  'createdAt',
  'updatedAt',
] as const

const LEGACY_FIXTURE_SERVICE_ID = 'payment-fixture-service-001'
const LEGACY_FIXTURE_SERVICE_VARIANT_ID = 'payment-fixture-variant-001'
const LEGACY_FIXTURE_BOOKING_REQUEST_ID = 'payment-fixture-legacy-001'
const LEGACY_FIXTURE_BOOKING_REQUEST_ITEM_ID = 'payment-fixture-item-001'

async function insertRow(
  client: Client,
  tableName: string,
  columns: readonly string[],
  values: readonly unknown[],
): Promise<void> {
  const placeholders = columns.map((_, index) => `$${index + 1}`)
  const sql = `INSERT INTO "${tableName}" (${columns.map((column) => `"${column}"`).join(', ')})
    VALUES (${placeholders.join(', ')})`
  await client.query(sql, [...values])
}

async function insertLegacyBookingRequest(
  client: Client,
  fixture: LegacyBookingRequestFixture,
): Promise<void> {
  await insertRow(
    client,
    'booking_requests',
    LEGACY_BOOKING_REQUEST_COLUMNS,
    LEGACY_BOOKING_REQUEST_COLUMNS.map((column) => fixture[column]),
  )
}

async function insertPaymentBookingRequest(
  client: Client,
  fixture: PaymentBookingRequestFixture,
): Promise<void> {
  await insertRow(
    client,
    'booking_requests',
    PAYMENT_BOOKING_REQUEST_COLUMNS,
    PAYMENT_BOOKING_REQUEST_COLUMNS.map((column) => fixture[column]),
  )
}

async function insertBookingRequestItem(
  client: Client,
  fixture: {
    id: string
    bookingRequestId: string
    serviceVariantId: string
    resourceId: string | null
    quantity: number
    notes: string | null
    createdAt: Date
    updatedAt: Date
  },
): Promise<void> {
  await insertRow(
    client,
    'booking_request_items',
    BOOKING_REQUEST_ITEM_COLUMNS,
    BOOKING_REQUEST_ITEM_COLUMNS.map((column) => fixture[column]),
  )
}

async function withTransaction(client: Client, run: () => Promise<void>): Promise<void> {
  await client.query('BEGIN')
  try {
    await run()
  } finally {
    await client.query('ROLLBACK').catch(() => {})
  }
}

async function withCommittedTransaction(
  client: Client,
  run: () => Promise<void>,
): Promise<void> {
  await client.query('BEGIN')
  try {
    await run()
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function cleanupPersistedLegacyFixture(client: Client): Promise<void> {
  await withCommittedTransaction(client, async () => {
    await client.query(`DELETE FROM "booking_request_items" WHERE id = $1`, [
      LEGACY_FIXTURE_BOOKING_REQUEST_ITEM_ID,
    ])
    await client.query(`DELETE FROM "booking_requests" WHERE id = $1`, [
      LEGACY_FIXTURE_BOOKING_REQUEST_ID,
    ])
    await client.query(`DELETE FROM "service_variants" WHERE id = $1`, [
      LEGACY_FIXTURE_SERVICE_VARIANT_ID,
    ])
    await client.query(`DELETE FROM "services" WHERE id = $1`, [LEGACY_FIXTURE_SERVICE_ID])
  })
}

async function assertColumnMetadata(client: Client): Promise<void> {
  const columnRows = await client.query<{
    column_name: string
    is_nullable: string
    column_default: string | null
    data_type: string
  }>(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_name = 'booking_requests'
      AND column_name IN (
        'paymentMethod',
        'paymentReference',
        'paymentNormalizedReference',
        'paymentReportedAt',
        'paymentExpectedTotalUsdSnapshot',
        'paymentReportIdempotencyKey',
        'paymentReportFingerprint'
      )
    ORDER BY column_name
  `)

  const rowByName = new Map(columnRows.rows.map((row) => [row.column_name, row]))
  const expectedColumns = [
    'paymentExpectedTotalUsdSnapshot',
    'paymentMethod',
    'paymentNormalizedReference',
    'paymentReference',
    'paymentReportedAt',
    'paymentReportFingerprint',
    'paymentReportIdempotencyKey',
  ]

  for (const columnName of expectedColumns) {
    const row = rowByName.get(columnName)
    assert.ok(row, `Missing column metadata for ${columnName}.`)
    assert.equal(row?.is_nullable, 'YES', `${columnName} must remain nullable.`)
    assert.equal(row?.column_default, null, `${columnName} must not have a default.`)
  }

  assert.equal(rowByName.get('paymentExpectedTotalUsdSnapshot')?.data_type, 'numeric')
  assert.equal(rowByName.get('paymentReportedAt')?.data_type, 'timestamp with time zone')
}

async function assertConstraintAndIndexNames(client: Client): Promise<void> {
  const constraintRows = await client.query<{ conname: string }>(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'booking_requests'::regclass
    ORDER BY conname
  `)

  const expectedConstraintNames = [
    'booking_requests_payment_report_all_or_none_chk',
    'booking_requests_payment_method_chk',
    'booking_requests_payment_reference_format_chk',
    'booking_requests_payment_normalized_reference_format_chk',
    'booking_requests_payment_report_idempotency_key_format_chk',
    'booking_requests_payment_report_fingerprint_format_chk',
    'booking_requests_payment_expected_total_chk',
    'booking_requests_payment_report_hold_window_chk',
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

  const expectedIndexNames = [
    'booking_requests_payment_report_idempotency_key_uniq',
    'booking_requests_payment_reported_at_idx',
    'booking_requests_payment_normalized_reference_idx',
  ]

  for (const indexName of expectedIndexNames) {
    const indexRow = indexRows.rows.find((row) => row.indexname === indexName)
    assert.ok(indexRow, `Missing index: ${indexName}.`)
  }

  const idempotencyIndex = indexRows.rows.find(
    (row) => row.indexname === 'booking_requests_payment_report_idempotency_key_uniq',
  )
  assert.ok(idempotencyIndex)
  assert.match(idempotencyIndex!.indexdef, /CREATE UNIQUE INDEX/i)
  assert.match(idempotencyIndex!.indexdef, /WHERE .*"paymentReportIdempotencyKey" IS NOT NULL/i)

  const reportedAtIndex = indexRows.rows.find(
    (row) => row.indexname === 'booking_requests_payment_reported_at_idx',
  )
  assert.ok(reportedAtIndex)
  assert.match(reportedAtIndex!.indexdef, /CREATE INDEX/i)
  assert.match(reportedAtIndex!.indexdef, /WHERE .*"paymentReportedAt" IS NOT NULL/i)

  const normalizedReferenceIndex = indexRows.rows.find(
    (row) => row.indexname === 'booking_requests_payment_normalized_reference_idx',
  )
  assert.ok(normalizedReferenceIndex)
  assert.match(normalizedReferenceIndex!.indexdef, /CREATE INDEX/i)
  assert.match(normalizedReferenceIndex!.indexdef, /WHERE .*"paymentNormalizedReference" IS NOT NULL/i)
}

async function main(): Promise<void> {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

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
  assertPaymentSql(bkg08Sql)

  const client = new Client({ connectionString })

  try {
    await client.connect()

    const identity = await client.query<{ current_database: string; current_user: string }>(`
      SELECT current_database(), current_user
    `)
    assert.equal(identity.rows[0].current_database, EXPECTED_DATABASE)
    assert.equal(identity.rows[0].current_user, EXPECTED_USER)

    await client.query(baselineSql)

    await withCommittedTransaction(client, async () => {
      const serviceRows = await client.query<{ id: string }>(`
        INSERT INTO "services" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES ($1, 'sala-ensayo', 'Sala de ensayo', 'Servicio legacy de sala', true, now(), now())
        RETURNING id
      `, [LEGACY_FIXTURE_SERVICE_ID])

      const serviceVariantRows = await client.query<{ id: string }>(`
        INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId", "createdAt", "updatedAt")
        VALUES ($1, 'sala-ensayo-premium', 'Sala Premium', 'Variante legacy de sala', true, $2, now(), now())
        RETURNING id
      `, [LEGACY_FIXTURE_SERVICE_VARIANT_ID, serviceRows.rows[0].id])

      const legacyBookingRequest = buildLegacyBookingRequestFixture({
        id: LEGACY_FIXTURE_BOOKING_REQUEST_ID,
        publicCode: 'TUR-0808-001',
      })
      await insertLegacyBookingRequest(client, legacyBookingRequest)

      await insertBookingRequestItem(client, {
        id: LEGACY_FIXTURE_BOOKING_REQUEST_ITEM_ID,
        bookingRequestId: legacyBookingRequest.id,
        serviceVariantId: serviceVariantRows.rows[0].id,
        resourceId: null,
        quantity: 1,
        notes: null,
        createdAt: new Date('2026-06-23T16:00:00.000Z'),
        updatedAt: new Date('2026-06-23T16:00:00.000Z'),
      })
    })
    console.log('legacy fixture committed')

    await client.query(bkg04Sql)
    await client.query(bkg07Sql)
    await client.query(bkg08Sql)
    console.log('proposals applied')

    await assertColumnMetadata(client)

    await withTransaction(client, async () => {
      console.log('legacy compatibility check')
      const rows = await client.query<{
        bookingMode: string | null
        pricingSource: string | null
        idempotencyKey: string | null
        requestFingerprint: string | null
        holdAcquiredAt: Date | null
        holdExpiresAt: Date | null
        paymentMethod: string | null
        paymentReference: string | null
        paymentNormalizedReference: string | null
        paymentReportedAt: Date | null
        paymentExpectedTotalUsdSnapshot: string | number | null
        paymentReportIdempotencyKey: string | null
        paymentReportFingerprint: string | null
      }>(`
        SELECT
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
          "paymentReportFingerprint"
        FROM "booking_requests"
        WHERE "publicCode" = $1
      `, ['TUR-0808-001'])

      assert.equal(
        rows.rows.length,
        1,
        'legacy booking must survive the additive proposals',
      )
      const legacyRow = rows.rows[0]
      assert.equal(legacyRow.bookingMode, 'single')
      assert.equal(legacyRow.pricingSource, null)
      assert.equal(legacyRow.idempotencyKey, null)
      assert.equal(legacyRow.requestFingerprint, null)
      assert.equal(legacyRow.holdAcquiredAt, null)
      assert.equal(legacyRow.holdExpiresAt, null)
      assert.equal(legacyRow.paymentMethod, null)
      assert.equal(legacyRow.paymentReference, null)
      assert.equal(legacyRow.paymentNormalizedReference, null)
      assert.equal(legacyRow.paymentReportedAt, null)
      assert.equal(legacyRow.paymentExpectedTotalUsdSnapshot, null)
      assert.equal(legacyRow.paymentReportIdempotencyKey, null)
      assert.equal(legacyRow.paymentReportFingerprint, null)

      const itemRows = await client.query<{
        id: string
        bookingRequestId: string
        serviceVariantId: string
        itemSlug: string | null
        itemName: string | null
        itemKind: string | null
        unitPriceUsdSnapshot: string | number | null
        lineTotalUsdSnapshot: string | number | null
      }>(`
        SELECT
          id,
          "bookingRequestId",
          "serviceVariantId",
          "itemSlug",
          "itemName",
          "itemKind",
          "unitPriceUsdSnapshot",
          "lineTotalUsdSnapshot"
        FROM "booking_request_items"
        WHERE id = $1
      `, [LEGACY_FIXTURE_BOOKING_REQUEST_ITEM_ID])

      assert.equal(
        itemRows.rows.length,
        1,
        'legacy booking request item must survive the additive proposals',
      )
      const legacyItem = itemRows.rows[0]
      assert.equal(legacyItem.bookingRequestId, LEGACY_FIXTURE_BOOKING_REQUEST_ID)
      assert.equal(legacyItem.serviceVariantId, LEGACY_FIXTURE_SERVICE_VARIANT_ID)
      assert.equal(legacyItem.itemSlug, null)
      assert.equal(legacyItem.itemName, null)
      assert.equal(legacyItem.itemKind, null)
      assert.equal(legacyItem.unitPriceUsdSnapshot, null)
      assert.equal(legacyItem.lineTotalUsdSnapshot, null)
    })

    await withTransaction(client, async () => {
      console.log('payment report check')
      const paymentFixture = buildPaymentBookingRequestFixture()
      await insertPaymentBookingRequest(client, paymentFixture)

      const rows = await client.query<{
        bookingMode: string
        pricingSource: string | null
        idempotencyKey: string | null
        requestFingerprint: string | null
        holdAcquiredAt: Date | null
        holdExpiresAt: Date | null
        paymentMethod: string | null
        paymentReference: string | null
        paymentNormalizedReference: string | null
        paymentReportedAt: Date | null
        paymentExpectedTotalUsdSnapshot: string | number | null
        paymentReportIdempotencyKey: string | null
        paymentReportFingerprint: string | null
      }>(`
        SELECT
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
          "paymentReportFingerprint"
        FROM "booking_requests"
        WHERE "publicCode" = $1
      `, [paymentFixture.publicCode])

      assert.equal(rows.rows.length, 1)
      const paymentRow = rows.rows[0]
      assert.equal(paymentRow.bookingMode, 'custom_bundle')
      assert.equal(paymentRow.pricingSource, 'server_catalog_v1')
      assert.equal(paymentRow.idempotencyKey, 'HOLD_2026:06:23-0001')
      assert.equal(paymentRow.requestFingerprint, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
      assert.ok(paymentRow.holdAcquiredAt instanceof Date)
      assert.ok(paymentRow.holdExpiresAt instanceof Date)
      assert.ok(paymentRow.paymentReportedAt instanceof Date)
      assert.equal(paymentRow.paymentMethod, 'pago_movil')
      assert.equal(paymentRow.paymentReference, 'Pago-123-ABC')
      assert.equal(paymentRow.paymentNormalizedReference, 'PAGO123ABC')
      assert.equal(paymentRow.paymentReportIdempotencyKey, 'PAYMENT_2026:06:23-0001')
      assert.equal(paymentRow.paymentReportFingerprint, 'a'.repeat(64))
      assert.equal(
        paymentRow.paymentReportedAt!.getTime() - paymentRow.holdAcquiredAt!.getTime(),
        30 * 60_000,
      )
      assert.equal(
        paymentRow.holdExpiresAt!.getTime() - paymentRow.paymentReportedAt!.getTime(),
        30 * 60_000,
      )
      assertMoneyValue(paymentRow.paymentExpectedTotalUsdSnapshot, 280, 'expected total should persist')
    })

    await withTransaction(client, async () => {
      console.log('null payment fixtures check')
      const firstFixture = buildPaymentBookingRequestFixture({
        id: 'payment-fixture-null-001',
        publicCode: 'TUR-0808-020',
        paymentReportIdempotencyKey: null,
        paymentReportFingerprint: null,
        paymentMethod: null,
        paymentReference: null,
        paymentNormalizedReference: null,
        paymentReportedAt: null,
        paymentExpectedTotalUsdSnapshot: null,
      })
      const secondFixture = buildPaymentBookingRequestFixture({
        id: 'payment-fixture-null-002',
        publicCode: 'TUR-0808-021',
        paymentReportIdempotencyKey: null,
        paymentReportFingerprint: null,
        paymentMethod: null,
        paymentReference: null,
        paymentNormalizedReference: null,
        paymentReportedAt: null,
        paymentExpectedTotalUsdSnapshot: null,
      })

      await insertPaymentBookingRequest(client, firstFixture)
      await insertPaymentBookingRequest(client, secondFixture)

      const countRows = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM "booking_requests"
        WHERE "publicCode" IN ($1, $2)
      `, [firstFixture.publicCode, secondFixture.publicCode])

      assert.equal(countRows.rows[0].count, '2')
    })

    await withTransaction(client, async () => {
      console.log('invalid payment method check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-001',
            publicCode: 'TUR-0808-030',
            paymentMethod: 'card',
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_method_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('invalid payment reference check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-002',
            publicCode: 'TUR-0808-031',
            paymentReference: 'Line 1\nLine 2',
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_reference_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('all-or-none payment check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-002b',
            publicCode: 'TUR-0808-031B',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'PAGO123ABC',
            paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 280,
            paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
            paymentReportFingerprint: null,
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_report_all_or_none_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('normalized reference check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-003',
            publicCode: 'TUR-0808-032',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'pago123abc',
            paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 280,
            paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
            paymentReportFingerprint: 'b'.repeat(64),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_normalized_reference_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('idempotency format check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-004',
            publicCode: 'TUR-0808-033',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'PAGO123ABC',
            paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 280,
            paymentReportIdempotencyKey: 'short',
            paymentReportFingerprint: 'c'.repeat(64),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_report_idempotency_key_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('fingerprint format check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-005',
            publicCode: 'TUR-0808-034',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'PAGO123ABC',
            paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 280,
            paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0003',
            paymentReportFingerprint: 'ABCDEF'.repeat(10) + 'AB',
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_report_fingerprint_format_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('expected total check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-006',
            publicCode: 'TUR-0808-035',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'PAGO123ABC',
            paymentReportedAt: new Date('2026-06-23T17:30:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 0,
            paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0004',
            paymentReportFingerprint: 'd'.repeat(64),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_expected_total_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('hold window check')
      await assert.rejects(
        insertPaymentBookingRequest(
          client,
          buildPaymentBookingRequestFixture({
            id: 'payment-fixture-invalid-007',
            publicCode: 'TUR-0808-036',
            paymentMethod: 'pago_movil',
            paymentReference: 'Pago-123-ABC',
            paymentNormalizedReference: 'PAGO123ABC',
            paymentReportedAt: new Date('2026-06-23T18:00:00.000Z'),
            paymentExpectedTotalUsdSnapshot: 280,
            paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0005',
            paymentReportFingerprint: 'e'.repeat(64),
          }),
        ),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23514')
          assert.equal(pgError.constraint, 'booking_requests_payment_report_hold_window_chk')
          return true
        },
      )
    })

    await withTransaction(client, async () => {
      console.log('duplicate idempotency check')
      const firstFixture = buildPaymentBookingRequestFixture({
        id: 'payment-fixture-dup-001',
        publicCode: 'TUR-0808-040',
        paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0006',
        paymentReportFingerprint: 'f'.repeat(64),
      })
      const secondFixture = buildPaymentBookingRequestFixture({
        id: 'payment-fixture-dup-002',
        publicCode: 'TUR-0808-041',
        paymentReportIdempotencyKey: firstFixture.paymentReportIdempotencyKey,
        paymentReportFingerprint: '9'.repeat(64),
      })

      await insertPaymentBookingRequest(client, firstFixture)

      await assert.rejects(
        insertPaymentBookingRequest(client, secondFixture),
        (error: unknown) => {
          const pgError = error as Error & { code?: string; constraint?: string }
          assert.equal(pgError.code, '23505')
          assert.equal(pgError.constraint, 'booking_requests_payment_report_idempotency_key_uniq')
          return true
        },
      )
    })

    await assertConstraintAndIndexNames(client)
    console.log('constraints and indexes verified')

    await cleanupPersistedLegacyFixture(client)
    console.log('legacy fixture cleanup committed')

    const bookingRequestCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "booking_requests"
      WHERE id LIKE 'payment-fixture-%'
         OR "publicCode" LIKE 'TUR-0808-%'
    `)
    assert.equal(bookingRequestCount.rows[0].count, '0')

    const bookingRequestItemCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "booking_request_items"
      WHERE id = $1
    `, [LEGACY_FIXTURE_BOOKING_REQUEST_ITEM_ID])
    assert.equal(bookingRequestItemCount.rows[0].count, '0')

    const serviceVariantCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "service_variants"
      WHERE id = $1
    `, [LEGACY_FIXTURE_SERVICE_VARIANT_ID])
    assert.equal(serviceVariantCount.rows[0].count, '0')

    const serviceCount = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "services"
      WHERE id = $1
    `, [LEGACY_FIXTURE_SERVICE_ID])
    assert.equal(serviceCount.rows[0].count, '0')

    console.log('booking_isolated_custom_bundle_payment_schema OK')
    console.log('legacy compatibility: verified')
    console.log('payment report columns: verified')
    console.log('payment report constraints: verified')
    console.log('payment report indexes: verified')
    console.log('cleanup: verified')
  } catch (error) {
    if (error instanceof Error) {
      fail(error.message)
    }

    fail('Unexpected failure while validating the isolated payment schema.')
  } finally {
    await cleanupPersistedLegacyFixture(client).catch(() => {})
    await client.end().catch(() => {})
  }
}

void main()
