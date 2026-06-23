import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  acquireCustomBundleHoldWithSql,
  type AcquireCustomBundleHoldInput,
} from '@/lib/bookings/custom-bundle-hold-acquisition'
import {
  prepareCustomBundleHoldContract,
  type CustomBundleHoldServerContext,
} from '@/lib/bookings/custom-bundle-hold-contract'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'

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
  estimatedTotal: string | number | null
  currency: string
  submittedAt: Date | null
  bookingMode: string
  pricingSource: string | null
  idempotencyKey: string | null
  requestFingerprint: string | null
  holdAcquiredAt: Date | null
  holdExpiresAt: Date | null
}

type BookingRequestItemRow = {
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

type ServiceSeed = {
  id: string
  slug: string
  name: string
  isActive?: boolean
}

type ServiceVariantSeed = {
  id: string
  slug: string
  name: string
  serviceId: string
  isActive?: boolean
}

type ResourceSeed = {
  id: string
  slug: string
  name: string
  isActive?: boolean
}

type TracingSession = CustomBundleSqlSession & {
  calls: Array<{ sql: string; params: readonly unknown[] }>
}

type DomainIds = {
  serviceIds: Record<string, string>
  variantIds: Record<string, string>
  resourceIds: Record<string, string>
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_hold_acquisition FAILED')
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

function describeHoldAcquisitionResult(
  result: Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>,
): string {
  return result.ok ? result.stage : 'code' in result ? `${result.stage}:${result.code}` : result.stage
}

function buildMixedSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observacion canonical de acquisition  ',
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

function buildRoomOnlySubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '12:00',
    extrasNotes: '  Sala temporal canonical  ',
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

function buildNoPhysicalSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '12:30',
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

function buildPluginSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '19:00',
    extrasNotes: '  Locucion canonica  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [{ itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null }],
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
  overrides: Partial<CustomBundleHoldServerContext & { publicCode: string; now: Date }> = {},
): AcquireCustomBundleHoldInput['serverContext'] {
  return {
    publicCode: 'TUR-0707-001',
    idempotencyKey: 'HOLD_2026:06:24-0001',
    now: new Date('2026-06-24T14:00:00.000Z'),
    holdDurationMinutes: 60,
    ...overrides,
  }
}

function buildAcquireInput(
  submission: CustomBundleSubmissionInputV1,
  serverContext: AcquireCustomBundleHoldInput['serverContext'],
): AcquireCustomBundleHoldInput {
  return {
    submission: JSON.parse(JSON.stringify(submission)) as CustomBundleSubmissionInputV1,
    serverContext: { ...serverContext },
  }
}

function makePostgresError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
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
  const enumRows = await queryRows<{
    enum_name: string
    enum_label: string
    enumsortorder: number
  }>(
    client,
    `
      SELECT t.typname AS enum_name, e.enumlabel AS enum_label, e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('booking_mode', 'booking_item_kind')
      ORDER BY t.typname, e.enumsortorder
    `,
  )

  const enumMap = new Map<string, string[]>()
  for (const row of enumRows) {
    const current = enumMap.get(row.enum_name) ?? []
    current.push(row.enum_label)
    enumMap.set(row.enum_name, current)
  }

  assert.deepStrictEqual(enumMap.get('booking_mode'), ['single', 'custom_bundle'])
  assert.deepStrictEqual(enumMap.get('booking_item_kind'), ['service', 'addon', 'included'])

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
        AND table_name IN ('booking_requests', 'booking_request_items')
        AND column_name IN (
          'bookingMode',
          'pricingSource',
          'idempotencyKey',
          'requestFingerprint',
          'holdAcquiredAt',
          'holdExpiresAt',
          'serviceVariantId',
          'itemSlug',
          'itemName',
          'itemKind',
          'sessionDurationMinutes',
          'durationMinutes',
          'unitPriceUsdSnapshot',
          'lineTotalUsdSnapshot',
          'clientPriceDisplay'
        )
      ORDER BY table_name, column_name
    `,
  )

  const columnMap = new Map(columnRows.map((row) => [`${row.table_name}.${row.column_name}`, row]))
  const columnExpectations: Array<{
    key: string
    nullable: 'YES' | 'NO'
    defaultValue: RegExp | null
  }> = [
    {
      key: 'booking_requests.bookingMode',
      nullable: 'NO',
      defaultValue: /single/i,
    },
    {
      key: 'booking_requests.pricingSource',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_requests.idempotencyKey',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_requests.requestFingerprint',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_requests.holdAcquiredAt',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_requests.holdExpiresAt',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.serviceVariantId',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.itemSlug',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.itemName',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.itemKind',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.sessionDurationMinutes',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.durationMinutes',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.unitPriceUsdSnapshot',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.lineTotalUsdSnapshot',
      nullable: 'YES',
      defaultValue: null,
    },
    {
      key: 'booking_request_items.clientPriceDisplay',
      nullable: 'YES',
      defaultValue: null,
    },
  ]

  for (const expectation of columnExpectations) {
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
  assert.ok(indexMap.has('booking_requests_idempotency_key_uniq'))
  assert.ok(indexMap.has('booking_requests_hold_expires_at_idx'))
  assert.match(indexMap.get('booking_requests_idempotency_key_uniq') ?? '', /WHERE .*"idempotencyKey" IS NOT NULL/i)
  assert.match(indexMap.get('booking_requests_hold_expires_at_idx') ?? '', /WHERE .*"holdExpiresAt" IS NOT NULL/i)
}

async function seedCatalog(client: Client): Promise<DomainIds> {
  const services: ServiceSeed[] = [
    { id: 'bkg07b_service_sala', slug: 'sala-ensayo', name: 'Sala de ensayo' },
    { id: 'bkg07b_service_grabacion', slug: 'grabacion', name: 'Grabacion' },
    { id: 'bkg07b_service_podcast', slug: 'podcast-locucion', name: 'Podcast / locucion' },
    { id: 'bkg07b_service_video', slug: 'video-session', name: 'Video Session' },
    { id: 'bkg07b_service_consultoria', slug: 'consultoria', name: 'Consultoria' },
  ]

  const variants: ServiceVariantSeed[] = [
    {
      id: 'bkg07b_variant_sala_flexible',
      slug: 'sala-ensayo-flexible',
      name: 'Sala Flexible',
      serviceId: 'bkg07b_service_sala',
    },
    {
      id: 'bkg07b_variant_sala_premium',
      slug: 'sala-ensayo-premium',
      name: 'Sala Premium',
      serviceId: 'bkg07b_service_sala',
    },
    {
      id: 'bkg07b_variant_sala_prioritaria',
      slug: 'sala-ensayo-prioritaria',
      name: 'Sala Prioritaria',
      serviceId: 'bkg07b_service_sala',
    },
    {
      id: 'bkg07b_variant_grabacion_ensayo',
      slug: 'grabacion-ensayo',
      name: 'Grabacion en ensayo',
      serviceId: 'bkg07b_service_grabacion',
    },
    {
      id: 'bkg07b_variant_grabacion_estudio',
      slug: 'grabacion-hora-estudio',
      name: 'Grabacion en estudio',
      serviceId: 'bkg07b_service_grabacion',
    },
    {
      id: 'bkg07b_variant_podcast',
      slug: 'podcast-por-episodio',
      name: 'Podcast',
      serviceId: 'bkg07b_service_podcast',
    },
    {
      id: 'bkg07b_variant_locucion',
      slug: 'locucion-por-hora',
      name: 'Locucion',
      serviceId: 'bkg07b_service_podcast',
    },
    {
      id: 'bkg07b_variant_studio_session',
      slug: 'studio-session-fija',
      name: 'Studio Session',
      serviceId: 'bkg07b_service_video',
    },
    {
      id: 'bkg07b_variant_consultoria',
      slug: 'consultoria-produccion',
      name: 'Clase / consultoria de produccion',
      serviceId: 'bkg07b_service_consultoria',
    },
  ]

  const resources: ResourceSeed[] = [
    { id: 'bkg07b_resource_sala_1', slug: 'sala-1-grande', name: 'Sala 1 Grande' },
    { id: 'bkg07b_resource_sala_2', slug: 'sala-2-podcast-locucion', name: 'Sala 2 Podcast / Locucion' },
    { id: 'bkg07b_resource_sala_3', slug: 'sala-3-ensayo', name: 'Sala 3 Ensayo' },
  ]

  for (const service of services) {
    await client.query(
      `
        INSERT INTO "services" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("slug") DO UPDATE
        SET "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "isActive" = EXCLUDED."isActive",
            "updatedAt" = NOW()
      `,
      [service.id, service.slug, service.name, `${service.name} de prueba`, service.isActive ?? true],
    )
  }

  for (const variant of variants) {
    await client.query(
      `
        INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT ("slug") DO UPDATE
        SET "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "isActive" = EXCLUDED."isActive",
            "serviceId" = EXCLUDED."serviceId",
            "updatedAt" = NOW()
      `,
      [variant.id, variant.slug, variant.name, `${variant.name} de prueba`, variant.isActive ?? true, variant.serviceId],
    )
  }

  for (const resource of resources) {
    await client.query(
      `
        INSERT INTO "resources" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("slug") DO UPDATE
        SET "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "isActive" = EXCLUDED."isActive",
            "updatedAt" = NOW()
      `,
      [resource.id, resource.slug, resource.name, `${resource.name} de prueba`, resource.isActive ?? true],
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

async function fetchBundleByPublicCode(client: Client, publicCode: string): Promise<{
  bookingRequest: BookingRequestRow | null
  items: BookingRequestItemRow[]
}> {
  const bookingRows = await queryRows<BookingRequestRow>(
    client,
    `
      SELECT
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
        "holdExpiresAt"
      FROM "booking_requests"
      WHERE "publicCode" = $1
    `,
    [publicCode],
  )
  const bookingRequest = bookingRows[0] ?? null
  if (!bookingRequest) {
    return { bookingRequest: null, items: [] }
  }

  const items = await queryRows<BookingRequestItemRow>(
    client,
    `
      SELECT
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
      ORDER BY "itemSlug"
    `,
    [bookingRequest.id],
  )

  return { bookingRequest, items }
}

async function assertNoBundleByPublicCode(client: Client, publicCode: string, label: string): Promise<void> {
  const bundle = await fetchBundleByPublicCode(client, publicCode)
  assert.equal(bundle.bookingRequest, null, `${label} must not persist a booking request`)
  assert.equal(bundle.items.length, 0, `${label} must not persist booking request items`)
}

function assertItem(
  row: BookingRequestItemRow,
  expectation: {
    itemSlug: string
    itemKind: 'service' | 'addon' | 'included'
    serviceVariantId: string | null
    resourceId: string | null
    quantity: number
    sessionDurationMinutes: number | null
    durationMinutes: number
    unitPriceUsdSnapshot: number
    lineTotalUsdSnapshot: number
    clientPriceDisplay: 'itemized' | 'aggregate_only' | 'included'
  },
  label: string,
): void {
  assert.equal(row.itemSlug, expectation.itemSlug, `${label} itemSlug`)
  assert.equal(row.itemKind, expectation.itemKind, `${label} itemKind`)
  assert.equal(row.serviceVariantId, expectation.serviceVariantId, `${label} serviceVariantId`)
  assert.equal(row.resourceId, expectation.resourceId, `${label} resourceId`)
  assert.equal(row.quantity, expectation.quantity, `${label} quantity`)
  assert.equal(row.sessionDurationMinutes, expectation.sessionDurationMinutes, `${label} sessionDurationMinutes`)
  assert.equal(row.durationMinutes, expectation.durationMinutes, `${label} durationMinutes`)
  assertMoneyValue(row.unitPriceUsdSnapshot, expectation.unitPriceUsdSnapshot, `${label} unitPrice`)
  assertMoneyValue(row.lineTotalUsdSnapshot, expectation.lineTotalUsdSnapshot, `${label} lineTotal`)
  assert.equal(row.clientPriceDisplay, expectation.clientPriceDisplay, `${label} clientPriceDisplay`)
}

function assertBundle(
  bundle: { bookingRequest: BookingRequestRow | null; items: BookingRequestItemRow[] },
  publicCode: string,
  expectations: {
    bookingMode: string
    pricingSource: string | null
    status: string
    estimatedTotalUsd: number
    currency: string
    requesterName: string
    requesterEmail: string
    requesterPhone: string
    eventTitle: string
    notes: string | null
    internalNotes: string | null
    itemExpectations: Array<{
      itemSlug: string
      itemKind: 'service' | 'addon' | 'included'
      serviceVariantId: string | null
      resourceId: string | null
      quantity: number
      sessionDurationMinutes: number | null
      durationMinutes: number
      unitPriceUsdSnapshot: number
      lineTotalUsdSnapshot: number
      clientPriceDisplay: 'itemized' | 'aggregate_only' | 'included'
    }>
  },
): void {
  assert.ok(bundle.bookingRequest, `expected booking request ${publicCode}`)
  const bookingRequest = bundle.bookingRequest as BookingRequestRow
  assert.equal(bookingRequest.publicCode, publicCode)
  assert.equal(bookingRequest.bookingMode, expectations.bookingMode)
  assert.equal(bookingRequest.pricingSource, expectations.pricingSource)
  assert.equal(bookingRequest.status, expectations.status)
  assert.equal(bookingRequest.currency, expectations.currency)
  assert.equal(bookingRequest.requesterName, expectations.requesterName)
  assert.equal(bookingRequest.requesterEmail, expectations.requesterEmail)
  assert.equal(bookingRequest.requesterPhone, expectations.requesterPhone)
  assert.equal(bookingRequest.eventTitle, expectations.eventTitle)
  assert.equal(bookingRequest.notes, expectations.notes)
  assert.equal(bookingRequest.internalNotes, expectations.internalNotes)
  assertMoneyValue(bookingRequest.estimatedTotal, expectations.estimatedTotalUsd, 'estimatedTotal')
  assert.equal(bundle.items.length, expectations.itemExpectations.length)

  const itemsBySlug = new Map(bundle.items.map((row) => [row.itemSlug ?? '', row]))
  for (const expectation of expectations.itemExpectations) {
    const row = itemsBySlug.get(expectation.itemSlug)
    assert.ok(row, `missing persisted item ${expectation.itemSlug}`)
    assertItem(row as BookingRequestItemRow, expectation, expectation.itemSlug)
  }
}

function assertResultIsSuccess(
  label: string,
  result: Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>,
): asserts result is Extract<
  Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>,
  { ok: true }
> {
  if (!result.ok) {
    throw new Error(`${label} returned stage ${result.stage}`)
  }
}

async function runAcquisition(
  client: Client,
  submission: CustomBundleSubmissionInputV1,
  serverContext: AcquireCustomBundleHoldInput['serverContext'],
): Promise<{
  result: Awaited<ReturnType<typeof acquireCustomBundleHoldWithSql>>
  trace: TracingSession['calls']
}> {
  const tracedSession = createTracingSession(client)
  const result = await acquireCustomBundleHoldWithSql(
    tracedSession,
    buildAcquireInput(submission, serverContext),
  )
  return { result, trace: tracedSession.calls }
}

function assertTraceContains(trace: TracingSession['calls'], pattern: RegExp, label: string): void {
  assert.ok(trace.some((call) => pattern.test(call.sql)), label)
}

function assertTraceDoesNotContain(trace: TracingSession['calls'], pattern: RegExp, label: string): void {
  assert.ok(!trace.some((call) => pattern.test(call.sql)), label)
}

function assertTraceAudit(trace: TracingSession['calls']): void {
  for (const call of trace) {
    const normalized = call.sql.trim()
    assert.ok(!/^\s*UPDATE\b/i.test(normalized), 'adapter must not emit UPDATE')
    assert.ok(!/^\s*DELETE\b/i.test(normalized), 'adapter must not emit DELETE')
    assert.ok(!/^\s*ALTER\b/i.test(normalized), 'adapter must not emit ALTER')
    assert.ok(!/^\s*DROP\b/i.test(normalized), 'adapter must not emit DROP')
    assert.ok(!/^\s*TRUNCATE\b/i.test(normalized), 'adapter must not emit TRUNCATE')
    assert.ok(!/^\s*CREATE\b/i.test(normalized), 'adapter must not emit CREATE')
  }
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

  const publicCodePrefixes = [
    'TUR-0707-001',
    'TUR-0707-002',
    'TUR-0707-003',
    'TUR-0707-004',
    'TUR-0707-005',
    'TUR-0707-006',
    'TUR-0707-007',
    'TUR-0707-008',
    'TUR-0707-009',
    'TUR-0707-010',
    'TUR-0707-011',
    'TUR-0707-012',
    'TUR-0707-013',
    'TUR-0707-014',
  ]

  const allTraceCalls: TracingSession['calls'] = []
  let temporaryTriggerCreated = false
  let domainIds: DomainIds | null = null

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

    await assertSchemaShape(client)

    domainIds = await seedCatalog(client)

    const canonicalMixed = buildMixedSubmission()
    const canonicalContext = buildServerContext({ publicCode: 'TUR-0707-001' })
    const canonicalPrepared = prepareCustomBundleHoldContract({
      submission: canonicalMixed,
      serverContext: canonicalContext,
    })
    assert.equal(canonicalPrepared.ok, true)
    if (!canonicalPrepared.ok) {
      throw new Error('Canonical mixed hold contract failed.')
    }
    assert.ok(canonicalPrepared.value.requirements.some((requirement) => requirement.mode === 'no_physical_resource'))

    // Case 1 - canonical mixed acquisition.
    const case1 = await runAcquisition(client, canonicalMixed, canonicalContext)
    allTraceCalls.push(...case1.trace)
    assertResultIsSuccess('mixed hold', case1.result)
    assert.equal(case1.result.stage, 'acquired')
    assert.equal(case1.result.replayed, false)
    assert.equal(case1.result.publicCode, 'TUR-0707-001')
    assert.equal(case1.result.itemCount, 8)
    assert.equal(case1.result.serviceItemCount, 4)
    assert.equal(case1.result.addonItemCount, 2)
    assert.equal(case1.result.includedItemCount, 2)
    assert.equal(case1.result.physicalAllocationCount, 2)
    assert.equal(case1.result.noPhysicalAllocationCount, 2)
    const mixedBundle = await fetchBundleByPublicCode(client, 'TUR-0707-001')
    assertBundle(mixedBundle, 'TUR-0707-001', {
      bookingMode: 'custom_bundle',
      pricingSource: 'server_catalog_v1',
      status: 'under_review',
      estimatedTotalUsd: canonicalPrepared.value.quote.estimate.estimatedTotalUsd,
      currency: 'USD',
      requesterName: 'Ana Perez',
      requesterEmail: 'ana@example.com',
      requesterPhone: '+584121234567',
      eventTitle: 'Solicitud - Arma tu paquete',
      notes: 'Observacion canonical de acquisition',
      internalNotes: '[ops_status:pending_payment]',
      itemExpectations: [
        {
          itemSlug: 'backline-equipamiento',
          itemKind: 'included',
          serviceVariantId: null,
          resourceId: null,
          quantity: 1,
          sessionDurationMinutes: null,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
        {
          itemSlug: 'combo-percusion',
          itemKind: 'addon',
          serviceVariantId: null,
          resourceId: null,
          quantity: 1,
          sessionDurationMinutes: null,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 150,
          lineTotalUsdSnapshot: 150,
          clientPriceDisplay: 'aggregate_only',
        },
        {
          itemSlug: 'consultoria-produccion',
          itemKind: 'service',
          serviceVariantId: 'bkg07b_variant_consultoria',
          resourceId: null,
          quantity: 1,
          sessionDurationMinutes: null,
          durationMinutes: 60,
          unitPriceUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'consultoria-produccion')?.unitPriceUsd ?? 0,
          lineTotalUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'consultoria-produccion')?.lineTotalUsd ?? 0,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'grabaciones-voces',
          itemKind: 'addon',
          serviceVariantId: null,
          resourceId: null,
          quantity: 2,
          sessionDurationMinutes: null,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 40,
          lineTotalUsdSnapshot: 80,
          clientPriceDisplay: 'aggregate_only',
        },
        {
          itemSlug: 'podcast',
          itemKind: 'service',
          serviceVariantId: 'bkg07b_variant_podcast',
          resourceId: 'bkg07b_resource_sala_2',
          quantity: 1,
          sessionDurationMinutes: 120,
          durationMinutes: 120,
          unitPriceUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'podcast')?.unitPriceUsd ?? 0,
          lineTotalUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'podcast')?.lineTotalUsd ?? 0,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'sala-premium',
          itemKind: 'service',
          serviceVariantId: 'bkg07b_variant_sala_premium',
          resourceId: 'bkg07b_resource_sala_3',
          quantity: 2,
          sessionDurationMinutes: null,
          durationMinutes: 120,
          unitPriceUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'sala-premium')?.unitPriceUsd ?? 0,
          lineTotalUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'sala-premium')?.lineTotalUsd ?? 0,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'studio-session',
          itemKind: 'service',
          serviceVariantId: 'bkg07b_variant_studio_session',
          resourceId: null,
          quantity: 1,
          sessionDurationMinutes: 180,
          durationMinutes: 180,
          unitPriceUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'studio-session')?.unitPriceUsd ?? 0,
          lineTotalUsdSnapshot: canonicalPrepared.value.quote.estimate.lines.find((line) => line.item.slug === 'studio-session')?.lineTotalUsd ?? 0,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'tecnico-sonido',
          itemKind: 'included',
          serviceVariantId: null,
          resourceId: null,
          quantity: 1,
          sessionDurationMinutes: null,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
      ],
    })

    // Case 2 - active replay.
    {
      const replay = await runAcquisition(
        client,
        canonicalMixed,
        buildServerContext({ publicCode: 'TUR-0707-099', idempotencyKey: canonicalContext.idempotencyKey }),
      )
      allTraceCalls.push(...replay.trace)
      assertResultIsSuccess('active replay', replay.result)
      assert.equal(replay.result.stage, 'replayed')
      assert.equal(replay.result.replayed, true)
      assert.equal(replay.result.bookingRequestId, case1.result.bookingRequestId)
      assert.equal(replay.result.publicCode, 'TUR-0707-001')
      assert.equal(replay.result.holdExpiresAtIso, case1.result.holdExpiresAtIso)
      assert.equal(replay.result.itemCount, 8)
      assert.equal(replay.trace.filter((call) => /INSERT\s+INTO/i.test(call.sql)).length, 0)
      assertTraceContains(replay.trace, /FOR UPDATE/i, 'active replay must lock idempotency row')
    }

    // Case 3 - key conflict.
    {
      const conflictSubmission = buildMixedSubmission({
        items: buildMixedSubmission().items.map((item) =>
          item.itemSlug === 'sala-premium' ? { ...item, quantity: 3 } : item,
        ),
      })
      const conflict = await runAcquisition(
        client,
        conflictSubmission,
        buildServerContext({ publicCode: 'TUR-0707-098', idempotencyKey: canonicalContext.idempotencyKey }),
      )
      allTraceCalls.push(...conflict.trace)
      assert.equal(conflict.result.ok, false)
      if (!conflict.result.ok) {
        assert.equal(conflict.result.stage, 'idempotency')
        assert.equal(conflict.result.code, 'IDEMPOTENCY_KEY_CONFLICT')
      }
    }

    // Case 4 - expired replay.
    {
      const expired = await runAcquisition(
        client,
        canonicalMixed,
        buildServerContext({
          publicCode: 'TUR-0707-097',
          idempotencyKey: canonicalContext.idempotencyKey,
          now: new Date('2026-06-24T15:01:00.000Z'),
        }),
      )
      allTraceCalls.push(...expired.trace)
      assert.equal(expired.result.ok, false)
      if (!expired.result.ok) {
        assert.equal(expired.result.stage, 'idempotency')
        assert.equal(expired.result.code, 'IDEMPOTENCY_KEY_EXPIRED')
      }
    }

    // Case 5 - new key after expiration.
    {
      const reacquired = await runAcquisition(
        client,
        canonicalMixed,
        buildServerContext({
          publicCode: 'TUR-0707-096',
          idempotencyKey: 'HOLD_2026:06:24-0002',
          now: new Date('2026-06-24T15:02:00.000Z'),
        }),
      )
      allTraceCalls.push(...reacquired.trace)
      assertResultIsSuccess('new key after expiration', reacquired.result)
      assert.equal(reacquired.result.stage, 'acquired')
      assert.equal(reacquired.result.replayed, false)
    }

    // Case 6 - active hold collision on a single physical resource.
    {
      const roomHold = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '12:00' }),
        buildServerContext({ publicCode: 'TUR-0707-010', idempotencyKey: 'HOLD_2026:06:24-0010' }),
      )
      allTraceCalls.push(...roomHold.trace)
      assertResultIsSuccess('room hold', roomHold.result)
      assert.equal(roomHold.result.stage, 'acquired')

      const collision = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '12:30' }),
        buildServerContext({ publicCode: 'TUR-0707-011', idempotencyKey: 'HOLD_2026:06:24-0011' }),
      )
      allTraceCalls.push(...collision.trace)
      assert.equal(collision.result.ok, false)
      if (!collision.result.ok) {
        assert.equal(collision.result.stage, 'collision')
        assert.equal(collision.result.code, 'RESOURCE_UNAVAILABLE')
      }
    }

    // Case 7 - half-open intervals.
    {
      const leftTouch = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '13:00' }),
        buildServerContext({ publicCode: 'TUR-0707-012', idempotencyKey: 'HOLD_2026:06:24-0012' }),
      )
      allTraceCalls.push(...leftTouch.trace)
      assertResultIsSuccess('left-touch hold', leftTouch.result)
      assert.equal(leftTouch.result.stage, 'acquired')

      const rightTouch = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '14:00' }),
        buildServerContext({ publicCode: 'TUR-0707-013', idempotencyKey: 'HOLD_2026:06:24-0013' }),
      )
      allTraceCalls.push(...rightTouch.trace)
      assertResultIsSuccess('right-touch hold', rightTouch.result)
      assert.equal(rightTouch.result.stage, 'acquired')
    }

    // Case 8 - no physical hold while physical resources are occupied.
    {
      const noPhysical = await runAcquisition(
        client,
        buildNoPhysicalSubmission(),
        buildServerContext({ publicCode: 'TUR-0707-014', idempotencyKey: 'HOLD_2026:06:24-0014', now: new Date('2026-06-24T14:30:00.000Z') }),
      )
      allTraceCalls.push(...noPhysical.trace)
      assertResultIsSuccess('no physical hold', noPhysical.result)
      assert.equal(noPhysical.result.stage, 'acquired')
      const bundle = await fetchBundleByPublicCode(client, 'TUR-0707-014')
      assertBundle(bundle, 'TUR-0707-014', {
        bookingMode: 'custom_bundle',
        pricingSource: 'server_catalog_v1',
        status: 'under_review',
        estimatedTotalUsd: noPhysical.result.estimatedTotalUsd,
        currency: 'USD',
        requesterName: 'Ana Perez',
        requesterEmail: 'ana@example.com',
        requesterPhone: '+584121234567',
        eventTitle: 'Solicitud - Arma tu paquete',
        notes: 'Sin recurso fisico',
        internalNotes: '[ops_status:pending_payment]',
        itemExpectations: bundle.items.map((row) => ({
          itemSlug: row.itemSlug ?? '',
          itemKind: row.itemKind as 'service' | 'addon' | 'included',
          serviceVariantId: row.serviceVariantId,
          resourceId: row.resourceId,
          quantity: row.quantity,
          sessionDurationMinutes: row.sessionDurationMinutes,
          durationMinutes: row.durationMinutes ?? 0,
          unitPriceUsdSnapshot: normalizeMoney(row.unitPriceUsdSnapshot),
          lineTotalUsdSnapshot: normalizeMoney(row.lineTotalUsdSnapshot),
          clientPriceDisplay: row.clientPriceDisplay as 'itemized' | 'aggregate_only' | 'included',
        })),
      })
      assert.equal(bundle.items.find((row) => row.itemSlug === 'studio-session')?.resourceId, null)
      assert.equal(bundle.items.find((row) => row.itemSlug === 'consultoria-produccion')?.resourceId, null)
      assertTraceDoesNotContain(noPhysical.trace, /FROM\s+"resources"/i, 'no physical hold must not query resources')
    }

    // Case 9 - public code conflict.
    {
      const first = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '18:00' }),
        buildServerContext({ publicCode: 'TUR-0707-090', idempotencyKey: 'HOLD_2026:06:24-0090' }),
      )
      allTraceCalls.push(...first.trace)
      assertResultIsSuccess('public code seed', first.result)

      const conflict = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '20:00' }),
        buildServerContext({ publicCode: 'TUR-0707-090', idempotencyKey: 'HOLD_2026:06:24-0091' }),
      )
      allTraceCalls.push(...conflict.trace)
      assert.equal(conflict.result.ok, false)
      if (!conflict.result.ok) {
        assert.equal(conflict.result.stage, 'persistence')
        assert.equal(conflict.result.code, 'PUBLIC_CODE_CONFLICT')
      }
    }

    // Case 10 - variant absent.
    {
      await client.query(`DELETE FROM "service_variants" WHERE slug = 'locucion-por-hora'`)
      const missing = await runAcquisition(
        client,
        buildPluginSubmission(),
        buildServerContext({ publicCode: 'TUR-0707-091', idempotencyKey: 'HOLD_2026:06:24-0092' }),
      )
      allTraceCalls.push(...missing.trace)
      assert.equal(missing.result.ok, false)
      if (!missing.result.ok) {
        assert.equal(missing.result.stage, 'catalog_resolution')
      }
      await assertNoBundleByPublicCode(client, 'TUR-0707-091', 'missing variant case')
    }

    // Case 11 - rollback partial.
    {
      await client.query(`
        CREATE OR REPLACE FUNCTION bkg07b_fail_grabaciones_voces()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW."itemSlug" = 'grabaciones-voces' THEN
            RAISE EXCEPTION 'bkg07b test failure';
          END IF;
          RETURN NEW;
        END;
        $$;
      `)
      await client.query(`
        DROP TRIGGER IF EXISTS bkg07b_fail_grabaciones_voces_trigger ON "booking_request_items";
        CREATE TRIGGER bkg07b_fail_grabaciones_voces_trigger
        BEFORE INSERT ON "booking_request_items"
        FOR EACH ROW
        EXECUTE FUNCTION bkg07b_fail_grabaciones_voces();
      `)
      temporaryTriggerCreated = true

      const rollback = await runAcquisition(
        client,
        buildMixedSubmission({ startTime: '20:00' }),
        buildServerContext({ publicCode: 'TUR-0707-092', idempotencyKey: 'HOLD_2026:06:24-0093' }),
      )
      allTraceCalls.push(...rollback.trace)
      assert.equal(rollback.result.ok, false)
      if (!rollback.result.ok) {
        assert.equal(rollback.result.stage, 'persistence')
        assert.equal(rollback.result.code, 'DATABASE_WRITE_FAILED')
      }
      await assertNoBundleByPublicCode(client, 'TUR-0707-092', 'rollback case')
      await client.query(`DROP TRIGGER IF EXISTS bkg07b_fail_grabaciones_voces_trigger ON "booking_request_items"`)
      await client.query(`DROP FUNCTION IF EXISTS bkg07b_fail_grabaciones_voces()`)
      temporaryTriggerCreated = false
    }

    // Case 12 - concurrency same key.
    {
      const firstClient = new Client({ connectionString })
      const secondClient = new Client({ connectionString })
      await Promise.all([firstClient.connect(), secondClient.connect()])
      try {
        const inputA = buildAcquireInput(
          buildMixedSubmission({ startTime: '21:00' }),
          buildServerContext({ publicCode: 'TUR-0707-093', idempotencyKey: 'HOLD_2026:06:24-0094' }),
        )
        const inputB = buildAcquireInput(
          buildMixedSubmission({ startTime: '21:00' }),
          buildServerContext({ publicCode: 'TUR-0707-094', idempotencyKey: 'HOLD_2026:06:24-0094' }),
        )
        const [resultA, resultB] = await Promise.all([
          acquireCustomBundleHoldWithSql(createTracingSession(firstClient), inputA),
          acquireCustomBundleHoldWithSql(createTracingSession(secondClient), inputB),
        ])
        console.log('case12 resultA:', describeHoldAcquisitionResult(resultA))
        console.log('case12 resultB:', describeHoldAcquisitionResult(resultB))
        assert.ok([resultA, resultB].some((result) => result.ok && result.stage === 'acquired'))
        assert.ok([resultA, resultB].some((result) => result.ok && result.stage === 'replayed'))
        const bundleRows = await queryRows<BookingRequestRow>(
          client,
          `SELECT id, "publicCode" FROM "booking_requests" WHERE "idempotencyKey" = $1`,
          ['HOLD_2026:06:24-0094'],
        )
        assert.equal(bundleRows.length, 1)
      } finally {
        await Promise.all([firstClient.end(), secondClient.end()])
      }
    }

    // Case 13 - concurrency same slot.
    {
      const firstClient = new Client({ connectionString })
      const secondClient = new Client({ connectionString })
      await Promise.all([firstClient.connect(), secondClient.connect()])
      try {
        const inputA = buildAcquireInput(
          buildRoomOnlySubmission({ startTime: '22:00' }),
          buildServerContext({ publicCode: 'TUR-0707-095', idempotencyKey: 'HOLD_2026:06:24-0095' }),
        )
        const inputB = buildAcquireInput(
          buildRoomOnlySubmission({ startTime: '22:00' }),
          buildServerContext({ publicCode: 'TUR-0707-096', idempotencyKey: 'HOLD_2026:06:24-0096' }),
        )
        const [resultA, resultB] = await Promise.all([
          acquireCustomBundleHoldWithSql(createTracingSession(firstClient), inputA),
          acquireCustomBundleHoldWithSql(createTracingSession(secondClient), inputB),
        ])
        console.log('case13 resultA:', describeHoldAcquisitionResult(resultA))
        console.log('case13 resultB:', describeHoldAcquisitionResult(resultB))
        assert.ok([resultA, resultB].some((result) => result.ok && result.stage === 'acquired'))
        assert.ok([resultA, resultB].some((result) => !result.ok && (result.stage === 'collision' || (result.stage === 'persistence' && result.code === 'TRANSACTION_RETRY_EXHAUSTED'))))
        const bundleRows = await queryRows<BookingRequestRow>(
          client,
          `SELECT id, "publicCode" FROM "booking_requests" WHERE "publicCode" IN ('TUR-0707-095', 'TUR-0707-096')`,
        )
        assert.equal(bundleRows.length, 1)
      } finally {
        await Promise.all([firstClient.end(), secondClient.end()])
      }
    }

    // Case 14 - hold expired but payment reported still blocks.
    {
      const seed = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '23:00' }),
        buildServerContext({ publicCode: 'TUR-0707-097', idempotencyKey: 'HOLD_2026:06:24-0097' }),
      )
      allTraceCalls.push(...seed.trace)
      assertResultIsSuccess('payment reported seed', seed.result)

      const seededBundle = await fetchBundleByPublicCode(client, 'TUR-0707-097')
      assert.ok(seededBundle.bookingRequest)
      await client.query(
        `
          UPDATE "booking_requests"
          SET "internalNotes" = '[ops_status:payment_reported]',
              "holdExpiresAt" = $2
          WHERE id = $1
        `,
        [seededBundle.bookingRequest!.id, new Date('2026-06-24T13:30:00.000Z')],
      )

      const blocked = await runAcquisition(
        client,
        buildRoomOnlySubmission({ startTime: '23:00' }),
        buildServerContext({ publicCode: 'TUR-0707-098', idempotencyKey: 'HOLD_2026:06:24-0098' }),
      )
      allTraceCalls.push(...blocked.trace)
      assert.equal(blocked.result.ok, false)
      if (!blocked.result.ok) {
        assert.equal(blocked.result.stage, 'collision')
      }
    }

    assertTraceAudit(allTraceCalls)
    assertTraceContains(allTraceCalls, /BEGIN ISOLATION LEVEL SERIALIZABLE/i, 'adapter must begin transactions')
    assertTraceContains(allTraceCalls, /FOR UPDATE/i, 'adapter must use FOR UPDATE for idempotency')
    assertTraceContains(allTraceCalls, /INSERT INTO "booking_requests"/i, 'adapter must insert booking requests')
    assertTraceContains(allTraceCalls, /INSERT INTO "booking_request_items"/i, 'adapter must insert booking request items')
    assertTraceContains(allTraceCalls, /FROM "booking_requests"/i, 'adapter must read booking requests during replay and verification')
    assertTraceContains(allTraceCalls, /FROM "booking_request_items"/i, 'adapter must read booking request items during verification')
    assertTraceContains(allTraceCalls, /FROM "resources"/i, 'adapter must consult resources for physical allocations')
    assertTraceContains(allTraceCalls, /COMMIT/i, 'adapter must commit successful acquisitions')
    assertTraceContains(allTraceCalls, /ROLLBACK/i, 'adapter must rollback replay, conflict or failure paths')

    // Cleanup.
    await client.query(`DELETE FROM "booking_request_items" bri USING "booking_requests" br WHERE bri."bookingRequestId" = br.id AND br."publicCode" LIKE 'TUR-0707-%'`)
    await client.query(`DELETE FROM "booking_requests" WHERE "publicCode" LIKE 'TUR-0707-%'`)
    await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg07b_variant_%'`)
    await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg07b_service_%'`)
    await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg07b_resource_%'`)

    const cleanupCounts = await queryRows<{
      request_count: number
      item_count: number
      service_count: number
      variant_count: number
      resource_count: number
    }>(
      client,
      `
        SELECT
          COUNT(*) FILTER (WHERE "publicCode" LIKE 'TUR-0707-%')::int AS request_count,
          COUNT(*) FILTER (WHERE bri.id IS NOT NULL)::int AS item_count,
          (SELECT COUNT(*)::int FROM "services" WHERE id LIKE 'bkg07b_service_%') AS service_count,
          (SELECT COUNT(*)::int FROM "service_variants" WHERE id LIKE 'bkg07b_variant_%') AS variant_count,
          (SELECT COUNT(*)::int FROM "resources" WHERE id LIKE 'bkg07b_resource_%') AS resource_count
        FROM "booking_requests" br
        LEFT JOIN "booking_request_items" bri ON bri."bookingRequestId" = br.id
        WHERE br."publicCode" LIKE 'TUR-0707-%'
      `,
    )

    assert.equal(cleanupCounts[0]?.request_count ?? 0, 0)
    assert.equal(cleanupCounts[0]?.item_count ?? 0, 0)
    assert.equal(cleanupCounts[0]?.service_count ?? 0, 0)
    assert.equal(cleanupCounts[0]?.variant_count ?? 0, 0)
    assert.equal(cleanupCounts[0]?.resource_count ?? 0, 0)

    assert.equal(temporaryTriggerCreated, false)

    console.log('booking_isolated_custom_bundle_hold_acquisition OK')
    console.log('mixed hold: verified')
    console.log('active replay: verified')
    console.log('expired replay: verified')
    console.log('idempotency conflict: verified')
    console.log('active hold collision: verified')
    console.log('expired hold release: verified')
    console.log('no physical hold: verified')
    console.log('concurrent same key: verified')
    console.log('concurrent slot: verified')
    console.log('partial rollback: verified')
    console.log('cleanup: verified')
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    if (temporaryTriggerCreated) {
      await client.query(`DROP TRIGGER IF EXISTS bkg07b_fail_grabaciones_voces_trigger ON "booking_request_items"`).catch(() => {})
      await client.query(`DROP FUNCTION IF EXISTS bkg07b_fail_grabaciones_voces()`).catch(() => {})
    }

    if (domainIds) {
      await client.query(`DELETE FROM "booking_request_items" bri USING "booking_requests" br WHERE bri."bookingRequestId" = br.id AND br."publicCode" LIKE 'TUR-0707-%'`).catch(() => {})
      await client.query(`DELETE FROM "booking_requests" WHERE "publicCode" LIKE 'TUR-0707-%'`).catch(() => {})
      await client.query(`DELETE FROM "service_variants" WHERE id LIKE 'bkg07b_variant_%'`).catch(() => {})
      await client.query(`DELETE FROM "services" WHERE id LIKE 'bkg07b_service_%'`).catch(() => {})
      await client.query(`DELETE FROM "resources" WHERE id LIKE 'bkg07b_resource_%'`).catch(() => {})
    }

    await client.end().catch(() => {})
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
