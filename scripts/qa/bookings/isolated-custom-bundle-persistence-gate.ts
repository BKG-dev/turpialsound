import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  persistCustomBundleSubmissionWithSql,
  type CustomBundleSqlExecutor,
} from '@/lib/bookings/custom-bundle-persistence'
import { CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE } from '@/lib/bookings/custom-bundle-repricing'
import type {
  CustomBundleSubmissionInputV1,
  CustomBundleSubmissionItemInputV1,
} from '@/lib/bookings/custom-bundle-submission'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

const ALLOWED_PROPOSED_SQL_PATTERNS = [
  /CREATE\s+TYPE\s+"booking_mode"/i,
  /CREATE\s+TYPE\s+"booking_item_kind"/i,
  /ALTER\s+TABLE\s+"booking_requests"/i,
  /ALTER\s+TABLE\s+"booking_request_items"/i,
  /CREATE\s+INDEX\s+"booking_request_items_item_slug_idx"/i,
  /CREATE\s+UNIQUE\s+INDEX\s+"booking_request_items_booking_request_id_item_slug_key"/i,
]

type BookingRequestRow = {
  id: string
  publicCode: string
  bookingMode: string
  pricingSource: string | null
  status: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  eventTitle: string
  notes: string | null
  internalNotes: string | null
  estimatedTotal: string | number | null
  currency: string
}

