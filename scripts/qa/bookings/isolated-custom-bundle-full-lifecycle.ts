import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL, pathToFileURL } from 'node:url'

import { Client } from 'pg'

import {
  acquireCustomBundleHoldWithSql,
  type AcquireCustomBundleHoldInput,
} from '@/lib/bookings/custom-bundle-hold-acquisition'
import {
  CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
  expireCustomBundleHoldsWithSql,
  type CustomBundleHoldExpirationServerContext,
} from '@/lib/bookings/custom-bundle-hold-expiration'
import {
  buildCustomBundlePaymentProofPrivatePathname,
  uploadCustomBundlePaymentProofToPrivateStore,
  type CustomBundlePaymentProofBoundaryContext,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobObject,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  runCustomBundlePaymentReceiptEntrypointCore,
  type CustomBundlePaymentReceiptEntrypointDependencies,
  type CustomBundlePaymentReceiptEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'
import {
  buildCustomBundlePaymentServerIdempotencyKey,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import {
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadReceipt,
  type CustomBundlePaymentUploadReceiptPayload,
} from '@/lib/bookings/custom-bundle-payment-upload-token'
import {
  buildPaymentRecoveryToken,
  validatePaymentRecoveryToken,
} from '@/lib/bookings/payment-recovery-token'
import {
  normalizeCustomBundlePaymentReference,
  type CustomBundlePaymentReportSubmission,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'
import { CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION } from '@/lib/bookings/custom-bundle-payment-reporting'

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

const BKG08_SQL_PATTERNS = [
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

type BookingRequestRow = {
  id: string
  publicCode: string
  status: string
  internalNotes: string | null
  bookingMode: string | null
  pricingSource: string | null
  estimatedTotal: string | number | null
  currency: string
  eventDate: Date | null
  eventEndDate: Date | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
  paymentMethod: string | null
  paymentReference: string | null
  paymentNormalizedReference: string | null
  paymentReportedAt: Date | null
  paymentExpectedTotalUsdSnapshot: string | number | null
  paymentReportIdempotencyKey: string | null
  paymentReportFingerprint: string | null
}

type BookingRequestItemRow = {
  id: string
  bookingRequestId: string
  itemSlug: string | null
  itemName: string | null
  itemKind: string | null
  serviceVariantId: string | null
  resourceId: string | null
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number | null
  unitPriceUsdSnapshot: string | number | null
  lineTotalUsdSnapshot: string | number | null
  clientPriceDisplay: string | null
}

type AuditLogRow = {
  id: string
  bookingRequestId: string
  action: string
}

type PaymentProofRow = {
  id: string
  bookingRequestId: string
  blobPathname: string
  sha256: string
  mimeType: string
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
  reportedReference: string | null
  normalizedReference: string | null
  duplicateStatus: string
  isActive: boolean
}

type PersistedRecoverySnapshot = {
  publicCode: string
  amountUsd: number
  durationMinutes: number
  paymentDeadlineIso: string
}

type TracingSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

type SessionTrace = {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

type SessionFault = {
  pattern: RegExp
  message: string
  fired: boolean
}

type ReceiptSessionInstrumentation = {
  openedSessions: number
  closedSessions: number
  sessionTraces: SessionTrace[]
}

type DomainIds = {
  serviceIds: Record<string, string>
  variantIds: Record<string, string>
  resourceIds: Record<string, string>
}

type MemoryStore = CustomBundlePrivateBlobStore & {
  calls: {
    head: Array<{ pathname: string }>
    put: Array<{ pathname: string; bodyBytes: number; contentType: string }>
    delete: Array<{ pathname: string }>
  }
  objects: Map<string, CustomBundlePrivateBlobObject>
  seedObject(object: CustomBundlePrivateBlobObject): void
  hasObject(pathname: string): boolean
}

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_full_lifecycle FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
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

function assertSqlPatterns(sql: string, label: string, patterns: readonly RegExp[]): void {
  for (const pattern of patterns) {
    assert.ok(pattern.test(sql), `${label} is missing the expected pattern: ${pattern}.`)
  }
}

function assertMoneyValue(
  value: string | number | null | undefined,
  expected: number,
  label: string,
): void {
  const numeric = typeof value === 'string' ? Number(value) : value
  assert.equal(numeric, expected, label)
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function makeHexFingerprint(seed: string): string {
  return createHash('sha256').update(seed).digest('hex')
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}

function makeBytes(kind: 'png' | 'jpeg' | 'webp' | 'avif'): Uint8Array {
  switch (kind) {
    case 'jpeg':
      return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
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
    case 'png':
    default:
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
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
    arrayBufferCalls: calls,
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
  }
}

function makeMixedSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Lifecycle canonical bundle  ',
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

function makeRoomOnlySubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '12:00',
    extrasNotes: '  Sala canonica  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [{ itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null }],
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

function makeNoPhysicalSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '14:00',
    extrasNotes: '  Sin recurso fisico  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: 60 },
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

function makeReplayParitySubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '16:00',
    extrasNotes: '  Replay parity  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [{ itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null }],
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

function makeExactBoundarySubmission(): CustomBundleSubmissionInputV1 {
  return makeRoomOnlySubmission({
    startTime: '12:00',
    eventDate: '2026-06-24',
    extrasNotes: '  Exact boundary  ',
  })
}

function buildPersistedRecoverySnapshot(input: BookingRequestRow): PersistedRecoverySnapshot {
  assert.ok(input.holdAcquiredAt instanceof Date)
  assert.ok(input.holdExpiresAt instanceof Date)
  assert.ok(input.eventDate instanceof Date)
  assert.ok(input.eventEndDate instanceof Date)

  return {
    publicCode: input.publicCode,
    amountUsd: Number(input.estimatedTotal),
    durationMinutes: Math.round((input.eventEndDate.getTime() - input.eventDate.getTime()) / 60000),
    paymentDeadlineIso: input.holdExpiresAt.toISOString(),
  }
}

async function insertLegacyBookingFixture(client: Client): Promise<{
  bookingRequestId: string
  bookingRequestItemId: string
}> {
  const bookingRequestId = 'bkg08j_legacy_booking'
  const bookingRequestItemId = 'bkg08j_legacy_booking_item'
  await client.query(
    `
      INSERT INTO "booking_requests" (
        "id",
        "publicCode",
        "status",
        "priorityLevel",
        "source",
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "eventDate",
        "eventEndDate",
        "notes",
        "internalNotes",
        "estimatedTotal",
        "currency",
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
        $1,
        $2,
        'under_review',
        'normal',
        'web',
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        0,
        'USD',
        $11,
        'single',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        NOW(),
        NOW()
      )
    `,
    [
      bookingRequestId,
      'TUR-0808-899',
      'Legacy booking',
      'legacy@example.com',
      '+58 000-000-0000',
      'Legacy booking',
      new Date('2026-06-24T08:00:00.000Z'),
      new Date('2026-06-24T09:00:00.000Z'),
      'Legacy note',
      'legacy conocida',
      new Date('2026-06-24T08:00:00.000Z'),
    ],
  )

  await client.query(
    `
      INSERT INTO "booking_request_items" (
        "id",
        "bookingRequestId",
        "serviceVariantId",
        "resourceId",
        "itemSlug",
        "itemName",
        "itemKind",
        "quantity",
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay",
        "notes",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1,
        $2,
        null,
        null,
        null,
        null,
        null,
        1,
        null,
        null,
        null,
        null,
        null,
        null,
        NOW(),
        NOW()
      )
    `,
    [bookingRequestItemId, bookingRequestId],
  )

  return {
    bookingRequestId,
    bookingRequestItemId,
  }
}

function buildHoldContext(input: {
  publicCode: string
  idempotencyKey: string
  now: Date
  holdDurationMinutes?: number
}): AcquireCustomBundleHoldInput['serverContext'] {
  return {
    publicCode: input.publicCode,
    idempotencyKey: input.idempotencyKey,
    now: new Date(input.now.getTime()),
    holdDurationMinutes: input.holdDurationMinutes ?? 60,
  }
}

function buildPaymentSubmission(input: {
  publicCode: string
  paymentMethod: CustomBundlePaymentReportSubmission['paymentMethod']
  paymentReference: string
}): CustomBundlePaymentReportSubmission {
  return {
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
  }
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

async function queryRows<Row = Record<string, unknown>>(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await client.query<Row>(sql, [...values])
  return result.rows
}

async function assertSchemaShape(client: Client): Promise<void> {
  const columns = await queryRows<{
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
        AND table_name IN ('booking_requests', 'booking_request_items')
        AND column_name IN (
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
          'itemSlug',
          'itemName',
          'itemKind',
          'serviceVariantId',
          'resourceId',
          'sessionDurationMinutes',
          'durationMinutes',
          'unitPriceUsdSnapshot',
          'lineTotalUsdSnapshot',
          'clientPriceDisplay'
        )
      ORDER BY table_name, column_name
    `,
  )

  const columnMap = new Map(columns.map((row) => [`${row.table_name}.${row.column_name}`, row]))
  const expectations: Array<{
    key: string
    nullable: 'YES' | 'NO'
    defaultValue: RegExp | null
  }> = [
    { key: 'booking_requests.bookingMode', nullable: 'NO', defaultValue: /single/i },
    { key: 'booking_requests.pricingSource', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.idempotencyKey', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.requestFingerprint', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.holdAcquiredAt', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.holdExpiresAt', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentMethod', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentReference', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentNormalizedReference', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentReportedAt', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentExpectedTotalUsdSnapshot', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentReportIdempotencyKey', nullable: 'YES', defaultValue: null },
    { key: 'booking_requests.paymentReportFingerprint', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.itemSlug', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.itemName', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.itemKind', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.serviceVariantId', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.resourceId', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.sessionDurationMinutes', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.durationMinutes', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.unitPriceUsdSnapshot', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.lineTotalUsdSnapshot', nullable: 'YES', defaultValue: null },
    { key: 'booking_request_items.clientPriceDisplay', nullable: 'YES', defaultValue: null },
  ]

  for (const expectation of expectations) {
    const column = columnMap.get(expectation.key)
    assert.ok(column, `Missing expected column: ${expectation.key}`)
    assert.equal(column?.is_nullable, expectation.nullable, `${expectation.key} nullability`)
    if (expectation.defaultValue) {
      assert.match(column?.column_default ?? '', expectation.defaultValue, `${expectation.key} default`)
    } else {
      assert.equal(column?.column_default, null, `${expectation.key} should not have a default`)
    }
  }

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
    'booking_requests_payment_report_all_or_none_chk',
    'booking_requests_payment_method_chk',
    'booking_requests_payment_reference_format_chk',
    'booking_requests_payment_normalized_reference_format_chk',
    'booking_requests_payment_report_idempotency_key_format_chk',
    'booking_requests_payment_report_fingerprint_format_chk',
    'booking_requests_payment_expected_total_chk',
    'booking_requests_payment_report_hold_window_chk',
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
  for (const name of [
    'booking_requests_idempotency_key_uniq',
    'booking_requests_hold_expires_at_idx',
    'booking_requests_payment_report_idempotency_key_uniq',
    'booking_requests_payment_reported_at_idx',
    'booking_requests_payment_normalized_reference_idx',
  ]) {
    assert.ok(indexMap.has(name), `Missing index: ${name}`)
  }
  assert.match(indexMap.get('booking_requests_payment_report_idempotency_key_uniq') ?? '', /WHERE .*"paymentReportIdempotencyKey" IS NOT NULL/i)
  assert.match(indexMap.get('booking_requests_payment_reported_at_idx') ?? '', /WHERE .*"paymentReportedAt" IS NOT NULL/i)
  assert.match(indexMap.get('booking_requests_payment_normalized_reference_idx') ?? '', /WHERE .*"paymentNormalizedReference" IS NOT NULL/i)
}

async function seedCatalog(client: Client): Promise<DomainIds> {
  const services = [
    { id: 'bkg08j_service_sala', slug: 'sala-ensayo', name: 'Sala de ensayo' },
    { id: 'bkg08j_service_grabacion', slug: 'grabacion', name: 'Grabacion' },
    { id: 'bkg08j_service_mezcla', slug: 'mezcla-masterizacion', name: 'Mezcla / masterizacion' },
    { id: 'bkg08j_service_podcast', slug: 'podcast-locucion', name: 'Podcast / locucion' },
    { id: 'bkg08j_service_video', slug: 'video-session', name: 'Video Session' },
    { id: 'bkg08j_service_consultoria', slug: 'consultoria', name: 'Consultoria' },
  ]

  const variants = [
    {
      id: 'bkg08j_variant_sala_flexible',
      slug: 'sala-ensayo-flexible',
      name: 'Sala Flexible',
      serviceId: 'bkg08j_service_sala',
    },
    {
      id: 'bkg08j_variant_sala_premium',
      slug: 'sala-ensayo-premium',
      name: 'Sala Premium',
      serviceId: 'bkg08j_service_sala',
    },
    {
      id: 'bkg08j_variant_sala_prioritaria',
      slug: 'sala-ensayo-prioritaria',
      name: 'Sala Prioritaria',
      serviceId: 'bkg08j_service_sala',
    },
    {
      id: 'bkg08j_variant_grabacion_ensayo',
      slug: 'grabacion-ensayo',
      name: 'Grabacion en ensayo',
      serviceId: 'bkg08j_service_grabacion',
    },
    {
      id: 'bkg08j_variant_grabacion_estudio',
      slug: 'grabacion-hora-estudio',
      name: 'Grabacion en estudio',
      serviceId: 'bkg08j_service_grabacion',
    },
    {
      id: 'bkg08j_variant_podcast',
      slug: 'podcast-por-episodio',
      name: 'Podcast',
      serviceId: 'bkg08j_service_podcast',
    },
    {
      id: 'bkg08j_variant_locucion',
      slug: 'locucion-por-hora',
      name: 'Locucion',
      serviceId: 'bkg08j_service_podcast',
    },
    {
      id: 'bkg08j_variant_mezcla',
      slug: 'mezcla-por-tema',
      name: 'Mezcla por tema',
      serviceId: 'bkg08j_service_mezcla',
    },
    {
      id: 'bkg08j_variant_master',
      slug: 'master-por-tema',
      name: 'Master por tema',
      serviceId: 'bkg08j_service_mezcla',
    },
    {
      id: 'bkg08j_variant_studio_session',
      slug: 'studio-session-fija',
      name: 'Studio Session',
      serviceId: 'bkg08j_service_video',
    },
    {
      id: 'bkg08j_variant_consultoria',
      slug: 'consultoria-produccion',
      name: 'Clase / consultoria de produccion',
      serviceId: 'bkg08j_service_consultoria',
    },
  ]

  const resources = [
    { id: 'bkg08j_resource_sala_1', slug: 'sala-1-grande', name: 'Sala 1 Grande' },
    { id: 'bkg08j_resource_sala_2', slug: 'sala-2-podcast-locucion', name: 'Sala 2 Podcast / Locucion' },
    { id: 'bkg08j_resource_sala_3', slug: 'sala-3-ensayo', name: 'Sala 3 Ensayo' },
  ]

  for (const service of services) {
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
      [service.id, service.slug, service.name, `${service.name} de prueba`],
    )
  }

  for (const variant of variants) {
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
      [variant.id, variant.slug, variant.name, `${variant.name} de prueba`, variant.serviceId],
    )
  }

  for (const resource of resources) {
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
      [resource.id, resource.slug, resource.name, `${resource.name} de prueba`],
    )
  }

  return {
    serviceIds: services.reduce<Record<string, string>>((accumulator, service) => {
      accumulator[service.slug] = service.id
      return accumulator
    }, {}),
    variantIds: variants.reduce<Record<string, string>>((accumulator, variant) => {
      accumulator[variant.slug] = variant.id
      return accumulator
    }, {}),
    resourceIds: resources.reduce<Record<string, string>>((accumulator, resource) => {
      accumulator[resource.slug] = resource.id
      return accumulator
    }, {}),
  }
}

function makeSession(
  client: Client,
  options?: {
    trace?: SessionTrace
    fault?: SessionFault
  },
): CustomBundleSqlSession {
  return makeInstrumentedSession(client, options)
}

function makeInstrumentedSession(
  client: Client,
  options: {
    trace?: SessionTrace
    fault?: SessionFault
  } = {},
): CustomBundleSqlSession {
  return {
    transactionScope: 'single_connection' as const,
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      options.trace?.calls.push({ sql, params: [...params] })
      if (options.fault && !options.fault.fired && options.fault.pattern.test(sql)) {
        options.fault.fired = true
        throw new Error(options.fault.message)
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

async function openLocalCustomBundlePaymentPgSession(
  connectionString: string,
  instrumentation?: ReceiptSessionInstrumentation,
): Promise<{
  session: CustomBundleSqlSession
  close(): Promise<void>
}> {
  const client = new Client({ connectionString })
  await client.connect()

  let closed = false
  const trace: SessionTrace = { calls: [] }
  if (instrumentation) {
    instrumentation.openedSessions += 1
    instrumentation.sessionTraces.push(trace)
  }
  return {
    session: makeInstrumentedSession(client, { trace }),
    async close(): Promise<void> {
      if (closed) {
        return
      }

      closed = true
      await client.end()
      if (instrumentation) {
        instrumentation.closedSessions += 1
      }
    },
  }
}

function makeMemoryStore(): MemoryStore {
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{ pathname: string; bodyBytes: number; contentType: string }>,
    delete: [] as Array<{ pathname: string }>,
  }
  const objects = new Map<string, CustomBundlePrivateBlobObject>()

  return {
    calls,
    objects,
    seedObject(object: CustomBundlePrivateBlobObject): void {
      objects.set(object.pathname, deepClone(object))
    },
    hasObject(pathname: string): boolean {
      return objects.has(pathname)
    },
    async headPrivate(pathname: string) {
      calls.head.push({ pathname })
      const object = objects.get(pathname)
      return object ? deepClone(object) : null
    },
    async putPrivate(input) {
      calls.put.push({
        pathname: input.pathname,
        bodyBytes: input.body.byteLength,
        contentType: input.contentType,
      })

      const object = {
        pathname: input.pathname,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        uploadedAt: new Date('2026-06-24T10:05:00.000Z'),
        access: 'private' as const,
      }
      objects.set(input.pathname, deepClone(object))
      return deepClone(object)
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
      objects.delete(pathname)
    },
  }
}

function makeReceiptEntrypointDependencies(
  connectionString: string,
  store: MemoryStore,
  now: Date,
  instrumentation?: ReceiptSessionInstrumentation,
): CustomBundlePaymentReceiptEntrypointDependencies {
  return {
    runtime: 'isolated_test',
    clock: {
      now(): Date {
        return new Date(now.getTime())
      },
    },
    validateUploadReceipt(receipt, expectedPublicCode, now) {
      return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, now)
    },
    async openSqlSession() {
      return openLocalCustomBundlePaymentPgSession(connectionString, instrumentation)
    },
    async createPrivateBlobStore() {
      return store
    },
  }
}

async function readBookingRows(
  client: Client,
  publicCode: string,
): Promise<Array<BookingRequestRow>> {
  return queryRows<BookingRequestRow>(
    client,
    `
      SELECT
        id,
        "publicCode",
        status,
        "internalNotes",
        "bookingMode",
        "pricingSource",
        "estimatedTotal",
        currency,
        "eventDate",
        "eventEndDate",
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
}

async function readBookingItems(
  client: Client,
  bookingRequestId: string,
): Promise<Array<BookingRequestItemRow>> {
  return queryRows<BookingRequestItemRow>(
    client,
    `
      SELECT
        id,
        "bookingRequestId",
        "itemSlug",
        "itemName",
        "itemKind",
        "serviceVariantId",
        "resourceId",
        quantity,
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      ORDER BY id ASC
    `,
    [bookingRequestId],
  )
}

async function readAuditRows(
  client: Client,
  bookingRequestId: string,
): Promise<Array<AuditLogRow>> {
  return queryRows<AuditLogRow>(
    client,
    `
      SELECT id, "bookingRequestId", action
      FROM "audit_log"
      WHERE "bookingRequestId" = $1
      ORDER BY "createdAt" ASC, id ASC
    `,
    [bookingRequestId],
  )
}

async function readActiveProofRows(
  client: Client,
  bookingRequestId: string,
): Promise<Array<PaymentProofRow>> {
  return queryRows<PaymentProofRow>(
    client,
    `
      SELECT
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
      FROM "payment_proofs"
      WHERE "bookingRequestId" = $1
        AND "isActive" = true
      ORDER BY "uploadedAt" ASC, id ASC
    `,
    [bookingRequestId],
  )
}

function assertHoldAcquisitionSuccess(
  result: Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>,
  label: string,
): asserts result is Extract<Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>, { ok: true }> {
  assert.equal(result.ok, true, `${label}: ${JSON.stringify(result)}`)
}

function assertPaymentReceiptSuccess(
  result: CustomBundlePaymentReceiptEntrypointResult,
  stage: 'reported' | 'replayed',
  label: string,
): void {
  assert.equal(result.ok, true, `${label}: ${JSON.stringify(result)}`)
  if (result.ok) {
    assert.equal(result.stage, stage, `${label}: ${JSON.stringify(result)}`)
  }
}

async function cleanupFixtures(client: Client, store: MemoryStore): Promise<void> {
  const publicCodeRows = [
    'TUR-0808-801',
    'TUR-0808-802',
    'TUR-0808-803',
    'TUR-0808-804',
    'TUR-0808-805',
    'TUR-0808-806',
    'TUR-0808-807',
    'TUR-0808-808',
    'TUR-0808-809',
    'TUR-0808-810',
    'TUR-0808-811',
    'TUR-0808-812',
    'TUR-0808-813',
    'TUR-0808-814',
    'TUR-0808-815',
    'TUR-0808-899',
  ]

  await client.query(
    `
      DELETE FROM "audit_log"
      WHERE "bookingRequestId" IN (
        SELECT id FROM "booking_requests" WHERE "publicCode" = ANY($1::text[])
      )
    `,
    [publicCodeRows],
  ).catch(() => {})
  await client.query(
    `
      DELETE FROM "payment_proofs"
      WHERE "bookingRequestId" IN (
        SELECT id FROM "booking_requests" WHERE "publicCode" = ANY($1::text[])
      )
    `,
    [publicCodeRows],
  ).catch(() => {})
  await client.query(
    `
      DELETE FROM "booking_request_items"
      WHERE "bookingRequestId" IN (
        SELECT id FROM "booking_requests" WHERE "publicCode" = ANY($1::text[])
      )
    `,
    [publicCodeRows],
  ).catch(() => {})
  await client.query(`DELETE FROM "booking_requests" WHERE "publicCode" = ANY($1::text[])`, [publicCodeRows]).catch(() => {})
  await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg08j_resource_%'`).catch(() => {})
  await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg08j_variant_%'`).catch(() => {})
  await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg08j_service_%'`).catch(() => {})
  store.objects.clear()
}

async function installAuditFailureTrigger(client: Client, bookingRequestId: string): Promise<void> {
  const triggerArgument = bookingRequestId.replace(/'/g, "''")
  await client.query(
    `
      CREATE OR REPLACE FUNCTION bkg08j_fail_payment_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW."bookingRequestId" = TG_ARGV[0] THEN
          RAISE EXCEPTION 'simulated payment audit failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `,
  )
  await client.query(`DROP TRIGGER IF EXISTS bkg08j_fail_payment_audit_trigger ON "audit_log"`)
  await client.query(
    `
      CREATE TRIGGER bkg08j_fail_payment_audit_trigger
      BEFORE INSERT ON "audit_log"
      FOR EACH ROW
      EXECUTE FUNCTION bkg08j_fail_payment_audit('${triggerArgument}')
    `,
  )
}

async function removeAuditFailureTrigger(client: Client): Promise<void> {
  await client.query(`DROP TRIGGER IF EXISTS bkg08j_fail_payment_audit_trigger ON "audit_log"`).catch(() => {})
  await client.query(`DROP FUNCTION IF EXISTS bkg08j_fail_payment_audit()`).catch(() => {})
}

async function runPaymentReceipt(
  connectionString: string,
  store: MemoryStore,
  input: {
    submission: CustomBundlePaymentReportSubmission
    uploadReceipt: string | null
  },
  now: Date,
  instrumentation?: ReceiptSessionInstrumentation,
): Promise<CustomBundlePaymentReceiptEntrypointResult> {
  const dependencies = makeReceiptEntrypointDependencies(connectionString, store, now, instrumentation)
  return runCustomBundlePaymentReceiptEntrypointCore(dependencies, input)
}

function makeReceiptPayload(input: {
  publicCode: string
  paymentMethod: CustomBundlePaymentReportSubmission['paymentMethod']
  paymentReference: string
  paymentReportIdempotencyKey: string
  blobPathname: string
  sha256: string
  mimeType: CustomBundleTrustedPaymentProofMetadata['mimeType']
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
  createdByThisCall: boolean
  now: Date
  expiresAt?: Date
}): string | null {
  return buildCustomBundlePaymentUploadReceipt({
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod,
    normalizedReference: normalizeCustomBundlePaymentReference(input.paymentReference),
    paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
    blobPathname: input.blobPathname,
    sha256: input.sha256,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    originalFilename: input.originalFilename,
    uploadedAt: input.uploadedAt,
    createdByThisCall: input.createdByThisCall,
    now: input.now,
    expiresAt: input.expiresAt,
  })
}

function assertPrintedLineSet(label: string, lines: string[]): void {
  console.log(label)
  for (const line of lines) {
    console.log(line)
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
  assertSqlPatterns(bkg04Sql, 'BKG-04 SQL', BKG04_SQL_PATTERNS)
  assertSqlPatterns(bkg07Sql, 'BKG-07 SQL', BKG07_SQL_PATTERNS)
  assertSqlPatterns(bkg08Sql, 'BKG-08 SQL', BKG08_SQL_PATTERNS)

  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'full-lifecycle-secret' },
    async () => {
      const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
      assert.equal(process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS, EXPECTED_OPT_IN)

      const client = new Client({ connectionString })
      const store = makeMemoryStore()

      const paymentPublicCode = 'TUR-0808-801'
      const paymentSubmission = buildPaymentSubmission({
        publicCode: paymentPublicCode,
        paymentMethod: 'pago_movil',
        paymentReference: 'PM-0808-801',
      })
      const paymentIdempotencyResult = buildCustomBundlePaymentServerIdempotencyKey({
        submission: paymentSubmission,
        paymentProofFile: null,
      })
      if (!paymentIdempotencyResult.ok) {
        fail('Unable to derive the server idempotency key for the lifecycle payment submission.')
      }

      let paidBookingRequestId = ''
      let boundaryBookingRequestId = ''
      let rollbackOwnedBookingRequestId = ''
      let rollbackReusedBookingRequestId = ''
      const lifecyclePublicCodes = [
        'TUR-0808-801',
        'TUR-0808-802',
        'TUR-0808-803',
        'TUR-0808-804',
        'TUR-0808-805',
        'TUR-0808-806',
        'TUR-0808-807',
        'TUR-0808-808',
        'TUR-0808-809',
        'TUR-0808-810',
        'TUR-0808-811',
        'TUR-0808-812',
        'TUR-0808-813',
        'TUR-0808-814',
        'TUR-0808-815',
        'TUR-0808-899',
      ]

      try {
        await client.connect()

        await client.query('DROP SCHEMA IF EXISTS public CASCADE')
        await client.query('CREATE SCHEMA public')
        await client.query(baselineSql)
        await client.query(bkg04Sql)
        await client.query(bkg07Sql)
        await client.query(bkg08Sql)

        await assertSchemaShape(client)

        const catalog = await seedCatalog(client)
        assert.ok(catalog.resourceIds['sala-1-grande'])
        assert.ok(catalog.resourceIds['sala-2-podcast-locucion'])
        assert.ok(catalog.resourceIds['sala-3-ensayo'])

        const mixedSubmission = makeMixedSubmission()
        const mixedContext = buildHoldContext({
          publicCode: paymentPublicCode,
          idempotencyKey: 'HOLD_2026:06:24-0801',
          now: new Date('2026-06-24T10:00:00.000Z'),
          holdDurationMinutes: 60,
        })

        const mixedResult = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(mixedSubmission),
          serverContext: { ...mixedContext },
        })
        assertHoldAcquisitionSuccess(mixedResult, 'mixed lifecycle acquisition')
        assert.equal(mixedResult.stage, 'acquired')
        assert.equal(mixedResult.replayed, false)
        assert.equal(mixedResult.publicCode, paymentPublicCode)
        assert.ok(mixedResult.bookingRequestId)
        paidBookingRequestId = mixedResult.bookingRequestId

        const mixedReplay = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(mixedSubmission),
          serverContext: { ...mixedContext },
        })
        assertHoldAcquisitionSuccess(mixedReplay, 'mixed lifecycle replay')
        assert.equal(mixedReplay.stage, 'replayed')
        assert.equal(mixedReplay.replayed, true)
        assert.equal(mixedReplay.bookingRequestId, mixedResult.bookingRequestId)

        const collisionSeed = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(
            makeRoomOnlySubmission({
              startTime: '12:00',
              extrasNotes: '  Colision semilla  ',
            }),
          ),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-802',
            idempotencyKey: 'HOLD_2026:06:24-0802',
            now: new Date('2026-06-24T10:00:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assertHoldAcquisitionSuccess(collisionSeed, 'collision seed')
        assert.equal(collisionSeed.stage, 'acquired')

        const collisionResult = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(
            makeRoomOnlySubmission({
              startTime: '12:30',
              extrasNotes: '  Colision activa  ',
            }),
          ),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-803',
            idempotencyKey: 'HOLD_2026:06:24-0803',
            now: new Date('2026-06-24T10:05:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assert.equal(collisionResult.ok, false)
        if (!collisionResult.ok) {
          assert.equal(collisionResult.stage, 'collision')
        }

        const legacyFixture = await insertLegacyBookingFixture(client)
        const legacyRowsBefore = await readBookingRows(client, 'TUR-0808-899')
        assert.equal(legacyRowsBefore.length, 1)
        const legacyRowBefore = legacyRowsBefore[0]
        assert.equal(legacyRowBefore.id, legacyFixture.bookingRequestId)
        assert.equal(legacyRowBefore.bookingMode, 'single')
        assert.equal(legacyRowBefore.internalNotes, 'legacy conocida')
        assert.equal(legacyRowBefore.paymentMethod, null)
        assert.equal(legacyRowBefore.paymentReference, null)
        assert.equal(legacyRowBefore.paymentNormalizedReference, null)
        assert.equal(legacyRowBefore.paymentReportedAt, null)
        assert.equal(legacyRowBefore.paymentExpectedTotalUsdSnapshot, null)
        assert.equal(legacyRowBefore.paymentReportIdempotencyKey, null)
        assert.equal(legacyRowBefore.paymentReportFingerprint, null)
        assert.equal((await readBookingItems(client, legacyFixture.bookingRequestId)).length, 1)
        assert.equal((await readAuditRows(client, legacyFixture.bookingRequestId)).length, 0)

        const bookingRows = await readBookingRows(client, paymentPublicCode)
        assert.equal(bookingRows.length, 1)
        const bookingRow = bookingRows[0]
        assert.equal(bookingRow.status, 'under_review')
        assert.equal(bookingRow.bookingMode, 'custom_bundle')
        assert.equal(bookingRow.pricingSource, 'server_catalog_v1')
        assert.equal(bookingRow.internalNotes, '[ops_status:pending_payment]')
        assert.equal(bookingRow.currency, 'USD')
        assert.ok(bookingRow.holdAcquiredAt)
        assert.ok(bookingRow.holdExpiresAt)
        assert.ok(bookingRow.eventDate)
        assert.ok(bookingRow.eventEndDate)
        assert.equal(bookingRow.paymentMethod, null)
        assert.equal(bookingRow.paymentReference, null)
        assert.equal(bookingRow.paymentNormalizedReference, null)
        assert.equal(bookingRow.paymentReportedAt, null)
        assert.equal(bookingRow.paymentExpectedTotalUsdSnapshot, null)
        assert.equal(bookingRow.paymentReportIdempotencyKey, null)
        assert.equal(bookingRow.paymentReportFingerprint, null)

        const mixedItems = await readBookingItems(client, bookingRow.id)
        assert.ok(mixedItems.length > 0)
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'sala-premium' && item.resourceId !== null),
          true,
        )
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'studio-session' && item.resourceId === null),
          true,
        )
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'consultoria-produccion' && item.resourceId === null),
          true,
        )
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'podcast' && item.resourceId !== null),
          true,
        )
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'combo-percusion'),
          true,
        )
        assert.equal(
          mixedItems.some((item) => item.itemSlug === 'grabaciones-voces'),
          true,
        )
        assert.equal(
          mixedItems.filter((item) => item.resourceId !== null).length > 0,
          true,
        )
        assert.equal(
          mixedItems.filter((item) => item.resourceId === null).length > 0,
          true,
        )

        const persistedRecoverySnapshot = buildPersistedRecoverySnapshot(bookingRow)
        assert.equal(persistedRecoverySnapshot.publicCode, paymentPublicCode)
        assert.equal(persistedRecoverySnapshot.amountUsd, Number(bookingRow.estimatedTotal))
        assert.equal(persistedRecoverySnapshot.durationMinutes, mixedResult.totalDurationMinutes)
        assert.equal(
          persistedRecoverySnapshot.paymentDeadlineIso,
          bookingRow.holdExpiresAt!.toISOString(),
        )

        const paymentNow = new Date(bookingRow.holdExpiresAt!.getTime() - 1)
        const paymentRecoveryToken = buildPaymentRecoveryToken({
          bookingPublicCode: bookingRow.publicCode,
          now: paymentNow,
          expiresAt: bookingRow.holdExpiresAt!,
        })
        if (!paymentRecoveryToken) {
          fail('Unable to build the lifecycle recovery token from the persisted snapshot.')
        }
        const recoveryValidation = validatePaymentRecoveryToken(
          paymentRecoveryToken,
          paymentPublicCode,
          paymentNow,
        )
        assert.equal(recoveryValidation.ok, true)
        if (!recoveryValidation.ok) {
          fail('The recovery token must validate for the persisted lifecycle booking.')
        }

        const paymentBytes = makeBytes('png')
        const paymentFile = makeFileLike({
          name: 'lifecycle-proof.png',
          type: 'image/png',
          bytes: paymentBytes,
        })
        const uploadContext: CustomBundlePaymentProofBoundaryContext = {
          publicCode: paymentPublicCode,
          paymentReportIdempotencyKey: paymentIdempotencyResult.idempotencyKey,
          now: paymentNow,
        }
        const uploadResult = await uploadCustomBundlePaymentProofToPrivateStore({
          file: paymentFile,
          context: uploadContext,
          store,
        })
        assert.equal(uploadResult.ok, true)
        if (!uploadResult.ok) {
          fail('The private proof upload must succeed for the canonical lifecycle booking.')
        }
        assert.equal(uploadResult.stage, 'uploaded')
        assert.equal(uploadResult.createdByThisCall, true)
        assert.equal(paymentFile.arrayBufferCalls.count, 1)
        assert.equal(uploadResult.privateObject.access, 'private')
        assert.equal(uploadResult.privateObject.pathname, uploadResult.metadata.blobPathname)
        assert.equal(uploadResult.privateObject.contentType, 'image/png')
        assert.equal(uploadResult.privateObject.sizeBytes, paymentBytes.byteLength)
        assert.equal(uploadResult.privateObject.uploadedAt instanceof Date, true)
        assert.equal(store.hasObject(uploadResult.metadata.blobPathname), true)

        const expectedPathname = buildCustomBundlePaymentProofPrivatePathname({
          publicCode: paymentPublicCode,
          paymentReportIdempotencyKey: paymentIdempotencyResult.idempotencyKey,
          sha256: uploadResult.metadata.sha256,
          mimeType: uploadResult.metadata.mimeType,
        })
        assert.equal(uploadResult.metadata.blobPathname, expectedPathname)

        const receiptToken = makeReceiptPayload({
          publicCode: paymentPublicCode,
          paymentMethod: paymentSubmission.paymentMethod,
          paymentReference: paymentSubmission.paymentReference,
          paymentReportIdempotencyKey: paymentIdempotencyResult.idempotencyKey,
          blobPathname: uploadResult.metadata.blobPathname,
          sha256: uploadResult.metadata.sha256,
          mimeType: uploadResult.metadata.mimeType,
          sizeBytes: uploadResult.metadata.sizeBytes,
          originalFilename: uploadResult.metadata.originalFilename,
          uploadedAt: uploadResult.metadata.uploadedAt,
          createdByThisCall: uploadResult.createdByThisCall,
          now: paymentNow,
          expiresAt: bookingRow.holdExpiresAt!,
        })
        assert.ok(receiptToken)
        if (!receiptToken) {
          fail('Unable to build the signed lifecycle upload receipt token.')
        }

        const validatedReceipt = validateCustomBundlePaymentUploadReceipt(
          receiptToken,
          paymentPublicCode,
          paymentNow,
        )
        assert.equal(validatedReceipt.ok, true)
        if (!validatedReceipt.ok) {
          fail('The signed lifecycle upload receipt token must validate.')
        }

        const concurrencyInstrumentationA: ReceiptSessionInstrumentation = {
          openedSessions: 0,
          closedSessions: 0,
          sessionTraces: [],
        }
        const concurrencyInstrumentationB: ReceiptSessionInstrumentation = {
          openedSessions: 0,
          closedSessions: 0,
          sessionTraces: [],
        }
        const concurrentResultA = runPaymentReceipt(
          connectionString,
          store,
          {
            submission: paymentSubmission,
            uploadReceipt: receiptToken,
          },
          paymentNow,
          concurrencyInstrumentationA,
        )
        const concurrentResultB = runPaymentReceipt(
          connectionString,
          store,
          {
            submission: paymentSubmission,
            uploadReceipt: receiptToken,
          },
          paymentNow,
          concurrencyInstrumentationB,
        )
        const [concurrentOutcomeA, concurrentOutcomeB] = await Promise.all([
          concurrentResultA,
          concurrentResultB,
        ])
        assert.equal(concurrentOutcomeA.ok, true)
        assert.equal(concurrentOutcomeB.ok, true)
        const concurrentStages = [concurrentOutcomeA, concurrentOutcomeB].map((result) => {
          assert.equal(result.ok, true)
          return result.stage
        })
        concurrentStages.sort((left, right) => (left === right ? 0 : left === 'replayed' ? -1 : 1))
        assert.deepEqual(concurrentStages, ['replayed', 'reported'])
        assert.equal(
          [concurrentOutcomeA, concurrentOutcomeB].filter((result) => result.ok && result.stage === 'reported').length,
          1,
        )
        assert.equal(
          [concurrentOutcomeA, concurrentOutcomeB].filter((result) => result.ok && result.stage === 'replayed').length,
          1,
        )
        assert.equal(concurrencyInstrumentationA.openedSessions, 1)
        assert.equal(concurrencyInstrumentationA.closedSessions, 1)
        assert.equal(concurrencyInstrumentationB.openedSessions, 1)
        assert.equal(concurrencyInstrumentationB.closedSessions, 1)
        assert.equal(
          concurrencyInstrumentationA.sessionTraces[0]?.calls.filter((call) =>
            /^SELECT pg_advisory_lock/i.test(call.sql),
          ).length,
          1,
        )
        assert.equal(
          concurrencyInstrumentationB.sessionTraces[0]?.calls.filter((call) =>
            /^SELECT pg_advisory_lock/i.test(call.sql),
          ).length,
          1,
        )
        assert.equal(
          concurrencyInstrumentationA.sessionTraces[0]?.calls.filter((call) =>
            /^SELECT pg_advisory_unlock/i.test(call.sql),
          ).length,
          1,
        )
        assert.equal(
          concurrencyInstrumentationB.sessionTraces[0]?.calls.filter((call) =>
            /^SELECT pg_advisory_unlock/i.test(call.sql),
          ).length,
          1,
        )
        assert.equal(store.calls.delete.length, 0)

        const bookingAfterConcurrency = (await readBookingRows(client, paymentPublicCode))[0]
        assert.ok(bookingAfterConcurrency.paymentReportedAt)
        assert.equal(bookingAfterConcurrency.paymentReportedAt?.getTime(), paymentNow.getTime())
        assert.equal(
          bookingAfterConcurrency.paymentExpectedTotalUsdSnapshot,
          bookingAfterConcurrency.estimatedTotal,
        )
        const paymentProofsAfterConcurrency = await readActiveProofRows(client, bookingAfterConcurrency.id)
        assert.equal(paymentProofsAfterConcurrency.length, 1)
        assert.equal(paymentProofsAfterConcurrency[0]?.blobPathname, uploadResult.metadata.blobPathname)
        assert.equal(paymentProofsAfterConcurrency[0]?.sha256, uploadResult.metadata.sha256)
        assert.equal(paymentProofsAfterConcurrency[0]?.duplicateStatus, 'none')
        assert.equal(
          (await readAuditRows(client, bookingAfterConcurrency.id)).filter(
            (row) => row.action === CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
          ).length,
          1,
        )

        const replayInstrumentation: ReceiptSessionInstrumentation = {
          openedSessions: 0,
          closedSessions: 0,
          sessionTraces: [],
        }
        const replayResult = await runPaymentReceipt(
          connectionString,
          store,
          {
            submission: paymentSubmission,
            uploadReceipt: receiptToken,
          },
          paymentNow,
          replayInstrumentation,
        )
        assertPaymentReceiptSuccess(replayResult, 'replayed', 'canonical payment replay')
        assert.equal(replayInstrumentation.openedSessions, 1)
        assert.equal(replayInstrumentation.closedSessions, 1)
        const replayBooking = (await readBookingRows(client, paymentPublicCode))[0]
        assert.ok(replayBooking.paymentReportedAt)
        assert.equal(replayBooking.paymentReportedAt?.getTime(), paymentNow.getTime())
        assert.equal(
          (await readActiveProofRows(client, bookingAfterConcurrency.id)).length,
          1,
        )
        assert.equal(
          (await readAuditRows(client, bookingAfterConcurrency.id)).filter(
            (row) => row.action === CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
          ).length,
          1,
        )

        const sameKeyDifferentSubmission = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(
            makeMixedSubmission({
              startTime: '10:30',
              extrasNotes: '  Material conflict  ',
            }),
          ),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-808',
            idempotencyKey: mixedContext.idempotencyKey,
            now: new Date('2026-06-24T10:02:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assert.equal(sameKeyDifferentSubmission.ok, false)
        if (!sameKeyDifferentSubmission.ok) {
          assert.equal(sameKeyDifferentSubmission.stage, 'idempotency')
          assert.equal(sameKeyDifferentSubmission.code, 'IDEMPOTENCY_KEY_CONFLICT')
        }
        assert.equal(
          (await readBookingRows(client, 'TUR-0808-808')).length,
          0,
        )
        const materialConflictRows = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "booking_requests"
            WHERE "idempotencyKey" = $1
          `,
          [mixedContext.idempotencyKey],
        )
        assert.equal(Number(materialConflictRows[0]?.count ?? 0), 1)
        assert.equal(
          (await readBookingRows(client, paymentPublicCode)).length,
          1,
        )
        assert.equal(
          (await readAuditRows(client, bookingAfterConcurrency.id)).filter(
            (row) => row.action === CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
          ).length,
          1,
        )

        const paidExpiration = await expireCustomBundleHoldsWithSql(makeSession(client), {
          serverContext: {
            now: new Date(bookingRow.holdExpiresAt!.getTime()),
            batchSize: 50,
          },
        })
        assert.equal(paidExpiration.ok, true)
        if (paidExpiration.ok) {
          assert.equal(
            paidExpiration.expiredBookings.some((row) => row.publicCode === paymentPublicCode),
            false,
          )
          assert.equal(
            (await readBookingRows(client, paymentPublicCode))[0]?.status,
            'under_review',
          )
        }

        const exactBoundarySubmission = makeExactBoundarySubmission()
        const exactBoundaryContext = buildHoldContext({
          publicCode: 'TUR-0808-803',
          idempotencyKey: 'HOLD_2026:06:24-0803',
          now: new Date('2026-06-24T12:00:00.000Z'),
          holdDurationMinutes: 60,
        })
        const exactBoundaryHold = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(exactBoundarySubmission),
          serverContext: { ...exactBoundaryContext },
        })
        assertHoldAcquisitionSuccess(exactBoundaryHold, 'exact boundary hold acquisition')
        assert.equal(exactBoundaryHold.stage, 'acquired')
        boundaryBookingRequestId = exactBoundaryHold.bookingRequestId

        const exactBoundaryPaymentNow = new Date(new Date(exactBoundaryHold.holdExpiresAtIso).getTime())
        const exactBoundaryPaymentSubmission = buildPaymentSubmission({
          publicCode: 'TUR-0808-803',
          paymentMethod: 'efectivo',
          paymentReference: 'CASH-0808-803',
        })
        const exactBoundaryPaymentResult = await runPaymentReceipt(
          connectionString,
          store,
          {
            submission: exactBoundaryPaymentSubmission,
            uploadReceipt: null,
          },
          exactBoundaryPaymentNow,
        )
        assert.equal(exactBoundaryPaymentResult.ok, false)
        if (!exactBoundaryPaymentResult.ok) {
          assert.equal(exactBoundaryPaymentResult.stage, 'booking')
          assert.equal(exactBoundaryPaymentResult.code, 'PAYMENT_BOOKING_INELIGIBLE')
        }
        const exactBoundaryRowBeforeExpiration = (await readBookingRows(client, 'TUR-0808-803'))[0]
        assert.equal(exactBoundaryRowBeforeExpiration.paymentMethod, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentReference, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentNormalizedReference, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentReportedAt, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentExpectedTotalUsdSnapshot, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentReportIdempotencyKey, null)
        assert.equal(exactBoundaryRowBeforeExpiration.paymentReportFingerprint, null)

        const exactBoundaryExpiration = await expireCustomBundleHoldsWithSql(makeSession(client), {
          serverContext: {
            now: exactBoundaryPaymentNow,
            batchSize: 50,
          },
        })
        assert.equal(exactBoundaryExpiration.ok, true)
        if (exactBoundaryExpiration.ok) {
          assert.equal(
            exactBoundaryExpiration.expiredBookings.some((row) => row.publicCode === 'TUR-0808-803'),
            true,
          )
          const exactBoundaryRow = (await readBookingRows(client, 'TUR-0808-803'))[0]
          assert.equal(exactBoundaryRow.status, 'rejected')
          assert.equal(exactBoundaryRow.paymentMethod, null)
          assert.equal(exactBoundaryRow.paymentReference, null)
          assert.equal(exactBoundaryRow.paymentNormalizedReference, null)
          assert.equal(exactBoundaryRow.paymentReportedAt, null)
          assert.equal(exactBoundaryRow.paymentExpectedTotalUsdSnapshot, null)
          assert.equal(exactBoundaryRow.paymentReportIdempotencyKey, null)
          assert.equal(exactBoundaryRow.paymentReportFingerprint, null)
          const exactBoundaryAuditRows = await readAuditRows(client, exactBoundaryRow.id)
          assert.equal(
            exactBoundaryAuditRows.filter((row) => row.action === CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION).length,
            1,
          )
        }

        const holdRollbackTrace: SessionTrace = { calls: [] }
        const holdRollbackSession = makeSession(client, {
          trace: holdRollbackTrace,
          fault: {
            pattern: /INSERT INTO "booking_request_items"/i,
            message: 'simulated booking_request_items failure',
            fired: false,
          },
        })
        const holdRollbackAttempt = await acquireCustomBundleHoldWithSql(holdRollbackSession, {
          submission: deepClone(
            makeRoomOnlySubmission({
              startTime: '12:30',
              extrasNotes: '  Hold rollback  ',
            }),
          ),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-804',
            idempotencyKey: 'HOLD_2026:06:24-0804',
            now: new Date('2026-06-24T13:05:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assert.equal(holdRollbackAttempt.ok, false)
        if (!holdRollbackAttempt.ok) {
          assert.equal(holdRollbackAttempt.stage, 'persistence')
          assert.equal(holdRollbackAttempt.code, 'DATABASE_WRITE_FAILED')
        }
        assert.equal(
          holdRollbackTrace.calls.filter((call) => /^BEGIN ISOLATION LEVEL SERIALIZABLE/i.test(call.sql)).length,
          1,
        )
        assert.equal(
          holdRollbackTrace.calls.filter((call) => /^ROLLBACK$/i.test(call.sql.trim())).length,
          1,
        )
        assert.equal(
          holdRollbackTrace.calls.filter((call) => /^COMMIT$/i.test(call.sql.trim())).length,
          0,
        )
        assert.equal(
          (await readBookingRows(client, 'TUR-0808-804')).length,
          0,
        )
        const reusableAfterRollback = await client.query('SELECT 1 AS value')
        assert.equal(Number((reusableAfterRollback.rows[0] as { value: string | number }).value), 1)

        const releasedSlotReplay = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(
            makeRoomOnlySubmission({
              startTime: '12:00',
              eventDate: '2026-06-24',
              extrasNotes: '  Slot released  ',
            }),
          ),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-810',
            idempotencyKey: 'HOLD_2026:06:24-0810',
            now: new Date('2026-06-24T13:05:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assertHoldAcquisitionSuccess(releasedSlotReplay, 'released slot acquisition')
        assert.equal(releasedSlotReplay.stage, 'acquired')

        const noPhysicalSubmission = makeNoPhysicalSubmission()
        const noPhysicalResult = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(noPhysicalSubmission),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-805',
            idempotencyKey: 'HOLD_2026:06:24-0805',
            now: new Date('2026-06-24T14:00:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assertHoldAcquisitionSuccess(noPhysicalResult, 'no physical acquisition')
        assert.equal(noPhysicalResult.noPhysicalAllocationCount > 0, true)

        const rollbackOwnedSubmission = makeRoomOnlySubmission({
          startTime: '14:30',
          eventDate: '2026-06-24',
          extrasNotes: '  Owned cleanup  ',
        })
        const rollbackOwnedResult = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(rollbackOwnedSubmission),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-806',
            idempotencyKey: 'HOLD_2026:06:24-0806',
            now: new Date('2026-06-24T14:00:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assertHoldAcquisitionSuccess(rollbackOwnedResult, 'owned rollback booking')
        rollbackOwnedBookingRequestId = rollbackOwnedResult.bookingRequestId

        await installAuditFailureTrigger(client, rollbackOwnedBookingRequestId)
        const rollbackOwnedPayment = buildPaymentSubmission({
          publicCode: 'TUR-0808-806',
          paymentMethod: 'pago_movil',
          paymentReference: 'PM-0808-806',
        })
        const rollbackOwnedIdempotency = buildCustomBundlePaymentServerIdempotencyKey({
          submission: rollbackOwnedPayment,
          paymentProofFile: null,
        })
        if (!rollbackOwnedIdempotency.ok) {
          fail('Unable to derive owned rollback payment idempotency.')
        }
        const rollbackOwnedFile = makeFileLike({
          name: 'rollback-owned.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        })
        const rollbackOwnedUpload = await uploadCustomBundlePaymentProofToPrivateStore({
          file: rollbackOwnedFile,
          context: {
            publicCode: rollbackOwnedPayment.publicCode,
            paymentReportIdempotencyKey: rollbackOwnedIdempotency.idempotencyKey,
            now: new Date('2026-06-24T14:01:00.000Z'),
          },
          store,
        })
        assert.equal(rollbackOwnedUpload.ok, true)
        if (!rollbackOwnedUpload.ok) {
          fail('Owned rollback proof upload must succeed.')
        }
        const rollbackOwnedReceipt = makeReceiptPayload({
          publicCode: rollbackOwnedPayment.publicCode,
          paymentMethod: rollbackOwnedPayment.paymentMethod,
          paymentReference: rollbackOwnedPayment.paymentReference,
          paymentReportIdempotencyKey: rollbackOwnedIdempotency.idempotencyKey,
          blobPathname: rollbackOwnedUpload.metadata.blobPathname,
          sha256: rollbackOwnedUpload.metadata.sha256,
          mimeType: rollbackOwnedUpload.metadata.mimeType,
          sizeBytes: rollbackOwnedUpload.metadata.sizeBytes,
          originalFilename: rollbackOwnedUpload.metadata.originalFilename,
          uploadedAt: rollbackOwnedUpload.metadata.uploadedAt,
          createdByThisCall: rollbackOwnedUpload.createdByThisCall,
          now: new Date('2026-06-24T14:01:00.000Z'),
          expiresAt: new Date('2026-06-24T14:16:00.000Z'),
        })
        assert.ok(rollbackOwnedReceipt)
        if (!rollbackOwnedReceipt) {
          fail('Unable to build the owned rollback receipt token.')
        }
        const rollbackOwnedResultOutcome = await runPaymentReceipt(connectionString, store, {
          submission: rollbackOwnedPayment,
          uploadReceipt: rollbackOwnedReceipt,
        }, new Date('2026-06-24T14:01:00.000Z'))
        assert.equal(rollbackOwnedResultOutcome.ok, false)
        assert.equal(store.hasObject(rollbackOwnedUpload.metadata.blobPathname), false)
        assert.equal(
          (await readActiveProofRows(client, rollbackOwnedBookingRequestId)).length,
          0,
        )
        assert.equal(
          (await readAuditRows(client, rollbackOwnedBookingRequestId)).filter(
            (row) => row.action === CUSTOM_BUNDLE_PAYMENT_REPORT_ACTION,
          ).length,
          0,
        )

        await removeAuditFailureTrigger(client)

        const rollbackReusedSubmission = makeRoomOnlySubmission({
          startTime: '15:30',
          eventDate: '2026-06-24',
          extrasNotes: '  Reused cleanup  ',
        })
        const rollbackReusedResult = await acquireCustomBundleHoldWithSql(makeSession(client), {
          submission: deepClone(rollbackReusedSubmission),
          serverContext: buildHoldContext({
            publicCode: 'TUR-0808-807',
            idempotencyKey: 'HOLD_2026:06:24-0807',
            now: new Date('2026-06-24T15:00:00.000Z'),
            holdDurationMinutes: 60,
          }),
        })
        assertHoldAcquisitionSuccess(rollbackReusedResult, 'reused rollback booking')
        rollbackReusedBookingRequestId = rollbackReusedResult.bookingRequestId

        const rollbackReusedPayment = buildPaymentSubmission({
          publicCode: 'TUR-0808-807',
          paymentMethod: 'pago_movil',
          paymentReference: 'PM-0808-807',
        })
        const rollbackReusedIdempotency = buildCustomBundlePaymentServerIdempotencyKey({
          submission: rollbackReusedPayment,
          paymentProofFile: null,
        })
        if (!rollbackReusedIdempotency.ok) {
          fail('Unable to derive reused rollback payment idempotency.')
        }

        const rollbackReusedFile = makeFileLike({
          name: 'rollback-reused.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        })
        const rollbackReusedFirstUpload = await uploadCustomBundlePaymentProofToPrivateStore({
          file: rollbackReusedFile,
          context: {
            publicCode: rollbackReusedPayment.publicCode,
            paymentReportIdempotencyKey: rollbackReusedIdempotency.idempotencyKey,
            now: new Date('2026-06-24T15:01:00.000Z'),
          },
          store,
        })
        assert.equal(rollbackReusedFirstUpload.ok, true)
        if (!rollbackReusedFirstUpload.ok) {
          fail('The preliminary reused-proof upload must succeed.')
        }
        const rollbackReusedSecondUpload = await uploadCustomBundlePaymentProofToPrivateStore({
          file: rollbackReusedFile,
          context: {
            publicCode: rollbackReusedPayment.publicCode,
            paymentReportIdempotencyKey: rollbackReusedIdempotency.idempotencyKey,
            now: new Date('2026-06-24T15:01:00.000Z'),
          },
          store,
        })
        assert.equal(rollbackReusedSecondUpload.ok, true)
        if (!rollbackReusedSecondUpload.ok) {
          fail('The reused-proof upload must succeed.')
        }
        assert.equal(rollbackReusedSecondUpload.createdByThisCall, false)
        const rollbackReusedReceipt = makeReceiptPayload({
          publicCode: rollbackReusedPayment.publicCode,
          paymentMethod: rollbackReusedPayment.paymentMethod,
          paymentReference: rollbackReusedPayment.paymentReference,
          paymentReportIdempotencyKey: rollbackReusedIdempotency.idempotencyKey,
          blobPathname: rollbackReusedSecondUpload.metadata.blobPathname,
          sha256: rollbackReusedSecondUpload.metadata.sha256,
          mimeType: rollbackReusedSecondUpload.metadata.mimeType,
          sizeBytes: rollbackReusedSecondUpload.metadata.sizeBytes,
          originalFilename: rollbackReusedSecondUpload.metadata.originalFilename,
          uploadedAt: rollbackReusedSecondUpload.metadata.uploadedAt,
          createdByThisCall: rollbackReusedSecondUpload.createdByThisCall,
          now: new Date('2026-06-24T15:01:00.000Z'),
          expiresAt: new Date('2026-06-24T15:16:00.000Z'),
        })
        assert.ok(rollbackReusedReceipt)
        if (!rollbackReusedReceipt) {
          fail('Unable to build the reused rollback receipt token.')
        }
        await installAuditFailureTrigger(client, rollbackReusedBookingRequestId)
        const rollbackReusedOutcome = await runPaymentReceipt(connectionString, store, {
          submission: rollbackReusedPayment,
          uploadReceipt: rollbackReusedReceipt,
        }, new Date('2026-06-24T15:01:00.000Z'))
        assert.equal(rollbackReusedOutcome.ok, false)
        assert.equal(store.hasObject(rollbackReusedSecondUpload.metadata.blobPathname), true)
        assert.equal(
          (await readActiveProofRows(client, rollbackReusedBookingRequestId)).length,
          0,
        )
        await removeAuditFailureTrigger(client)

        const activeProofRowsAfterReplay = await readActiveProofRows(client, paidBookingRequestId)
        assert.equal(activeProofRowsAfterReplay.length, 1)
        assert.equal(activeProofRowsAfterReplay[0]?.blobPathname, uploadResult.metadata.blobPathname)
        assert.equal(activeProofRowsAfterReplay[0]?.duplicateStatus, 'none')

        const exactBoundaryBookingRows = await readBookingRows(client, 'TUR-0808-803')
        assert.equal(exactBoundaryBookingRows[0]?.status, 'rejected')
        assert.equal(
          (await readAuditRows(client, exactBoundaryBookingRows[0]!.id)).filter(
            (row) => row.action === CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
          ).length,
          1,
        )

        const paidBookingRows = await readBookingRows(client, paymentPublicCode)
        assert.equal(paidBookingRows[0]?.status, 'under_review')
        assert.equal(
          (await readAuditRows(client, paidBookingRequestId)).filter(
            (row) => row.action === CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION,
          ).length,
          0,
        )

        const paymentReplayRows = await readBookingRows(client, paymentPublicCode)
        assert.equal(paymentReplayRows[0]?.paymentReportedAt instanceof Date, true)
        assert.equal(
          paymentReplayRows[0]?.paymentNormalizedReference,
          normalizeCustomBundlePaymentReference(paymentSubmission.paymentReference),
        )

        const paidExpirationAfterReport = await expireCustomBundleHoldsWithSql(makeSession(client), {
          serverContext: {
            now: new Date('2026-06-24T12:30:00.000Z'),
            batchSize: 50,
          },
        })
        assert.equal(paidExpirationAfterReport.ok, true)
        if (paidExpirationAfterReport.ok) {
          assert.equal(
            paidExpirationAfterReport.expiredBookings.some((row) => row.publicCode === paymentPublicCode),
            false,
          )
        }

        const expirationAuditRows = await readAuditRows(client, exactBoundaryBookingRows[0]!.id)
        assert.equal(
          expirationAuditRows.filter((row) => row.action === CUSTOM_BUNDLE_HOLD_EXPIRATION_ACTION).length,
          1,
        )

        const legacyRowsAfterLifecycle = await readBookingRows(client, 'TUR-0808-899')
        assert.equal(legacyRowsAfterLifecycle.length, 1)
        const legacyRowAfterLifecycle = legacyRowsAfterLifecycle[0]
        assert.equal(legacyRowAfterLifecycle.id, legacyFixture.bookingRequestId)
        assert.equal(legacyRowAfterLifecycle.bookingMode, 'single')
        assert.equal(legacyRowAfterLifecycle.status, 'under_review')
        assert.equal(legacyRowAfterLifecycle.internalNotes, 'legacy conocida')
        assert.equal(legacyRowAfterLifecycle.paymentMethod, null)
        assert.equal(legacyRowAfterLifecycle.paymentReference, null)
        assert.equal(legacyRowAfterLifecycle.paymentNormalizedReference, null)
        assert.equal(legacyRowAfterLifecycle.paymentReportedAt, null)
        assert.equal(legacyRowAfterLifecycle.paymentExpectedTotalUsdSnapshot, null)
        assert.equal(legacyRowAfterLifecycle.paymentReportIdempotencyKey, null)
        assert.equal(legacyRowAfterLifecycle.paymentReportFingerprint, null)
        assert.equal((await readBookingItems(client, legacyFixture.bookingRequestId)).length, 1)
        assert.equal((await readAuditRows(client, legacyFixture.bookingRequestId)).length, 0)

        assert.equal(process.env.VERCEL_ENV === 'production', false)
        const wizardSource = readFileSync(resolve(process.cwd(), 'components/bookings/BookingWizard.tsx'), 'utf8')
        const legacyActionSource = readFileSync(resolve(process.cwd(), 'lib/bookings/actions.ts'), 'utf8')
        assert.equal(wizardSource.includes('isolated-custom-bundle-full-lifecycle'), false)
        assert.equal(legacyActionSource.includes('isolated-custom-bundle-full-lifecycle'), false)

        await cleanupFixtures(client, store)

        const remainingBookings = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "booking_requests"
            WHERE "publicCode" = ANY($1::text[])
          `,
          [lifecyclePublicCodes],
        )
        assert.equal(Number(remainingBookings[0]?.count ?? 0), 0)

        const remainingItems = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "booking_request_items" bri
            JOIN "booking_requests" br ON br.id = bri."bookingRequestId"
            WHERE br."publicCode" = ANY($1::text[])
          `,
          [lifecyclePublicCodes],
        )
        assert.equal(Number(remainingItems[0]?.count ?? 0), 0)

        const remainingProofs = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "payment_proofs" pp
            JOIN "booking_requests" br ON br.id = pp."bookingRequestId"
            WHERE br."publicCode" = ANY($1::text[])
          `,
          [lifecyclePublicCodes],
        )
        assert.equal(Number(remainingProofs[0]?.count ?? 0), 0)

        const remainingAudits = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "audit_log" al
            JOIN "booking_requests" br ON br.id = al."bookingRequestId"
            WHERE br."publicCode" = ANY($1::text[])
          `,
          [lifecyclePublicCodes],
        )
        assert.equal(Number(remainingAudits[0]?.count ?? 0), 0)

        const remainingServices = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "services"
            WHERE id LIKE 'bkg08j_service_%'
          `,
        )
        assert.equal(Number(remainingServices[0]?.count ?? 0), 0)

        const remainingVariants = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "service_variants"
            WHERE id LIKE 'bkg08j_variant_%'
          `,
        )
        assert.equal(Number(remainingVariants[0]?.count ?? 0), 0)

        const remainingResources = await queryRows<{ count: string }>(
          client,
          `
            SELECT COUNT(*)::text AS count
            FROM "resources"
            WHERE id LIKE 'bkg08j_resource_%'
          `,
        )
        assert.equal(Number(remainingResources[0]?.count ?? 0), 0)

        assert.equal(store.objects.size, 0)

        console.log('booking_isolated_custom_bundle_full_lifecycle OK')
        console.log('canonical submission: verified')
        console.log('server repricing: verified')
        console.log('transactional hold: verified')
        console.log('material idempotency conflict: verified')
        console.log('booking persistence: verified')
        console.log('snapshot items: verified')
        console.log('resource collision: verified')
        console.log('hold replay: verified')
        console.log('persisted recovery from database: verified')
        console.log('signed upload receipt: verified')
        console.log('private object verification: verified')
        console.log('first write payment concurrency: verified')
        console.log('one reported one replayed: verified')
        console.log('concurrent sessions closed: verified')
        console.log('payment proof persistence: verified')
        console.log('payment audit log: verified')
        console.log('payment one millisecond before expiry: verified')
        console.log('payment exact expiry rejection: verified')
        console.log('unpaid hold expiration: verified')
        console.log('resource release: verified')
        console.log('hold persistence rollback: verified')
        console.log('rollback connection reusable: verified')
        console.log('audit failure reached: verified')
        console.log('owned proof cleanup after audit failure: verified')
        console.log('reused proof preservation after audit failure: verified')
        console.log('legacy database isolation: verified')
        console.log('correct booking id audit lookup: verified')
        console.log('local postgres only: verified')
        console.log('zero real blob: verified')
        console.log('no production activation: verified')
      } catch (error) {
        await removeAuditFailureTrigger(client).catch(() => {})
        await cleanupFixtures(client, store).catch(() => {})
        fail(error instanceof Error ? error.message : String(error), error)
      } finally {
        await removeAuditFailureTrigger(client).catch(() => {})
        await cleanupFixtures(client, store).catch(() => {})
        await client.end().catch(() => {})
      }
    },
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => fail('Unexpected failure while validating the isolated full lifecycle gate.', error))
}
