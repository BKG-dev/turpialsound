import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  reportCustomBundlePaymentWithSql,
  type ReportCustomBundlePaymentWithSqlInput,
} from '@/lib/bookings/custom-bundle-payment-reporting'
import {
  CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
  expireCustomBundleHoldsWithSql,
  type CustomBundleHoldExpirationServerContext,
} from '@/lib/bookings/custom-bundle-hold-expiration'
import type {
  CustomBundlePaymentReportSubmission,
  CustomBundlePaymentServerContext,
  CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

type TracingSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_payment_reporting FAILED')
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
  const calls: Array<{ sql: string; params: readonly unknown[] }> = []
  const injectError = options.injectError

  return {
    transactionScope: 'single_connection',
    calls,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      calls.push({ sql, params: [...params] })
      if (
        injectError &&
        injectError.remainingHits > 0 &&
        injectError.pattern.test(sql)
      ) {
        injectError.remainingHits -= 1
        throw injectError.error
      }

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

async function queryRows<Row = Record<string, unknown>>(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await client.query<Row>(sql, [...values])
  return result.rows
}

function makeSubmission(
  publicCode: string,
  paymentMethod: CustomBundlePaymentReportSubmission['paymentMethod'],
  paymentReference: string,
): CustomBundlePaymentReportSubmission {
  return {
    publicCode,
    paymentMethod,
    paymentReference,
  }
}

function makeProofMetadata(
  publicCode: string,
  suffix: string,
  overrides: Partial<CustomBundleTrustedPaymentProofMetadata> = {},
): CustomBundleTrustedPaymentProofMetadata {
  return {
    blobPathname: `payment-proofs/${publicCode}/${suffix}.webp`,
    sha256: makeHexFingerprint(suffix),
    mimeType: 'image/png',
    sizeBytes: 2048,
    originalFilename: `${suffix}.png`,
    uploadedAt: new Date('2026-06-23T14:00:00.000Z'),
    ...overrides,
  }
}

function makeServerContext(
  proofMetadata: CustomBundleTrustedPaymentProofMetadata | null,
  paymentReportIdempotencyKey: string,
  now: Date,
): CustomBundlePaymentServerContext {
  return {
    now,
    paymentReportIdempotencyKey,
    proofMetadata,
  }
}

function makeHexFingerprint(seed: string): string {
  return seed.toLowerCase().replace(/[^0-9a-f]/g, 'a').padEnd(64, 'a').slice(0, 64)
}

function makePaymentInput(input: {
  publicCode: string
  paymentMethod: CustomBundlePaymentReportSubmission['paymentMethod']
  paymentReference: string
  paymentReportIdempotencyKey: string
  proofMetadata?: CustomBundleTrustedPaymentProofMetadata | null
  now?: Date
}): ReportCustomBundlePaymentWithSqlInput {
  return {
    submission: makeSubmission(input.publicCode, input.paymentMethod, input.paymentReference),
    serverContext: makeServerContext(
      input.proofMetadata ?? null,
      input.paymentReportIdempotencyKey,
      input.now ?? new Date('2026-06-23T14:30:00.000Z'),
    ),
  }
}

async function seedCatalog(client: Client): Promise<{
  serviceId: string
  variantId: string
  resourceId: string
}> {
  const serviceId = 'bkg08b_service_sala'
  const variantId = 'bkg08b_variant_sala_premium'
  const resourceId = 'bkg08b_resource_sala_3'

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

async function insertFixtureBooking(client: Client, input: {
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
}): Promise<void> {
  const eventDate = new Date('2026-06-24T14:00:00.000Z')
  const eventEndDate = new Date('2026-06-24T16:00:00.000Z')
  const holdAcquiredAt = input.holdAcquiredAt ?? new Date('2026-06-23T14:00:00.000Z')
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

async function insertActivePaymentProof(client: Client, input: {
  id: string
  bookingRequestId: string
  blobPathname: string
  sha256: string
  reportedReference: string | null
  normalizedReference: string | null
  duplicateStatus?: 'none' | 'same_booking' | 'other_booking'
}): Promise<void> {
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
        "isActive",
        "replacesProofId"
      ) VALUES (
        $1, $2, $3, $4, 'image/png', 2048, 'proof.png', $5, $6, $7, $8, true, NULL
      )
    `,
    [
      input.id,
      input.bookingRequestId,
      input.blobPathname,
      input.sha256,
      new Date('2026-06-23T14:00:00.000Z'),
      input.reportedReference,
      input.normalizedReference,
      input.duplicateStatus ?? 'none',
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

async function fetchActiveProofs(client: Client, bookingRequestId: string): Promise<Array<Record<string, unknown>>> {
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

async function runPayment(
  client: Client,
  input: ReportCustomBundlePaymentWithSqlInput,
  tracingOptions: Parameters<typeof createTracingSession>[1] = {},
): Promise<{
  result: Awaited<ReturnType<typeof reportCustomBundlePaymentWithSql>>
  trace: TracingSession['calls']
}> {
  const session = createTracingSession(client, tracingOptions)
  const result = await reportCustomBundlePaymentWithSql(session, input)
  return { result, trace: session.calls }
}

async function runExpiration(
  client: Client,
  serverContext: CustomBundleHoldExpirationServerContext,
): Promise<{
  result: Awaited<ReturnType<typeof expireCustomBundleHoldsWithSql>>
  trace: TracingSession['calls']
}> {
  const session = createTracingSession(client)
  const result = await expireCustomBundleHoldsWithSql(session, { serverContext })
  return { result, trace: session.calls }
}

function assertPaymentStage(
  result: Awaited<ReturnType<typeof reportCustomBundlePaymentWithSql>>,
  expectedStage: 'reported' | 'replayed',
  label: string,
): void {
  assert.equal(result.ok, true, `${label}: ${JSON.stringify(result)}`)
  assert.equal(result.stage, expectedStage, `${label}: ${JSON.stringify(result)}`)
}

function assertTraceContains(calls: TracingSession['calls'], pattern: RegExp, message: string): void {
  assert.ok(calls.some((call) => pattern.test(call.sql)), message)
}

function assertTraceDoesNotContain(calls: TracingSession['calls'], pattern: RegExp, message: string): void {
  assert.equal(calls.some((call) => pattern.test(call.sql)), false, message)
}

async function cleanupFixtures(client: Client): Promise<void> {
  await client.query(`DELETE FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DELETE FROM "payment_proofs" WHERE "bookingRequestId" LIKE 'bkg08b_%' OR id LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DELETE FROM "booking_request_items" WHERE "bookingRequestId" LIKE 'bkg08b_%' OR id LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DELETE FROM "booking_requests" WHERE id LIKE 'bkg08b_%' OR "publicCode" LIKE 'TUR-0808-%'`).catch(() => {})
  await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg08b_%'`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08b_fail_payment_audit_trigger ON "audit_log"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08b_fail_payment_audit()`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08b_delay_payment_update_trigger ON "booking_requests"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08b_delay_payment_update()`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08b_skip_payment_update_trigger ON "booking_requests"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08b_skip_payment_update()`).catch(() => {})
  await client.query(`DROP TRIGGER IF EXISTS bkg08b_delay_expiration_update_trigger ON "booking_requests"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08b_delay_expiration_update()`).catch(() => {})
}

async function restorePaymentReportAllOrNoneConstraint(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE "booking_requests"
    ADD CONSTRAINT "booking_requests_payment_report_all_or_none_chk"
    CHECK (
      (
        "paymentMethod" IS NULL
        AND "paymentReference" IS NULL
        AND "paymentNormalizedReference" IS NULL
        AND "paymentReportedAt" IS NULL
        AND "paymentExpectedTotalUsdSnapshot" IS NULL
        AND "paymentReportIdempotencyKey" IS NULL
        AND "paymentReportFingerprint" IS NULL
      )
      OR
      (
        "paymentMethod" IS NOT NULL
        AND "paymentReference" IS NOT NULL
        AND "paymentNormalizedReference" IS NOT NULL
        AND "paymentReportedAt" IS NOT NULL
        AND "paymentExpectedTotalUsdSnapshot" IS NOT NULL
        AND "paymentReportIdempotencyKey" IS NOT NULL
        AND "paymentReportFingerprint" IS NOT NULL
      )
    )
  `)
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
  assertNoForbiddenSql(bkg08Sql, 'BKG-08 SQL')

  const client = new Client({ connectionString })
  let concurrentClientA: Client | null = null
  let concurrentClientB: Client | null = null

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

    // Case 1: valid pago movil with proof.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_pm',
      publicCode: 'TUR-0808-101',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })

    const pagoMovilInput = makePaymentInput({
      publicCode: 'TUR-0808-101',
      paymentMethod: 'pago_movil',
      paymentReference: ' PM-101 ',
      paymentReportIdempotencyKey: 'PAYMENT_0808_PM_101',
      proofMetadata: makeProofMetadata('TUR-0808-101', 'pm101'),
    })
    const pagoMovil = await runPayment(client, pagoMovilInput)
    assertPaymentStage(pagoMovil.result, 'reported', 'pago movil with proof')
    assertTraceContains(pagoMovil.trace, /FOR UPDATE/i, 'payment adapter must lock the booking row')
    assertTraceContains(pagoMovil.trace, /INSERT INTO "payment_proofs"/i, 'payment adapter must persist the proof')
    assertTraceContains(pagoMovil.trace, /INSERT INTO "audit_log"/i, 'payment adapter must write an audit log')
    const bookingPm = await fetchBooking(client, 'TUR-0808-101')
    assert.ok(bookingPm)
    assert.equal(bookingPm?.status, 'under_review')
    assert.equal(bookingPm?.internalNotes, '[ops_status:payment_reported]\nnota interna')
    assert.equal(bookingPm?.paymentMethod, 'pago_movil')
    assert.equal(bookingPm?.paymentReference, 'PM-101')
    assert.equal(bookingPm?.paymentNormalizedReference, 'PM101')
    assert.ok(bookingPm?.paymentReportedAt instanceof Date)
    assert.equal(bookingPm?.paymentReportIdempotencyKey, 'PAYMENT_0808_PM_101')
    assert.equal(Number(bookingPm?.paymentExpectedTotalUsdSnapshot ?? 0), 280)
    const bookingPmId = String(bookingPm?.id)
    const bookingPmProofs = await fetchActiveProofs(client, bookingPmId)
    assert.equal(bookingPmProofs.length, 1)
    assert.equal(bookingPmProofs[0]?.reportedReference, 'PM-101')
    assert.equal(bookingPmProofs[0]?.normalizedReference, 'PM101')
    assert.equal(bookingPmProofs[0]?.duplicateStatus, 'none')
    assert.equal(await fetchAuditCount(client, bookingPmId), 1)
    const bookingPmItems = await fetchItems(client, bookingPmId)
    assert.equal(bookingPmItems[0]?.resourceId, catalog.resourceId)
    assert.equal(bookingPmItems[0]?.serviceVariantId, catalog.variantId)

    // Case 2/3: transferencia and binance with proof.
    for (const [suffix, method] of [
      ['transfer', 'transferencia'],
      ['binance', 'binance'],
    ] as const) {
      const publicCode = suffix === 'transfer' ? 'TUR-0808-102' : 'TUR-0808-103'
      await insertFixtureBooking(client, {
        id: `bkg08b_booking_${suffix}`,
        publicCode,
        serviceVariantId: catalog.variantId,
        resourceId: catalog.resourceId,
      })
      const result = await runPayment(
        client,
        makePaymentInput({
          publicCode,
          paymentMethod: method,
          paymentReference: `${suffix}-001`,
          paymentReportIdempotencyKey: `PAYMENT_${suffix.toUpperCase()}_001`,
          proofMetadata: makeProofMetadata(publicCode, suffix),
        }),
      )
      assertPaymentStage(result.result, 'reported', `${method} with proof`)
    }

    // Case 4: efectivo without proof.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_cash',
      publicCode: 'TUR-0808-104',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const cashResult = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-104',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-001',
        paymentReportIdempotencyKey: 'PAYMENT_CASH_001',
      }),
    )
    assertPaymentStage(cashResult.result, 'reported', 'cash without proof')
    if (cashResult.result.ok && cashResult.result.stage === 'reported') {
      assert.equal(cashResult.result.paymentProofId, null)
      assert.equal(cashResult.result.duplicateStatus, null)
    }
    assertTraceDoesNotContain(cashResult.trace, /INSERT INTO "payment_proofs"/i, 'cash without proof must not insert a proof')

    // Case 5: exact replay with no additional writes.
    const auditCountBeforeReplay = await fetchAuditCount(client, bookingPmId)
    const proofCountBeforeReplay = (await fetchActiveProofs(client, bookingPmId)).length
    const replayResult = await runPayment(client, pagoMovilInput)
    assertPaymentStage(replayResult.result, 'replayed', 'exact replay')
    if (replayResult.result.ok && replayResult.result.stage === 'replayed') {
      assert.equal(replayResult.result.paymentReportedAtIso, (bookingPm?.paymentReportedAt as Date).toISOString())
      assert.equal(replayResult.result.paymentProofId, bookingPmProofs[0]?.id)
    }
    assertTraceDoesNotContain(replayResult.trace, /INSERT INTO "payment_proofs"/i, 'exact replay must not insert a new proof')
    assertTraceDoesNotContain(replayResult.trace, /UPDATE "booking_requests"/i, 'exact replay must not update the booking')
    assertTraceDoesNotContain(replayResult.trace, /INSERT INTO "audit_log"/i, 'exact replay must not create another audit row')
    assert.equal(await fetchAuditCount(client, bookingPmId), auditCountBeforeReplay)
    assert.equal((await fetchActiveProofs(client, bookingPmId)).length, proofCountBeforeReplay)

    // Case 6: same key, different fingerprint.
    const keyConflictReplay = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-101',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-999',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_101',
        proofMetadata: makeProofMetadata('TUR-0808-101', 'pm101'),
      }),
    )
    assert.equal(keyConflictReplay.result.ok, false)
    if (!keyConflictReplay.result.ok) {
      assert.equal(keyConflictReplay.result.stage, 'replay')
      assert.equal(keyConflictReplay.result.code, 'IDEMPOTENCY_KEY_CONFLICT')
    }

    // Case 7: different key with existing report.
    const alreadyReported = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-101',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-101',
        paymentReportIdempotencyKey: 'PAYMENT_0808_PM_101_ALT',
        proofMetadata: makeProofMetadata('TUR-0808-101', 'pm101'),
      }),
    )
    assert.equal(alreadyReported.result.ok, false)
    if (!alreadyReported.result.ok) {
      assert.equal(alreadyReported.result.stage, 'replay')
      assert.equal(alreadyReported.result.code, 'ALREADY_REPORTED_BY_OTHER_ATTEMPT')
    }

    // Case 8: global idempotency key conflict on another booking.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_conflict',
      publicCode: 'TUR-0808-105',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      paymentMethod: 'pago_movil',
      paymentReference: 'PM-105',
      paymentNormalizedReference: 'PM105',
      paymentReportedAt: new Date('2026-06-23T14:20:00.000Z'),
      paymentExpectedTotalUsdSnapshot: 280,
      paymentReportIdempotencyKey: 'PAYMENT_CONFLICT_GLOBAL',
      paymentReportFingerprint: 'b'.repeat(64),
      internalNotes: '[ops_status:payment_reported]',
    })
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_conflict_target',
      publicCode: 'TUR-0808-106',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const globalConflict = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-106',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-106',
        paymentReportIdempotencyKey: 'PAYMENT_CONFLICT_GLOBAL',
      }),
    )
    assert.equal(globalConflict.result.ok, false)
    if (!globalConflict.result.ok) {
      assert.equal(globalConflict.result.stage, 'persistence')
      assert.equal(globalConflict.result.code, 'PAYMENT_REPORT_IDEMPOTENCY_KEY_CONFLICT')
    }

    // Case 9: malformed partial report.
    await client.query(`
      ALTER TABLE "booking_requests"
      DROP CONSTRAINT IF EXISTS "booking_requests_payment_report_all_or_none_chk"
    `)
    try {
      await insertFixtureBooking(client, {
        id: 'bkg08b_booking_partial',
        publicCode: 'TUR-0808-107',
        serviceVariantId: catalog.variantId,
        resourceId: catalog.resourceId,
        internalNotes: '[ops_status:payment_reported]',
        paymentMethod: 'pago_movil',
        paymentReference: null,
        paymentNormalizedReference: null,
        paymentReportedAt: null,
        paymentExpectedTotalUsdSnapshot: null,
        paymentReportIdempotencyKey: null,
        paymentReportFingerprint: null,
      })
      const malformed = await runPayment(
        client,
        makePaymentInput({
          publicCode: 'TUR-0808-107',
          paymentMethod: 'pago_movil',
          paymentReference: 'PM-107',
          paymentReportIdempotencyKey: 'PAYMENT_PARTIAL_107',
          proofMetadata: makeProofMetadata('TUR-0808-107', 'pm107'),
        }),
      )
      assert.equal(malformed.result.ok, false)
      if (!malformed.result.ok) {
        assert.equal(malformed.result.stage, 'replay')
        assert.equal(malformed.result.code, 'MALFORMED_EXISTING_REPORT')
      }
    } finally {
      await client.query(
        `DELETE FROM "booking_request_items" WHERE "bookingRequestId" = 'bkg08b_booking_partial'`,
      )
      await client.query(
        `DELETE FROM "booking_requests" WHERE id = 'bkg08b_booking_partial'`,
      )
      await restorePaymentReportAllOrNoneConstraint(client)
    }

    // Case 10: hold expired and exact boundary.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_expired',
      publicCode: 'TUR-0808-108',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      holdAcquiredAt: new Date('2026-06-23T13:00:00.000Z'),
      holdExpiresAt: new Date('2026-06-23T14:00:00.000Z'),
    })
    const expired = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-108',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-108',
        paymentReportIdempotencyKey: 'PAYMENT_EXPIRED_108',
        now: new Date('2026-06-23T14:30:00.000Z'),
      }),
    )
    assert.equal(expired.result.ok, false)
    if (!expired.result.ok) {
      assert.equal(expired.result.stage, 'booking_eligibility')
    }
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_boundary',
      publicCode: 'TUR-0808-109',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      holdExpiresAt: new Date('2026-06-23T14:30:00.000Z'),
    })
    const boundary = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-109',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-109',
        paymentReportIdempotencyKey: 'PAYMENT_BOUNDARY_109',
        now: new Date('2026-06-23T14:30:00.000Z'),
      }),
    )
    assert.equal(boundary.result.ok, false)
    if (!boundary.result.ok) {
      assert.equal(boundary.result.stage, 'booking_eligibility')
    }

    // Case 11: same booking already has an active proof.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_same_proof',
      publicCode: 'TUR-0808-110',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    await insertActivePaymentProof(client, {
      id: 'bkg08b_proof_same_booking',
      bookingRequestId: 'bkg08b_booking_same_proof',
      blobPathname: 'payment-proofs/TUR-0808-110/existing.webp',
      sha256: makeHexFingerprint('samebooking'),
      reportedReference: 'PM-110',
      normalizedReference: 'PM110',
      duplicateStatus: 'same_booking',
    })
    const sameBookingProof = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-110',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-110',
        paymentReportIdempotencyKey: 'PAYMENT_SAME_PROOF_110',
        proofMetadata: makeProofMetadata('TUR-0808-110', 'pm110'),
      }),
    )
    assert.equal(sameBookingProof.result.ok, false)
    if (!sameBookingProof.result.ok) {
      assert.equal(sameBookingProof.result.stage, 'persistence')
      assert.equal(sameBookingProof.result.code, 'PAYMENT_PROOF_STATE_INVALID')
    }

    // Case 12: same sha256 in another booking -> other_booking.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_other_sha_seed',
      publicCode: 'TUR-0808-111',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      internalNotes: '[ops_status:payment_reported]',
      paymentMethod: 'pago_movil',
      paymentReference: 'PM-111',
      paymentNormalizedReference: 'PM111',
      paymentReportedAt: new Date('2026-06-23T14:15:00.000Z'),
      paymentExpectedTotalUsdSnapshot: 280,
      paymentReportIdempotencyKey: 'PAYMENT_OTHER_SHA_111',
      paymentReportFingerprint: 'c'.repeat(64),
    })
    await insertActivePaymentProof(client, {
      id: 'bkg08b_proof_other_sha_seed',
      bookingRequestId: 'bkg08b_booking_other_sha_seed',
      blobPathname: 'payment-proofs/TUR-0808-111/existing.webp',
      sha256: makeHexFingerprint('sharedsha'),
      reportedReference: 'PM-111',
      normalizedReference: 'PM111',
    })
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_other_sha_target',
      publicCode: 'TUR-0808-112',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const otherSha = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-112',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-112',
        paymentReportIdempotencyKey: 'PAYMENT_OTHER_SHA_112',
        proofMetadata: makeProofMetadata('TUR-0808-112', 'sharedsha', {
          sha256: makeHexFingerprint('sharedsha'),
        }),
      }),
    )
    assertPaymentStage(otherSha.result, 'reported', 'duplicate proof other booking')
    if (otherSha.result.ok && otherSha.result.stage === 'reported') {
      assert.equal(otherSha.result.duplicateStatus, 'other_booking')
    }

    // Case 13: efectivo with optional proof.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_cash_with_proof',
      publicCode: 'TUR-0808-113',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const cashWithProof = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-113',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-113',
        paymentReportIdempotencyKey: 'PAYMENT_CASH_PROOF_113',
        proofMetadata: makeProofMetadata('TUR-0808-113', 'cash113'),
      }),
    )
    assertPaymentStage(cashWithProof.result, 'reported', 'cash with optional proof')
    if (cashWithProof.result.ok && cashWithProof.result.stage === 'reported') {
      assert.ok(cashWithProof.result.paymentProofId)
    }

    // Case 14: duplicate blob pathname.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_blob_seed',
      publicCode: 'TUR-0808-114',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      internalNotes: '[ops_status:payment_reported]',
      paymentMethod: 'pago_movil',
      paymentReference: 'PM-114',
      paymentNormalizedReference: 'PM114',
      paymentReportedAt: new Date('2026-06-23T14:15:00.000Z'),
      paymentExpectedTotalUsdSnapshot: 280,
      paymentReportIdempotencyKey: 'PAYMENT_BLOB_SEED_114',
      paymentReportFingerprint: 'd'.repeat(64),
    })
    await insertActivePaymentProof(client, {
      id: 'bkg08b_proof_blob_seed',
      bookingRequestId: 'bkg08b_booking_blob_seed',
      blobPathname: 'payment-proofs/shared/blob-conflict.webp',
      sha256: makeHexFingerprint('blobconflict'),
      reportedReference: 'PM-114',
      normalizedReference: 'PM114',
    })
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_blob_target',
      publicCode: 'TUR-0808-115',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const blobConflict = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-115',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-115',
        paymentReportIdempotencyKey: 'PAYMENT_BLOB_TARGET_115',
        proofMetadata: makeProofMetadata('TUR-0808-115', 'blob-target', {
          blobPathname: 'payment-proofs/shared/blob-conflict.webp',
        }),
      }),
    )
    assert.equal(blobConflict.result.ok, false)
    if (!blobConflict.result.ok) {
      assert.equal(blobConflict.result.stage, 'persistence')
      assert.equal(blobConflict.result.code, 'PAYMENT_PROOF_PATH_CONFLICT')
    }

    // Case 15: update guard concurrent change via skipped update.
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08b_skip_payment_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.id = 'bkg08b_booking_skip_update' THEN
          RETURN NULL;
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      DROP TRIGGER IF EXISTS bkg08b_skip_payment_update_trigger ON "booking_requests";
      CREATE TRIGGER bkg08b_skip_payment_update_trigger
      BEFORE UPDATE ON "booking_requests"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08b_skip_payment_update();
    `)
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_skip_update',
      publicCode: 'TUR-0808-116',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const skippedUpdate = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-116',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-116',
        paymentReportIdempotencyKey: 'PAYMENT_SKIP_UPDATE_116',
      }),
    )
    assert.equal(skippedUpdate.result.ok, false)
    if (!skippedUpdate.result.ok) {
      assert.equal(skippedUpdate.result.stage, 'persistence')
      assert.equal(skippedUpdate.result.code, 'PAYMENT_REPORT_WRITE_CONFLICT')
    }
    await client.query(`DROP TRIGGER IF EXISTS bkg08b_skip_payment_update_trigger ON "booking_requests"`)
    await client.query(`DROP FUNCTION IF EXISTS bkg08b_skip_payment_update()`)

    // Case 16: audit failure rollback.
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08b_fail_payment_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW."bookingRequestId" = 'bkg08b_booking_audit_fail' THEN
          RAISE EXCEPTION 'simulated payment audit failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      DROP TRIGGER IF EXISTS bkg08b_fail_payment_audit_trigger ON "audit_log";
      CREATE TRIGGER bkg08b_fail_payment_audit_trigger
      BEFORE INSERT ON "audit_log"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08b_fail_payment_audit();
    `)
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_audit_fail',
      publicCode: 'TUR-0808-117',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const auditRollback = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-117',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-117',
        paymentReportIdempotencyKey: 'PAYMENT_AUDIT_FAIL_117',
        proofMetadata: makeProofMetadata('TUR-0808-117', 'pm117'),
      }),
    )
    assert.equal(auditRollback.result.ok, false)
    if (!auditRollback.result.ok) {
      assert.equal(auditRollback.result.stage, 'persistence')
      assert.equal(auditRollback.result.code, 'DATABASE_WRITE_FAILED')
    }
    const auditRollbackBooking = await fetchBooking(client, 'TUR-0808-117')
    assert.equal(auditRollbackBooking?.paymentMethod, null)
    assert.equal((await fetchActiveProofs(client, 'bkg08b_booking_audit_fail')).length, 0)
    assert.equal(await fetchAuditCount(client, 'bkg08b_booking_audit_fail'), 0)
    await client.query(`DROP TRIGGER IF EXISTS bkg08b_fail_payment_audit_trigger ON "audit_log"`)
    await client.query(`DROP FUNCTION IF EXISTS bkg08b_fail_payment_audit()`)

    // Case 17: retryable transaction.
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_retry',
      publicCode: 'TUR-0808-118',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
    })
    const retryResult = await runPayment(
      client,
      makePaymentInput({
        publicCode: 'TUR-0808-118',
        paymentMethod: 'efectivo',
        paymentReference: 'cash-118',
        paymentReportIdempotencyKey: 'PAYMENT_RETRY_118',
      }),
      {
        injectError: {
          pattern: /FROM "booking_requests"/i,
          error: Object.assign(new Error('serialization failure'), { code: '40001' }),
          remainingHits: 1,
        },
      },
    )
    assertPaymentStage(retryResult.result, 'reported', 'retryable transaction')
    assert.equal(retryResult.trace.filter((call) => /^BEGIN ISOLATION LEVEL READ COMMITTED/i.test(call.sql)).length, 2)

    // Case 18: payment wins expiration race.
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08b_delay_payment_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.id = 'bkg08b_booking_payment_wins' THEN
          PERFORM pg_sleep(1.5);
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      DROP TRIGGER IF EXISTS bkg08b_delay_payment_update_trigger ON "booking_requests";
      CREATE TRIGGER bkg08b_delay_payment_update_trigger
      BEFORE UPDATE ON "booking_requests"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08b_delay_payment_update();
    `)
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_payment_wins',
      publicCode: 'TUR-0808-119',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      holdExpiresAt: new Date('2026-06-23T14:20:00.000Z'),
    })
    concurrentClientA = new Client({ connectionString })
    concurrentClientB = new Client({ connectionString })
    await Promise.all([concurrentClientA.connect(), concurrentClientB.connect()])
    const paymentWinsPromise = runPayment(
      concurrentClientA,
      makePaymentInput({
        publicCode: 'TUR-0808-119',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-119',
        paymentReportIdempotencyKey: 'PAYMENT_WINS_119',
        proofMetadata: makeProofMetadata('TUR-0808-119', 'pm119'),
        now: new Date('2026-06-23T14:15:00.000Z'),
      }),
    )
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
    const expirationDuringPayment = await runExpiration(concurrentClientB, {
      now: new Date('2026-06-23T14:30:00.000Z'),
      batchSize: 10,
    })
    const paymentWins = await paymentWinsPromise
    assertPaymentStage(paymentWins.result, 'reported', 'payment wins expiration race')
    assert.equal(expirationDuringPayment.result.ok, true)
    if (expirationDuringPayment.result.ok) {
      assert.equal(expirationDuringPayment.result.expiredBookings.some((row) => row.publicCode === 'TUR-0808-119'), false)
    }
    const paymentWinsBooking = await fetchBooking(client, 'TUR-0808-119')
    assert.equal(paymentWinsBooking?.status, 'under_review')
    assert.equal(paymentWinsBooking?.internalNotes, '[ops_status:payment_reported]\nnota interna')
    const paymentWinsAuditRows = await queryRows<{ action: string }>(
      client,
      `SELECT action FROM "audit_log" WHERE "bookingRequestId" = $1 ORDER BY action ASC`,
      ['bkg08b_booking_payment_wins'],
    )
    assert.deepStrictEqual(
      paymentWinsAuditRows.map((row) => row.action),
      ['custom_bundle_payment_reported'],
    )
    await concurrentClientA.end().catch(() => {})
    await concurrentClientB.end().catch(() => {})
    concurrentClientA = null
    concurrentClientB = null
    await client.query(`DROP TRIGGER IF EXISTS bkg08b_delay_payment_update_trigger ON "booking_requests"`)
    await client.query(`DROP FUNCTION IF EXISTS bkg08b_delay_payment_update()`)

    // Case 19: expiration wins payment race.
    await client.query(`
      CREATE OR REPLACE FUNCTION bkg08b_delay_expiration_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.id = 'bkg08b_booking_expiration_wins' THEN
          PERFORM pg_sleep(1.5);
        END IF;
        RETURN NEW;
      END;
      $$;
    `)
    await client.query(`
      DROP TRIGGER IF EXISTS bkg08b_delay_expiration_update_trigger ON "booking_requests";
      CREATE TRIGGER bkg08b_delay_expiration_update_trigger
      BEFORE UPDATE ON "booking_requests"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08b_delay_expiration_update();
    `)
    await insertFixtureBooking(client, {
      id: 'bkg08b_booking_expiration_wins',
      publicCode: 'TUR-0808-120',
      serviceVariantId: catalog.variantId,
      resourceId: catalog.resourceId,
      holdExpiresAt: new Date('2026-06-23T14:20:00.000Z'),
    })
    concurrentClientA = new Client({ connectionString })
    concurrentClientB = new Client({ connectionString })
    await Promise.all([concurrentClientA.connect(), concurrentClientB.connect()])
    const expirationPromise = runExpiration(concurrentClientA, {
      now: new Date('2026-06-23T14:30:00.000Z'),
      batchSize: 10,
    })
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
    const paymentAfterExpirationLock = await runPayment(
      concurrentClientB,
      makePaymentInput({
        publicCode: 'TUR-0808-120',
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-120',
        paymentReportIdempotencyKey: 'PAYMENT_EXPIRE_WINS_120',
        proofMetadata: makeProofMetadata('TUR-0808-120', 'pm120'),
        now: new Date('2026-06-23T14:25:00.000Z'),
      }),
    )
    const expirationWins = await expirationPromise
    assert.equal(expirationWins.result.ok, true)
    assert.equal(paymentAfterExpirationLock.result.ok, false)
    if (!paymentAfterExpirationLock.result.ok) {
      assert.equal(paymentAfterExpirationLock.result.stage, 'booking_eligibility')
    }
    const expirationWinsBooking = await fetchBooking(client, 'TUR-0808-120')
    assert.equal(expirationWinsBooking?.status, 'rejected')
    assert.equal(expirationWinsBooking?.paymentMethod, null)
    assert.equal((await fetchActiveProofs(client, 'bkg08b_booking_expiration_wins')).length, 0)
    const expirationWinsAuditRows = await queryRows<{ action: string }>(
      client,
      `SELECT action FROM "audit_log" WHERE "bookingRequestId" = $1 ORDER BY action ASC`,
      ['bkg08b_booking_expiration_wins'],
    )
    assert.deepStrictEqual(
      expirationWinsAuditRows.map((row) => row.action),
      [CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION],
    )
    await concurrentClientA.end().catch(() => {})
    await concurrentClientB.end().catch(() => {})
    concurrentClientA = null
    concurrentClientB = null
    await client.query(`DROP TRIGGER IF EXISTS bkg08b_delay_expiration_update_trigger ON "booking_requests"`)
    await client.query(`DROP FUNCTION IF EXISTS bkg08b_delay_expiration_update()`)

    const cleanupCounts = await queryRows<{
      booking_count: string
      item_count: string
      proof_count: string
      audit_count: string
      service_count: string
      variant_count: string
      resource_count: string
    }>(
      client,
      `
        SELECT
          (SELECT COUNT(*)::text FROM "booking_requests" WHERE id LIKE 'bkg08b_%' OR "publicCode" LIKE 'TUR-0808-%') AS booking_count,
          (SELECT COUNT(*)::text FROM "booking_request_items" WHERE id LIKE 'bkg08b_%' OR "bookingRequestId" LIKE 'bkg08b_%') AS item_count,
          (SELECT COUNT(*)::text FROM "payment_proofs" WHERE id LIKE 'bkg08b_%' OR "bookingRequestId" LIKE 'bkg08b_%') AS proof_count,
          (SELECT COUNT(*)::text FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08b_%') AS audit_count,
          (SELECT COUNT(*)::text FROM "services" WHERE id LIKE 'bkg08b_%') AS service_count,
          (SELECT COUNT(*)::text FROM "service_variants" WHERE id LIKE 'bkg08b_%') AS variant_count,
          (SELECT COUNT(*)::text FROM "resources" WHERE id LIKE 'bkg08b_%') AS resource_count
      `,
    )
    assert.ok(Number(cleanupCounts[0]?.booking_count ?? 0) > 0)

    await cleanupFixtures(client)

    const afterCleanup = await queryRows<{
      booking_count: string
      item_count: string
      proof_count: string
      audit_count: string
      service_count: string
      variant_count: string
      resource_count: string
    }>(
      client,
      `
        SELECT
          (SELECT COUNT(*)::text FROM "booking_requests" WHERE id LIKE 'bkg08b_%' OR "publicCode" LIKE 'TUR-0808-%') AS booking_count,
          (SELECT COUNT(*)::text FROM "booking_request_items" WHERE id LIKE 'bkg08b_%' OR "bookingRequestId" LIKE 'bkg08b_%') AS item_count,
          (SELECT COUNT(*)::text FROM "payment_proofs" WHERE id LIKE 'bkg08b_%' OR "bookingRequestId" LIKE 'bkg08b_%') AS proof_count,
          (SELECT COUNT(*)::text FROM "audit_log" WHERE "bookingRequestId" LIKE 'bkg08b_%') AS audit_count,
          (SELECT COUNT(*)::text FROM "services" WHERE id LIKE 'bkg08b_%') AS service_count,
          (SELECT COUNT(*)::text FROM "service_variants" WHERE id LIKE 'bkg08b_%') AS variant_count,
          (SELECT COUNT(*)::text FROM "resources" WHERE id LIKE 'bkg08b_%') AS resource_count
      `,
    )
    assert.equal(Number(afterCleanup[0]?.booking_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.item_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.proof_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.audit_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.service_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.variant_count ?? 0), 0)
    assert.equal(Number(afterCleanup[0]?.resource_count ?? 0), 0)

    console.log('booking_isolated_custom_bundle_payment_reporting OK')
    console.log('manual payment methods: verified')
    console.log('proof policy: verified')
    console.log('authoritative total snapshot: verified')
    console.log('payment row lock: verified')
    console.log('payment reported state: verified')
    console.log('payment proof persisted: verified')
    console.log('exact replay idempotency: verified')
    console.log('global idempotency key: verified')
    console.log('duplicate proof classification: verified')
    console.log('payment wins expiration race: verified')
    console.log('expiration wins payment race: verified')
    console.log('total rollback: verified')
    console.log('resource history preserved: verified')
    console.log('cleanup: verified')
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    await cleanupFixtures(client).catch(() => {})
    if (concurrentClientA) {
      await concurrentClientA.end().catch(() => {})
    }
    if (concurrentClientB) {
      await concurrentClientB.end().catch(() => {})
    }
    await client.end().catch(() => {})
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