type BookingRequestItemRow = {
  itemSlug: string | null
  itemName: string | null
  itemKind: string | null
  serviceVariantId: string | null
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

type BundleExpectation = {
  itemSlug: string
  itemKind: 'service' | 'addon' | 'included'
  serviceVariantId: string | null
  quantity: number
  sessionDurationMinutes: number
  durationMinutes: number
  unitPriceUsdSnapshot: number
  lineTotalUsdSnapshot: number
  clientPriceDisplay: 'itemized' | 'aggregate_only' | 'included'
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_persistence FAILED')
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
    [/marketplace/i, 'marketplace'],
    [/neon/i, 'neon'],
    [/supabase/i, 'supabase'],
    [/vercel/i, 'vercel'],
  ]

  if (!options.allowMarketplaceTables) {
    forbiddenPatterns.splice(5, 0, [/\bmp_/i, 'marketplace table prefix'])
  }

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${forbiddenLabel}.`)
    }
  }
}

function assertAllowedProposedSql(sql: string): void {
  for (const pattern of ALLOWED_PROPOSED_SQL_PATTERNS) {
    assert.ok(pattern.test(sql), `Proposed SQL is missing the expected pattern: ${pattern}.`)
  }
  assertNoForbiddenSql(sql, 'Proposed SQL')
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

function caseSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> & {
    items?: CustomBundleSubmissionItemInputV1[]
  } = {},
): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observaciones del cliente  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 2,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'combo-percusion',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabaciones-voces',
        quantity: 2,
        sessionDurationMinutes: null,
      },
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

async function queryRows<Row = Record<string, unknown>>(
  client: Client,
  sql: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await client.query<Row>(sql, [...values])
  return result.rows
}

async function collectMarketplaceColumns(client: Client): Promise<Array<Record<string, unknown>>> {
  return queryRows(
    client,
    `
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'mp_%'
      ORDER BY table_name, ordinal_position
    `,
  )
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
    data_type: string
    udt_name: string
    is_nullable: string
    column_default: string | null
  }>(
    client,
    `
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('booking_requests', 'booking_request_items')
        AND column_name IN (
          'bookingMode',
          'pricingSource',
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
    `,
  )

  const columns = new Map(columnRows.map((row) => [`${row.table_name}.${row.column_name}`, row]))

  function assertColumn(
    tableName: string,
    columnName: string,
    expectations: {
      dataType?: string
      udtName?: string
      nullable?: boolean
      defaultIncludes?: string
    },
  ): void {
    const key = `${tableName}.${columnName}`
    const column = columns.get(key)
    assert.ok(column, `Missing column: ${key}`)

    if (expectations.dataType) {
      assert.equal(column?.data_type, expectations.dataType, `${key} data_type`)
    }
    if (expectations.udtName) {
      assert.equal(column?.udt_name, expectations.udtName, `${key} udt_name`)
    }
    if (typeof expectations.nullable === 'boolean') {
      assert.equal(
        column?.is_nullable,
        expectations.nullable ? 'YES' : 'NO',
        `${key} is_nullable`,
      )
    }
    if (expectations.defaultIncludes) {
      assert.ok(
        String(column?.column_default ?? '').includes(expectations.defaultIncludes),
        `${key} default`,
      )
    }
  }

  assertColumn('booking_requests', 'bookingMode', {
    dataType: 'USER-DEFINED',
    udtName: 'booking_mode',
    nullable: false,
    defaultIncludes: 'single',
  })
  assertColumn('booking_requests', 'pricingSource', {
    dataType: 'text',
    nullable: true,
  })
  assertColumn('booking_request_items', 'serviceVariantId', {
    nullable: true,
  })
  assertColumn('booking_request_items', 'itemSlug', {
    dataType: 'text',
    nullable: true,
  })
  assertColumn('booking_request_items', 'itemName', {
    dataType: 'text',
    nullable: true,
  })
  assertColumn('booking_request_items', 'itemKind', {
    dataType: 'USER-DEFINED',
    udtName: 'booking_item_kind',
    nullable: true,
  })
  assertColumn('booking_request_items', 'sessionDurationMinutes', {
    dataType: 'integer',
    nullable: true,
  })
  assertColumn('booking_request_items', 'durationMinutes', {
    dataType: 'integer',
    nullable: true,
  })
  assertColumn('booking_request_items', 'unitPriceUsdSnapshot', {
    dataType: 'numeric',
    nullable: true,
  })
  assertColumn('booking_request_items', 'lineTotalUsdSnapshot', {
    dataType: 'numeric',
    nullable: true,
  })
  assertColumn('booking_request_items', 'clientPriceDisplay', {
    dataType: 'text',
    nullable: true,
  })

  const indexRows = await queryRows<{
    indexname: string
    indexdef: string
  }>(
    client,
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'booking_request_items'
    `,
  )
  const indexMap = new Map(indexRows.map((row) => [row.indexname, row.indexdef]))
  assert.ok(indexMap.has('booking_request_items_item_slug_idx'))
  assert.ok(indexMap.has('booking_request_items_booking_request_id_item_slug_key'))
  assert.match(
    indexMap.get('booking_request_items_item_slug_idx') ?? '',
    /ON public\.booking_request_items USING btree \("itemSlug"\)/,
  )
  assert.match(
    indexMap.get('booking_request_items_booking_request_id_item_slug_key') ?? '',
    /UNIQUE.*\("bookingRequestId", "itemSlug"\)/,
  )
}

async function seedCatalog(client: Client): Promise<{
  serviceIds: Record<string, string>
  variantIds: Record<string, string>
}> {
  const services: ServiceSeed[] = [
    { id: 'svc_sala', slug: 'sala-ensayo', name: 'Sala de ensayo' },
    { id: 'svc_grabacion', slug: 'grabacion', name: 'Grabacion' },
    {
      id: 'svc_mezcla',
      slug: 'mezcla-masterizacion',
      name: 'Mezcla y masterizacion',
    },
    {
      id: 'svc_podcast',
      slug: 'podcast-locucion',
      name: 'Podcast / locucion',
    },
    { id: 'svc_video', slug: 'video-session', name: 'Video Session' },
    {
      id: 'svc_arreglos',
      slug: 'arreglos-musicales',
      name: 'Arreglos musicales',
    },
    { id: 'svc_consultoria', slug: 'consultoria', name: 'Consultoria' },
  ]

  for (const service of services) {
    await client.query(
      `
        INSERT INTO "services" ("id", "slug", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `,
      [service.id, service.slug, service.name, `${service.name} de prueba`, service.isActive ?? true],
    )
  }

  const variants: ServiceVariantSeed[] = [
    {
      id: 'svc_var_sala_premium',
      slug: 'sala-ensayo-premium',
      name: 'Sala Premium',
      serviceId: 'svc_sala',
    },
    {
      id: 'svc_var_sala_prioritaria',
      slug: 'sala-ensayo-prioritaria',
      name: 'Sala Prioritaria',
      serviceId: 'svc_sala',
    },
    {
      id: 'svc_var_grabacion_estudio',
      slug: 'grabacion-hora-estudio',
      name: 'Grabacion en estudio',
      serviceId: 'svc_grabacion',
    },
    {
      id: 'svc_var_mezcla',
      slug: 'mezcla-por-tema',
      name: 'Mezcla',
      serviceId: 'svc_mezcla',
    },
    {
      id: 'svc_var_master',
      slug: 'master-por-tema',
      name: 'Master',
      serviceId: 'svc_mezcla',
    },
    {
      id: 'svc_var_podcast',
      slug: 'podcast-por-episodio',
      name: 'Podcast',
      serviceId: 'svc_podcast',
    },
    {
      id: 'svc_var_studio_session',
      slug: 'studio-session-fija',
      name: 'Studio Session',
      serviceId: 'svc_video',
    },
    {
      id: 'svc_var_arreglo',
      slug: 'arreglos-musicales-por-tema',
      name: 'Arreglo por tema',
      serviceId: 'svc_arreglos',
    },
    {
      id: 'svc_var_consultoria_wrong_service',
      slug: 'consultoria-produccion',
      name: 'Clase / consultoria de produccion',
      serviceId: 'svc_sala',
    },
  ]

  for (const variant of variants) {
    await client.query(
      `
        INSERT INTO "service_variants" ("id", "slug", "name", "description", "isActive", "serviceId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [variant.id, variant.slug, variant.name, `${variant.name} de prueba`, variant.isActive ?? true, variant.serviceId],
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
        "id",
        "publicCode",
        "bookingMode",
        "pricingSource",
        "status",
        "requesterName",
        "requesterEmail",
        "requesterPhone",
        "eventTitle",
        "notes",
        "internalNotes",
        "estimatedTotal",
        "currency"
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
        "quantity",
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
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
  expectation: BundleExpectation,
  label: string,
): void {
  assert.equal(row.itemSlug, expectation.itemSlug, `${label} itemSlug`)
  assert.equal(row.itemKind, expectation.itemKind, `${label} itemKind`)
  assert.equal(row.serviceVariantId, expectation.serviceVariantId, `${label} serviceVariantId`)
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
    itemExpectations: BundleExpectation[]
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
  assertMoneyValue(bookingRequest.estimatedTotal, expectations.estimatedTotalUsd, 'estimatedTotal')
  assert.equal(bundle.items.length, expectations.itemExpectations.length)

  const itemsBySlug = new Map(bundle.items.map((row) => [row.itemSlug ?? '', row]))
  for (const expectation of expectations.itemExpectations) {
    const row = itemsBySlug.get(expectation.itemSlug)
    assert.ok(row, `missing persisted item ${expectation.itemSlug}`)
    assertItem(row as BookingRequestItemRow, expectation, expectation.itemSlug)
  }
}

function assertResultIsPriced(
  label: string,
  result: Awaited<ReturnType<typeof persistCustomBundleSubmissionWithSql>>,
): asserts result is Extract<
  Awaited<ReturnType<typeof persistCustomBundleSubmissionWithSql>>,
  { ok: true }
> {
  if (!result.ok) {
    throw new Error(`${label} returned stage ${result.stage}`)
  }
}

async function main(): Promise<void> {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const baselinePath = process.argv[2]
  const proposedPath = process.argv[3]
  if (!baselinePath || !proposedPath) {
    fail(
      'Usage: pnpm exec tsx scripts/qa/bookings/isolated-custom-bundle-persistence-gate.ts <baseline.sql> <proposed.sql>',
    )
  }

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const baselineSql = readSqlFile(baselinePath)
  const proposedSql = readSqlFile(proposedPath)

  if (baselineSql.trim().length === 0) {
    fail('Baseline SQL is empty.')
  }

  if (proposedSql.trim().length === 0) {
    fail('Proposed SQL is empty.')
  }

  assertNoForbiddenSql(baselineSql, 'Baseline SQL', { allowMarketplaceTables: true })
  assertAllowedProposedSql(proposedSql)

  const client = new Client({
    connectionString,
  })

  const marketplaceColumnsBefore = await (async () => {
    await client.connect()
    const identityRows = await queryRows<{
      database_name: string
      user_name: string
    }>(client, 'SELECT current_database() AS database_name, current_user AS user_name')
    assert.equal(identityRows[0]?.database_name, EXPECTED_DATABASE)
    assert.equal(identityRows[0]?.user_name, EXPECTED_USER)
    const before = await collectMarketplaceColumns(client)
    await client.query(baselineSql)
    await client.query(proposedSql)
    console.log('checkpoint baseline applied')
    return before
  })()

  try {
    const seedResult = await seedCatalog(client)
    void seedResult
    console.log('checkpoint catalog seeded')

    await assertSchemaShape(client)
    console.log('checkpoint schema validated')

    const executor = client as unknown as CustomBundleSqlExecutor

    let case1: Awaited<ReturnType<typeof persistCustomBundleSubmissionWithSql>>
    try {
      case1 = await persistCustomBundleSubmissionWithSql(executor, {
        submission: caseSubmission(),
        publicCode: 'TUR-2099-001',
        submittedAt: new Date('2099-01-01T12:00:00.000Z'),
      })
    } catch (error) {
      console.log('case1 threw', JSON.stringify(error, null, 2))
      throw error
    }
    console.log('case1 result', JSON.stringify(case1))
    assertResultIsPriced('case1', case1)
    assert.equal(case1.stage, 'persisted')
    assert.equal(case1.publicCode, 'TUR-2099-001')
    assert.equal(case1.estimatedTotalUsd, 280)
    assert.equal(case1.totalDurationMinutes, 120)
    assert.equal(case1.serviceItemCount, 1)
    assert.equal(case1.addonItemCount, 2)
    assert.equal(case1.includedItemCount, 2)
    assert.equal(case1.eventEndDateIso, '2026-06-24T16:00:00.000Z')
    assert.equal(
      new Date(case1.eventEndDateIso).getTime() - new Date(case1.eventDateIso).getTime(),
      120 * 60 * 1000,
    )
    assertBundle(await fetchBundleByPublicCode(client, 'TUR-2099-001'), 'TUR-2099-001', {
      bookingMode: 'custom_bundle',
      pricingSource: CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
      status: 'under_review',
      estimatedTotalUsd: 280,
      currency: 'USD',
      requesterName: 'Ana Perez',
      requesterEmail: 'ana@example.com',
      requesterPhone: '+584121234567',
      eventTitle: 'Solicitud - Arma tu paquete',
      notes: 'Observaciones del cliente',
      itemExpectations: [
        {
          itemSlug: 'sala-premium',
          itemKind: 'service',
          serviceVariantId: 'svc_var_sala_premium',
          quantity: 2,
          sessionDurationMinutes: 120,
          durationMinutes: 120,
          unitPriceUsdSnapshot: 25,
          lineTotalUsdSnapshot: 50,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'combo-percusion',
          itemKind: 'addon',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 150,
          lineTotalUsdSnapshot: 150,
          clientPriceDisplay: 'aggregate_only',
        },
        {
          itemSlug: 'grabaciones-voces',
          itemKind: 'addon',
          serviceVariantId: null,
          quantity: 2,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 40,
          lineTotalUsdSnapshot: 80,
          clientPriceDisplay: 'aggregate_only',
        },
        {
          itemSlug: 'tecnico-sonido',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
        {
          itemSlug: 'backline-equipamiento',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
      ],
    })

    const case2 = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        eventDate: '2026-06-21',
        items: [
          {
            itemSlug: 'sala-prioritaria',
            quantity: 2,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-002',
      submittedAt: new Date('2099-01-02T12:00:00.000Z'),
    })
    assertResultIsPriced('case2', case2)
    assert.equal(case2.stage, 'persisted')
    assert.equal(case2.estimatedTotalUsd, 70)
    assert.equal(case2.totalDurationMinutes, 120)
    assert.equal(case2.serviceItemCount, 1)
    assert.equal(case2.addonItemCount, 0)
    assert.equal(case2.includedItemCount, 2)
    assert.equal(
      new Date(case2.eventEndDateIso).getTime() - new Date(case2.eventDateIso).getTime(),
      120 * 60 * 1000,
    )
    assertBundle(await fetchBundleByPublicCode(client, 'TUR-2099-002'), 'TUR-2099-002', {
      bookingMode: 'custom_bundle',
      pricingSource: CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
      status: 'under_review',
      estimatedTotalUsd: 70,
      currency: 'USD',
      requesterName: 'Ana Perez',
      requesterEmail: 'ana@example.com',
      requesterPhone: '+584121234567',
      eventTitle: 'Solicitud - Arma tu paquete',
      notes: 'Observaciones del cliente',
      itemExpectations: [
        {
          itemSlug: 'sala-prioritaria',
          itemKind: 'service',
          serviceVariantId: 'svc_var_sala_prioritaria',
          quantity: 2,
          sessionDurationMinutes: 120,
          durationMinutes: 120,
          unitPriceUsdSnapshot: 30,
          lineTotalUsdSnapshot: 60,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'tecnico-sonido',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
        {
          itemSlug: 'backline-equipamiento',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
      ],
    })

    const contractResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: {
        ...caseSubmission(),
        estimatedTotalUsd: 1,
      },
      publicCode: 'TUR-2099-003',
      submittedAt: new Date('2099-01-03T12:00:00.000Z'),
    })
    assert.equal(contractResult.ok, false)
    assert.equal(contractResult.stage, 'contract')
    await assertNoBundleByPublicCode(client, 'TUR-2099-003', 'contract failure')

    const businessResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'sala-flexible',
            quantity: 1,
            sessionDurationMinutes: null,
          },
          {
            itemSlug: 'sala-premium',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-004',
      submittedAt: new Date('2099-01-04T12:00:00.000Z'),
    })
    assert.equal(businessResult.ok, false)
    assert.equal(businessResult.stage, 'business_rules')
    await assertNoBundleByPublicCode(client, 'TUR-2099-004', 'business rules failure')

    const missingVariantResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'grabacion-ensayo',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-005',
      submittedAt: new Date('2099-01-05T12:00:00.000Z'),
    })
    assert.equal(missingVariantResult.ok, false)
    assert.equal(missingVariantResult.stage, 'catalog_resolution')
    assert.equal(missingVariantResult.code, 'SERVICE_VARIANT_NOT_FOUND')
    await assertNoBundleByPublicCode(client, 'TUR-2099-005', 'missing variant')

    const firstDuplicateResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'mezcla',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-006',
      submittedAt: new Date('2099-01-06T12:00:00.000Z'),
    })
    assertResultIsPriced('case6-first-duplicate', firstDuplicateResult)
    const secondDuplicateResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'master',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-006',
      submittedAt: new Date('2099-01-06T12:30:00.000Z'),
    })
    assert.equal(secondDuplicateResult.ok, false)
    assert.equal(secondDuplicateResult.stage, 'persistence')
    assert.equal(secondDuplicateResult.code, 'PUBLIC_CODE_CONFLICT')
    assertBundle(await fetchBundleByPublicCode(client, 'TUR-2099-006'), 'TUR-2099-006', {
      bookingMode: 'custom_bundle',
      pricingSource: CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
      status: 'under_review',
      estimatedTotalUsd: 240,
      currency: 'USD',
      requesterName: 'Ana Perez',
      requesterEmail: 'ana@example.com',
      requesterPhone: '+584121234567',
      eventTitle: 'Solicitud - Arma tu paquete',
      notes: 'Observaciones del cliente',
      itemExpectations: [
        {
          itemSlug: 'mezcla',
          itemKind: 'service',
          serviceVariantId: 'svc_var_mezcla',
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 150,
          lineTotalUsdSnapshot: 150,
          clientPriceDisplay: 'itemized',
        },
        {
          itemSlug: 'tecnico-sonido',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
        {
          itemSlug: 'backline-equipamiento',
          itemKind: 'included',
          serviceVariantId: null,
          quantity: 1,
          sessionDurationMinutes: 0,
          durationMinutes: 0,
          unitPriceUsdSnapshot: 0,
          lineTotalUsdSnapshot: 0,
          clientPriceDisplay: 'included',
        },
      ],
    })

    await client.query(
      `
        CREATE OR REPLACE FUNCTION pg_temp.turpial_fail_on_instrumentos()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW."itemSlug" = 'instrumentos-adicionales' THEN
            RAISE EXCEPTION 'instrumentos-adicionales is blocked in the isolation gate';
          END IF;
          RETURN NEW;
        END;
        $$;
      `,
    )
    await client.query(
      `
        CREATE TRIGGER turpial_fail_on_instrumentos
        BEFORE INSERT ON "booking_request_items"
        FOR EACH ROW
        EXECUTE FUNCTION pg_temp.turpial_fail_on_instrumentos();
      `,
    )

    const rollbackResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: 1,
            sessionDurationMinutes: null,
          },
          {
            itemSlug: 'instrumentos-adicionales',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-007',
      submittedAt: new Date('2099-01-07T12:00:00.000Z'),
    })
    assert.equal(rollbackResult.ok, false)
    assert.equal(rollbackResult.stage, 'persistence')
    assert.equal(rollbackResult.code, 'DATABASE_WRITE_FAILED')
    await assertNoBundleByPublicCode(client, 'TUR-2099-007', 'rollback failure')

    await client.query('DROP TRIGGER IF EXISTS turpial_fail_on_instrumentos ON "booking_request_items"')
    await client.query('DROP FUNCTION IF EXISTS pg_temp.turpial_fail_on_instrumentos()')

    const serviceMismatchResult = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'consultoria-produccion',
            quantity: 1,
            sessionDurationMinutes: 60,
          },
        ],
      }),
      publicCode: 'TUR-2099-008',
      submittedAt: new Date('2099-01-08T12:00:00.000Z'),
    })
    assert.equal(serviceMismatchResult.ok, false)
    assert.equal(serviceMismatchResult.stage, 'catalog_resolution')
    assert.equal(serviceMismatchResult.code, 'SERVICE_VARIANT_SERVICE_MISMATCH')
    await assertNoBundleByPublicCode(client, 'TUR-2099-008', 'service mismatch')

    const isolationFirst = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'master',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-009',
      submittedAt: new Date('2099-01-09T12:00:00.000Z'),
    })
    assertResultIsPriced('case9-first-isolation', isolationFirst)
    const isolationSecond = await persistCustomBundleSubmissionWithSql(executor, {
      submission: caseSubmission({
        eventDate: '2026-06-25',
        items: [
          {
            itemSlug: 'master',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-010',
      submittedAt: new Date('2099-01-10T12:00:00.000Z'),
    })
    assertResultIsPriced('case9-second-isolation', isolationSecond)

    const masterRows = await queryRows<{
      request_count: number
    }>(
      client,
      `
        SELECT COUNT(DISTINCT br.id)::int AS request_count
        FROM "booking_request_items" bi
        INNER JOIN "booking_requests" br ON br.id = bi."bookingRequestId"
        WHERE bi."itemSlug" = 'master'
      `,
    )
    assert.equal(masterRows[0]?.request_count, 2)

    const bundle9First = await fetchBundleByPublicCode(client, 'TUR-2099-009')
    const bundle9Second = await fetchBundleByPublicCode(client, 'TUR-2099-010')
    assert.ok(bundle9First.bookingRequest)
    assert.ok(bundle9Second.bookingRequest)
    assert.equal(bundle9First.items.length, 3)
    assert.equal(bundle9Second.items.length, 3)

    const expectedMarketplaceColumnsAfter = await collectMarketplaceColumns(client)
    assert.deepStrictEqual(expectedMarketplaceColumnsAfter, marketplaceColumnsBefore)

    await client.query(
      `
        DELETE FROM "booking_request_items"
        WHERE "bookingRequestId" IN (
          SELECT id FROM "booking_requests" WHERE "publicCode" LIKE 'TUR-2099-%'
        )
      `,
    )
    await client.query(
      `
        DELETE FROM "booking_requests"
        WHERE "publicCode" LIKE 'TUR-2099-%'
      `,
    )
    await client.query(
      `
        DELETE FROM "service_variants"
        WHERE slug IN (
          'sala-ensayo-premium',
          'sala-ensayo-prioritaria',
          'grabacion-hora-estudio',
          'mezcla-por-tema',
          'master-por-tema',
          'podcast-por-episodio',
          'studio-session-fija',
          'arreglos-musicales-por-tema',
          'consultoria-produccion'
        )
      `,
    )
    await client.query(
      `
        DELETE FROM "services"
        WHERE slug IN (
          'sala-ensayo',
          'grabacion',
          'mezcla-masterizacion',
          'podcast-locucion',
          'video-session',
          'arreglos-musicales',
          'consultoria'
        )
      `,
    )

    const cleanupCounts = await queryRows<{
      item_count: number
      request_count: number
      variant_count: number
      service_count: number
    }>(
      client,
      `
        SELECT
          (SELECT COUNT(*)::int FROM "booking_request_items" WHERE "bookingRequestId" IN (
            SELECT id FROM "booking_requests" WHERE "publicCode" LIKE 'TUR-2099-%'
          )) AS item_count,
          (SELECT COUNT(*)::int FROM "booking_requests" WHERE "publicCode" LIKE 'TUR-2099-%') AS request_count,
          (SELECT COUNT(*)::int FROM "service_variants" WHERE slug IN (
            'sala-ensayo-premium',
            'sala-ensayo-prioritaria',
            'grabacion-hora-estudio',
            'mezcla-por-tema',
            'master-por-tema',
            'podcast-por-episodio',
            'studio-session-fija',
            'arreglos-musicales-por-tema',
            'consultoria-produccion'
          )) AS variant_count,
          (SELECT COUNT(*)::int FROM "services" WHERE slug IN (
            'sala-ensayo',
            'grabacion',
            'mezcla-masterizacion',
            'podcast-locucion',
            'video-session',
            'arreglos-musicales',
            'consultoria'
          )) AS service_count
      `,
    )
    assert.equal(cleanupCounts[0]?.item_count, 0)
    assert.equal(cleanupCounts[0]?.request_count, 0)
    assert.equal(cleanupCounts[0]?.variant_count, 0)
    assert.equal(cleanupCounts[0]?.service_count, 0)

    const marketplaceColumnsAfterCleanup = await collectMarketplaceColumns(client)
    assert.deepStrictEqual(marketplaceColumnsAfterCleanup, marketplaceColumnsBefore)

    console.log('booking_isolated_custom_bundle_persistence OK')
    console.log('authoritative repricing: verified')
    console.log('booking request: verified')
    console.log('five snapshot items: verified')
    console.log('catalog gaps: verified')
    console.log('rollback: verified')
    console.log('public code conflict: verified')
    console.log('cleanup: verified')
  } catch (error) {
    if (error instanceof Error) {
      fail(error.message)
    }

    fail(String(error))
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    fail(error.message)
  }

  fail(String(error))
})
