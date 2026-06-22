import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { URL } from 'node:url'

import { Client } from 'pg'

import {
  checkCustomBundleResourceAvailabilityWithSql,
  type CheckCustomBundleResourceAvailabilityResult,
  type CustomBundleResourceAvailabilityPlan,
} from '@/lib/bookings/custom-bundle-resource-availability'
import {
  buildCustomBundleResourceRequirements,
  type CustomBundleResourceRequirement,
} from '@/lib/bookings/custom-bundle-resource-policy'
import {
  planCustomBundleContinuousSchedule,
  type CustomBundleContinuousSchedule,
} from '@/lib/bookings/custom-bundle-schedule'
import { repriceCustomBundleSubmission } from '@/lib/bookings/custom-bundle-repricing'
import type {
  CustomBundleSubmissionInputV1,
  CustomBundleSubmissionItemInputV1,
} from '@/lib/bookings/custom-bundle-submission'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'
const EXPECTED_OPT_IN = 'true'

const BASELINE_SQL_PATTERNS = [
  /CREATE\s+SCHEMA/i,
  /CREATE\s+TABLE/i,
  /CREATE\s+TYPE/i,
]

const PROPOSED_SQL_PATTERNS = [
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
  status: string
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
  bookingMode: string
  pricingSource: string | null
}

type BookingRequestItemSeed = {
  bookingRequestId: string
  serviceVariantId: string | null
  resourceId: string | null
  itemSlug: string
  itemName: string
  itemKind: 'service' | 'addon' | 'included'
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number
  unitPriceUsdSnapshot: number
  lineTotalUsdSnapshot: number
  clientPriceDisplay: 'itemized' | 'aggregate_only' | 'included'
}

type ServiceSeed = {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
}

type ServiceVariantSeed = {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
  serviceId: string
}

type ResourceSeed = {
  id: string
  slug: string
  name: string
  description: string | null
  isActive: boolean
}

type PaymentProofSeed = {
  id: string
  bookingRequestId: string
  blobPathname: string
  sha256: string
  mimeType: string
  sizeBytes: number
  originalFilename: string | null
  duplicateStatus: string
  isActive: boolean
}

type FixtureCatalog = {
  services: Record<string, ServiceSeed>
  serviceVariants: Record<string, ServiceVariantSeed>
  resources: Record<string, ResourceSeed>
}

type TracedCall = {
  sql: string
  params: readonly unknown[]
}

class TracedSqlSession implements CustomBundleSqlSession {
  public readonly transactionScope = 'single_connection' as const
  public readonly calls: TracedCall[] = []

  private callCount = 0
  private readonly failOnCallNumber: number | null

  constructor(
    private readonly client: Client,
    failOnCallNumber: number | null = null,
  ) {
    this.failOnCallNumber = failOnCallNumber
  }

  public async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<{ rows: Row[]; rowCount: number | null }> {
    this.callCount += 1
    this.calls.push({ sql, params })

    if (this.failOnCallNumber !== null && this.callCount === this.failOnCallNumber) {
      throw new Error('Injected database failure for gate validation.')
    }

    const result = (await this.client.query<Row>(sql, [...params])) as {
      rows: Row[]
      rowCount: number | null
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount,
    }
  }
}

function fail(message: string): never {
  console.error('booking_isolated_custom_bundle_resource_conflicts FAILED')
  console.error(message)
  process.exit(1)
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
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

function assertNoForbiddenSql(sql: string, label: string): void {
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/DROP\s+TABLE/i, 'DROP TABLE'],
    [/DROP\s+COLUMN/i, 'DROP COLUMN'],
    [/TRUNCATE/i, 'TRUNCATE'],
    [/^\s*DELETE\s+FROM\b/im, 'DELETE FROM'],
    [/INSERT\s+INTO\s+.*marketplace/i, 'marketplace INSERT'],
    [/neon/i, 'neon'],
    [/supabase/i, 'supabase'],
    [/vercel/i, 'vercel'],
    [/\/\/.*(password|token|secret)/i, 'secret reference'],
  ]

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    if (pattern.test(sql)) {
      fail(`${label} contains forbidden content: ${forbiddenLabel}.`)
    }
  }
}

function assertAllowedProposedSql(sql: string): void {
  for (const pattern of PROPOSED_SQL_PATTERNS) {
    assert.ok(pattern.test(sql), `Proposed SQL is missing expected pattern: ${pattern}.`)
  }
  assertNoForbiddenSql(sql, 'Proposed SQL')
  assert.match(sql, /ALTER\s+TABLE\s+"booking_requests"/i)
  assert.match(sql, /ALTER\s+TABLE\s+"booking_request_items"/i)
}

function assertAllowedBaselineSql(sql: string): void {
  for (const pattern of BASELINE_SQL_PATTERNS) {
    assert.ok(pattern.test(sql), `Baseline SQL is missing expected pattern: ${pattern}.`)
  }
  assertNoForbiddenSql(sql, 'Baseline SQL')
}

function normalizeMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return Number.NaN
}

function assertMoney(value: string | number | null | undefined, expected: number, label: string): void {
  assert.equal(normalizeMoney(value), expected, label)
}

function buildPayload(
  items: CustomBundleSubmissionInputV1['items'],
  overrides: Partial<Omit<CustomBundleSubmissionInputV1, 'items'>> = {},
): CustomBundleSubmissionInputV1 {
  return {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: 'Observaciones del cliente',
    requester: {
      name: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+584121234567',
      whatsappConsentAccepted: true,
    },
    items,
    ...overrides,
  }
}

function assertPlanScheduled(
  result: ReturnType<typeof planCustomBundleContinuousSchedule>,
): asserts result is Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }> {
  assert.equal(result.ok, true)
  assert.equal(result.stage, 'scheduled')
  if (!result.ok || result.stage !== 'scheduled') {
    throw new Error('Expected a scheduled plan.')
  }
}

function assertAvailabilityOk(
  result: CheckCustomBundleResourceAvailabilityResult,
): asserts result is Extract<CheckCustomBundleResourceAvailabilityResult, { ok: true }> {
  assert.equal(result.ok, true)
  assert.equal(result.stage, 'available')
  if (!result.ok || result.stage !== 'available') {
    throw new Error('Expected an available resource plan.')
  }
}

function assertCollision(
  result: CheckCustomBundleResourceAvailabilityResult,
  expectedItemSlug: string,
  expectedResourceSlugs: string[],
): asserts result is Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'collision' }> {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'collision')
  if (result.ok || result.stage !== 'collision') {
    throw new Error('Expected a collision result.')
  }

  assert.equal(result.itemSlug, expectedItemSlug)
  assert.deepStrictEqual(result.attemptedResourceSlugs, expectedResourceSlugs)
}

function assertResourceCatalogIssue(
  result: CheckCustomBundleResourceAvailabilityResult,
  code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_INACTIVE' | 'RESOURCE_SLUG_DUPLICATED',
  resourceSlug: string,
): void {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'resource_catalog')
  if (result.ok || result.stage !== 'resource_catalog') {
    throw new Error('Expected a resource catalog issue.')
  }

  assert.equal(result.code, code)
  assert.equal(result.resourceSlug, resourceSlug)
}

function assertPolicyIssue(
  result: CheckCustomBundleResourceAvailabilityResult,
  expectedServiceSlug: string,
): void {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'resource_policy')
  if (result.ok || result.stage !== 'resource_policy') {
    throw new Error('Expected a resource policy issue.')
  }

  assert.ok(
    result.policyIssues.some((issue) => issue.serviceSlug === expectedServiceSlug),
    `Expected resource policy issue for ${expectedServiceSlug}.`,
  )
}

function assertServerContextIssue(
  result: CheckCustomBundleResourceAvailabilityResult,
  code: 'INVALID_SQL_SESSION' | 'INVALID_EXCLUDED_BOOKING_ID',
): void {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'server_context')
  if (result.ok || result.stage !== 'server_context') {
    throw new Error('Expected a server context issue.')
  }

  assert.equal(result.code, code)
}

function assertReadOnlyAdapterCalls(calls: TracedCall[]): void {
  for (const call of calls) {
    const normalized = call.sql.trim().replace(/\s+/g, ' ')
    assert.match(normalized, /^(BEGIN|SELECT|ROLLBACK)\b/i)
    assert.equal(/\b(INSERT|UPDATE|DELETE|COMMIT|UPSERT|DROP|TRUNCATE|CREATE|ALTER)\b/i.test(normalized), false)
  }
}

async function applySql(client: Client, sql: string, label: string): Promise<void> {
  try {
    await client.query(sql)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Unable to apply ${label}: ${message}`)
  }
}

async function insertService(client: Client, service: ServiceSeed): Promise<void> {
  await client.query(
    `
      INSERT INTO services (id, slug, name, description, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `,
    [service.id, service.slug, service.name, service.description, service.isActive],
  )
}

async function insertServiceVariant(client: Client, variant: ServiceVariantSeed): Promise<void> {
  await client.query(
    `
      INSERT INTO service_variants (
        id,
        slug,
        name,
        description,
        "isActive",
        "serviceId",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `,
    [variant.id, variant.slug, variant.name, variant.description, variant.isActive, variant.serviceId],
  )
}

async function insertResource(client: Client, resource: ResourceSeed): Promise<void> {
  await client.query(
    `
      INSERT INTO resources (id, slug, name, description, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `,
    [resource.id, resource.slug, resource.name, resource.description, resource.isActive],
  )
}

async function updateResourceActive(
  client: Client,
  resourceSlug: string,
  isActive: boolean,
): Promise<void> {
  await client.query(`UPDATE resources SET "isActive" = $2, "updatedAt" = NOW() WHERE slug = $1`, [
    resourceSlug,
    isActive,
  ])
}

async function deleteResource(client: Client, resourceSlug: string): Promise<void> {
  await client.query(`DELETE FROM resources WHERE slug = $1`, [resourceSlug])
}

async function insertBookingFixture(
  client: Client,
  params: {
    bookingRequestId: string
    publicCode: string
    status: string
    eventDate: string
    eventEndDate: string
    resourceId: string
    serviceVariantId: string
    internalNotes?: string | null
    proofActive?: boolean | null
  },
): Promise<void> {
  await client.query(
    `
      INSERT INTO booking_requests (
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
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, 'normal', 'web', 'Test User', 'test@example.com', '+584121234567',
        'Resource fixture', $4::timestamptz, $5::timestamptz, NULL, $6, 0, 'USD',
        NOW(), 'custom_bundle', 'server_catalog_v1', NOW(), NOW()
      )
    `,
    [
      params.bookingRequestId,
      params.publicCode,
      params.status,
      params.eventDate,
      params.eventEndDate,
      params.internalNotes ?? null,
    ],
  )

  await client.query(
    `
      INSERT INTO booking_request_items (
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
        $1, $2, $3, $4, 'resource-fixture', 'Resource Fixture', 'service', 1, NULL, 60, 0, 0,
        'itemized', NULL, NOW(), NOW()
      )
    `,
    [`${params.bookingRequestId}-item`, params.bookingRequestId, params.serviceVariantId, params.resourceId],
  )

  if (params.proofActive !== null && params.proofActive !== undefined) {
    await client.query(
      `
        INSERT INTO payment_proofs (
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
          $1, $2, $3, $4, 'image/png', 1, NULL, NOW(), NULL, NULL, 'none', $5
        )
      `,
      [
        `${params.bookingRequestId}-proof`,
        params.bookingRequestId,
        `/fixtures/${params.bookingRequestId}.png`,
        `${params.bookingRequestId}-sha`,
        params.proofActive,
      ],
    )
  }
}

async function deleteBookingFixture(client: Client, bookingRequestId: string): Promise<void> {
  await client.query(`DELETE FROM payment_proofs WHERE "bookingRequestId" = $1`, [bookingRequestId])
  await client.query(`DELETE FROM booking_request_items WHERE "bookingRequestId" = $1`, [bookingRequestId])
  await client.query(`DELETE FROM booking_requests WHERE id = $1`, [bookingRequestId])
}

function createFixtureCatalog(): FixtureCatalog {
  return {
    services: {
      'sala-ensayo': {
        id: 'bkg06-service-sala',
        slug: 'sala-ensayo',
        name: 'Sala de ensayo',
        description: 'Servicio de sala de ensayo.',
        isActive: true,
      },
      grabacion: {
        id: 'bkg06-service-grabacion',
        slug: 'grabacion',
        name: 'Grabacion',
        description: 'Servicio de grabacion.',
        isActive: true,
      },
      'podcast-locucion': {
        id: 'bkg06-service-podcast',
        slug: 'podcast-locucion',
        name: 'Podcast / locucion',
        description: 'Servicio de podcast y locucion.',
        isActive: true,
      },
      'video-session': {
        id: 'bkg06-service-video',
        slug: 'video-session',
        name: 'Video Session',
        description: 'Servicio de video.',
        isActive: true,
      },
      consultoria: {
        id: 'bkg06-service-consultoria',
        slug: 'consultoria',
        name: 'Consultoria',
        description: 'Servicio de consultoria.',
        isActive: true,
      },
    },
    serviceVariants: {
      'sala-ensayo-flexible': {
        id: 'bkg06-variant-sala-flexible',
        slug: 'sala-ensayo-flexible',
        name: 'Flexible',
        description: 'Flexible',
        isActive: true,
        serviceId: 'bkg06-service-sala',
      },
      'sala-ensayo-premium': {
        id: 'bkg06-variant-sala-premium',
        slug: 'sala-ensayo-premium',
        name: 'Premium',
        description: 'Premium',
        isActive: true,
        serviceId: 'bkg06-service-sala',
      },
      'sala-ensayo-prioritaria': {
        id: 'bkg06-variant-sala-prioritaria',
        slug: 'sala-ensayo-prioritaria',
        name: 'Prioritaria',
        description: 'Prioritaria',
        isActive: true,
        serviceId: 'bkg06-service-sala',
      },
      'grabacion-ensayo': {
        id: 'bkg06-variant-grabacion-ensayo',
        slug: 'grabacion-ensayo',
        name: 'Grabacion de ensayo',
        description: 'Grabacion de ensayo',
        isActive: true,
        serviceId: 'bkg06-service-grabacion',
      },
      'grabacion-hora-estudio': {
        id: 'bkg06-variant-grabacion-estudio',
        slug: 'grabacion-hora-estudio',
        name: 'Grabacion en estudio',
        description: 'Grabacion en estudio',
        isActive: true,
        serviceId: 'bkg06-service-grabacion',
      },
      'podcast-por-episodio': {
        id: 'bkg06-variant-podcast',
        slug: 'podcast-por-episodio',
        name: 'Podcast',
        description: 'Podcast',
        isActive: true,
        serviceId: 'bkg06-service-podcast',
      },
      'locucion-por-hora': {
        id: 'bkg06-variant-locucion',
        slug: 'locucion-por-hora',
        name: 'Locucion',
        description: 'Locucion',
        isActive: true,
        serviceId: 'bkg06-service-podcast',
      },
      'studio-session-fija': {
        id: 'bkg06-variant-studio-session',
        slug: 'studio-session-fija',
        name: 'Studio Session',
        description: 'Studio Session',
        isActive: true,
        serviceId: 'bkg06-service-video',
      },
      'consultoria-produccion': {
        id: 'bkg06-variant-consultoria',
        slug: 'consultoria-produccion',
        name: 'Consultoria',
        description: 'Consultoria',
        isActive: true,
        serviceId: 'bkg06-service-consultoria',
      },
    },
    resources: {
      'sala-3-ensayo': {
        id: 'bkg06-resource-sala-3',
        slug: 'sala-3-ensayo',
        name: 'Sala 3 Ensayo',
        description: 'Sala 3 Ensayo',
        isActive: true,
      },
      'sala-1-grande': {
        id: 'bkg06-resource-sala-1',
        slug: 'sala-1-grande',
        name: 'Sala 1 Grande',
        description: 'Sala 1 Grande',
        isActive: true,
      },
      'sala-2-podcast-locucion': {
        id: 'bkg06-resource-sala-2',
        slug: 'sala-2-podcast-locucion',
        name: 'Sala 2 Podcast / Locucion',
        description: 'Sala 2 Podcast / Locucion',
        isActive: true,
      },
    },
  }
}

async function seedFixtureCatalog(client: Client, catalog: FixtureCatalog): Promise<void> {
  for (const service of Object.values(catalog.services)) {
    await insertService(client, service)
  }

  for (const variant of Object.values(catalog.serviceVariants)) {
    await insertServiceVariant(client, variant)
  }

  for (const resource of Object.values(catalog.resources)) {
    await insertResource(client, resource)
  }
}

async function cleanupFixtureCatalog(client: Client): Promise<void> {
  await client.query(`DELETE FROM payment_proofs WHERE "bookingRequestId" LIKE 'bkg06-%'`)
  await client.query(`DELETE FROM booking_request_items WHERE "bookingRequestId" LIKE 'bkg06-%'`)
  await client.query(`DELETE FROM booking_requests WHERE id LIKE 'bkg06-%'`)
  await client.query(`DELETE FROM service_variants WHERE id LIKE 'bkg06-%'`)
  await client.query(`DELETE FROM services WHERE id LIKE 'bkg06-%'`)
  await client.query(`DELETE FROM resources WHERE id LIKE 'bkg06-%'`)
}

function assertReadOnlyCallsOrFail(calls: TracedCall[]): void {
  assert.ok(calls.length > 0, 'Expected the adapter to execute SQL.')
  assert.equal(/^BEGIN\b/i.test(calls[0]?.sql ?? ''), true, 'Adapter must begin a transaction.')
  assert.equal(
    /^\s*ROLLBACK\b/i.test(calls[calls.length - 1]?.sql ?? ''),
    true,
    'Adapter must rollback the transaction.',
  )
  assertReadOnlyAdapterCalls(calls)
}

async function runAvailabilityCase(
  client: Client,
  submission: CustomBundleSubmissionInputV1,
  options: {
    excludeBookingRequestId?: string | null
    failOnCallNumber?: number | null
  } = {},
): Promise<{
  result: CheckCustomBundleResourceAvailabilityResult
  calls: TracedCall[]
}> {
  const traced = new TracedSqlSession(client, options.failOnCallNumber ?? null)
  const result = await checkCustomBundleResourceAvailabilityWithSql(traced, {
    submission,
    excludeBookingRequestId: options.excludeBookingRequestId ?? null,
  })
  return {
    result,
    calls: traced.calls,
  }
}

function assertPlanAllocations(
  plan: CustomBundleResourceAvailabilityPlan,
  expectedAssignments: Array<[string, string]>,
): void {
  assert.deepStrictEqual(
    plan.allocations.map((allocation) => [allocation.itemSlug, allocation.assignedResource.resourceSlug]),
    expectedAssignments,
  )
}

function assertScheduleMatches(
  plan: CustomBundleResourceAvailabilityPlan,
  expectedSlugs: string[],
): void {
  assert.deepStrictEqual(
    plan.schedule.components.map((component) => component.itemSlug),
    expectedSlugs,
  )
}

function assertResourceRequirements(
  quoteResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['quote'],
  scheduleResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['schedule'],
  expectedSlugs: string[],
): CustomBundleResourceRequirement[] {
  const requirementsResult = buildCustomBundleResourceRequirements(quoteResult, scheduleResult)
  assert.equal(requirementsResult.ok, true)
  if (!requirementsResult.ok) {
    throw new Error('Expected valid resource requirements.')
  }

  assert.deepStrictEqual(
    requirementsResult.requirements.map((requirement) => requirement.itemSlug),
    expectedSlugs,
  )

  return requirementsResult.requirements
}

async function main(): Promise<void> {
  const optIn = process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS
  if (optIn !== EXPECTED_OPT_IN) {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const url = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const baselinePath = process.argv[2]
  const proposedPath = process.argv[3]
  if (typeof baselinePath !== 'string' || typeof proposedPath !== 'string') {
    fail('Expected baseline SQL path and proposed SQL path.')
  }

  const baselineSql = readSqlFile(baselinePath)
  const proposedSql = readSqlFile(proposedPath)
  assertAllowedBaselineSql(baselineSql)
  assertAllowedProposedSql(proposedSql)

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    await applySql(client, baselineSql, 'baseline SQL')
    await applySql(client, proposedSql, 'proposed SQL')

    const catalog = createFixtureCatalog()
    await seedFixtureCatalog(client, catalog)

    const salaPremiumPayload = buildPayload([
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
      { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
    ])
    const salaPremiumPlanResult = planCustomBundleContinuousSchedule(deepClone(salaPremiumPayload))
    assertPlanScheduled(salaPremiumPlanResult)
    const salaPremiumRequirements = assertResourceRequirements(
      salaPremiumPlanResult.quote,
      salaPremiumPlanResult.schedule,
      ['sala-premium', 'grabacion-estudio', 'podcast', 'locucion'],
    )
    assert.deepStrictEqual(
      salaPremiumRequirements[0].candidateResourceSlugs,
      ['sala-3-ensayo', 'sala-1-grande'],
    )

    const salaPremiumAvailable = await runAvailabilityCase(client, salaPremiumPayload)
    assertAvailabilityOk(salaPremiumAvailable.result)
    assertReadOnlyCallsOrFail(salaPremiumAvailable.calls)
    assertScheduleMatches(salaPremiumAvailable.result.plan, [
      'sala-premium',
      'grabacion-estudio',
      'podcast',
      'locucion',
    ])
    assertPlanAllocations(salaPremiumAvailable.result.plan, [
      ['sala-premium', 'sala-3-ensayo'],
      ['grabacion-estudio', 'sala-1-grande'],
      ['podcast', 'sala-2-podcast-locucion'],
      ['locucion', 'sala-2-podcast-locucion'],
    ])

    const premiumCollisionBookingId = 'bkg06-booking-premium-collision'
    await insertBookingFixture(client, {
      bookingRequestId: premiumCollisionBookingId,
      publicCode: 'TUR-6000-001',
      status: 'confirmed',
      eventDate: '2026-06-24T10:00:00.000Z',
      eventEndDate: '2026-06-24T12:00:00.000Z',
      resourceId: 'bkg06-resource-sala-3',
      serviceVariantId: 'bkg06-variant-sala-premium',
    })

    const premiumFallbackPayload = buildPayload([
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
    ])
    const premiumFallbackResult = await runAvailabilityCase(client, premiumFallbackPayload)
    assertAvailabilityOk(premiumFallbackResult.result)
    assert.equal(
      premiumFallbackResult.result.plan.allocations[0]?.assignedResource.resourceSlug,
      'sala-1-grande',
    )
    assertReadOnlyCallsOrFail(premiumFallbackResult.calls)

    const premiumAllBusyBookingId = 'bkg06-booking-premium-all-busy'
    await insertBookingFixture(client, {
      bookingRequestId: premiumAllBusyBookingId,
      publicCode: 'TUR-6000-002',
      status: 'approved',
      eventDate: '2026-06-24T10:00:00.000Z',
      eventEndDate: '2026-06-24T12:00:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-sala-premium',
    })

    const premiumCollisionResult = await runAvailabilityCase(client, premiumFallbackPayload)
    assertCollision(premiumCollisionResult.result, 'sala-premium', ['sala-3-ensayo', 'sala-1-grande'])
    assertReadOnlyCallsOrFail(premiumCollisionResult.calls)

    await deleteBookingFixture(client, premiumCollisionBookingId)
    await deleteBookingFixture(client, premiumAllBusyBookingId)

    const grabacionCollisionBookingId = 'bkg06-booking-grabacion-collision'
    await insertBookingFixture(client, {
      bookingRequestId: grabacionCollisionBookingId,
      publicCode: 'TUR-6000-003',
      status: 'approved',
      eventDate: '2026-06-24T10:00:00.000Z',
      eventEndDate: '2026-06-24T11:00:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const grabacionOnlyPayload = buildPayload([
      { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    ])
    const grabacionOnlyResult = await runAvailabilityCase(client, grabacionOnlyPayload)
    assertCollision(grabacionOnlyResult.result, 'grabacion-estudio', ['sala-1-grande'])
    await deleteBookingFixture(client, grabacionCollisionBookingId)

    const halfOpenPayload = buildPayload([
      { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    ], {
      startTime: '12:00',
    })

    const halfOpenEndBoundaryBookingId = 'bkg06-booking-half-open-end'
    await insertBookingFixture(client, {
      bookingRequestId: halfOpenEndBoundaryBookingId,
      publicCode: 'TUR-6000-004',
      status: 'confirmed',
      eventDate: '2026-06-24T11:00:00.000Z',
      eventEndDate: '2026-06-24T12:00:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const halfOpenEndBoundaryResult = await runAvailabilityCase(client, halfOpenPayload)
    assertAvailabilityOk(halfOpenEndBoundaryResult.result)
    await deleteBookingFixture(client, halfOpenEndBoundaryBookingId)

    const halfOpenStartBoundaryBookingId = 'bkg06-booking-half-open-start'
    await insertBookingFixture(client, {
      bookingRequestId: halfOpenStartBoundaryBookingId,
      publicCode: 'TUR-6000-005',
      status: 'confirmed',
      eventDate: '2026-06-24T13:00:00.000Z',
      eventEndDate: '2026-06-24T14:00:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const halfOpenStartBoundaryResult = await runAvailabilityCase(client, halfOpenPayload)
    assertAvailabilityOk(halfOpenStartBoundaryResult.result)
    await deleteBookingFixture(client, halfOpenStartBoundaryBookingId)

    const halfOpenCollisionEndBookingId = 'bkg06-booking-half-open-end-collision'
    await insertBookingFixture(client, {
      bookingRequestId: halfOpenCollisionEndBookingId,
      publicCode: 'TUR-6000-006',
      status: 'approved',
      eventDate: '2026-06-24T11:01:00.000Z',
      eventEndDate: '2026-06-24T12:01:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const halfOpenCollisionEndResult = await runAvailabilityCase(client, halfOpenPayload)
    assertCollision(halfOpenCollisionEndResult.result, 'grabacion-estudio', ['sala-1-grande'])
    await deleteBookingFixture(client, halfOpenCollisionEndBookingId)

    const halfOpenCollisionStartBookingId = 'bkg06-booking-half-open-start-collision'
    await insertBookingFixture(client, {
      bookingRequestId: halfOpenCollisionStartBookingId,
      publicCode: 'TUR-6000-007',
      status: 'approved',
      eventDate: '2026-06-24T12:59:00.000Z',
      eventEndDate: '2026-06-24T13:59:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const halfOpenCollisionStartResult = await runAvailabilityCase(client, halfOpenPayload)
    assertCollision(halfOpenCollisionStartResult.result, 'grabacion-estudio', ['sala-1-grande'])
    await deleteBookingFixture(client, halfOpenCollisionStartBookingId)

    const statusMatrixCases: Array<{
      status: string
      internalNotes?: string | null
      proofActive?: boolean | null
      shouldBlock: boolean
      label: string
    }> = [
      { status: 'draft', shouldBlock: false, label: 'draft' },
      { status: 'submitted', shouldBlock: false, label: 'submitted' },
      { status: 'availability_checked', shouldBlock: false, label: 'availability_checked' },
      { status: 'approved_partial', shouldBlock: false, label: 'approved_partial' },
      { status: 'needs_adjustment', shouldBlock: false, label: 'needs_adjustment' },
      { status: 'rejected', shouldBlock: false, label: 'rejected' },
      { status: 'approved', shouldBlock: true, label: 'approved' },
      { status: 'confirmed', shouldBlock: true, label: 'confirmed' },
      {
        status: 'under_review',
        internalNotes: '[ops_status:payment_reported]',
        shouldBlock: true,
        label: 'under_review_payment_reported',
      },
      {
        status: 'under_review',
        proofActive: true,
        shouldBlock: true,
        label: 'under_review_active_proof',
      },
      {
        status: 'under_review',
        proofActive: false,
        shouldBlock: false,
        label: 'under_review_inactive_proof',
      },
      {
        status: 'under_review',
        shouldBlock: false,
        label: 'under_review_without_payment',
      },
    ]

    for (const [index, statusCase] of statusMatrixCases.entries()) {
      const bookingId = `bkg06-booking-status-${index}`
      await insertBookingFixture(client, {
        bookingRequestId: bookingId,
        publicCode: `TUR-6000-1${String(index).padStart(2, '0')}`,
        status: statusCase.status,
        eventDate: '2026-06-24T10:00:00.000Z',
        eventEndDate: '2026-06-24T11:00:00.000Z',
        resourceId: 'bkg06-resource-sala-1',
        serviceVariantId: 'bkg06-variant-grabacion-estudio',
        internalNotes: statusCase.internalNotes ?? null,
        proofActive: statusCase.proofActive ?? null,
      })

      const result = await runAvailabilityCase(client, grabacionOnlyPayload)
      if (statusCase.shouldBlock) {
        assertCollision(result.result, 'grabacion-estudio', ['sala-1-grande'])
      } else {
        assertAvailabilityOk(result.result)
      }
      await deleteBookingFixture(client, bookingId)
    }

    const excludeBookingId = 'bkg06-booking-exclude'
    await insertBookingFixture(client, {
      bookingRequestId: excludeBookingId,
      publicCode: 'TUR-6000-020',
      status: 'confirmed',
      eventDate: '2026-06-24T10:00:00.000Z',
      eventEndDate: '2026-06-24T11:00:00.000Z',
      resourceId: 'bkg06-resource-sala-1',
      serviceVariantId: 'bkg06-variant-grabacion-estudio',
    })
    const excludeBlockedResult = await runAvailabilityCase(client, grabacionOnlyPayload)
    assertCollision(excludeBlockedResult.result, 'grabacion-estudio', ['sala-1-grande'])
    const excludeIgnoredResult = await runAvailabilityCase(client, grabacionOnlyPayload, {
      excludeBookingRequestId: excludeBookingId,
    })
    assertAvailabilityOk(excludeIgnoredResult.result)
    await deleteBookingFixture(client, excludeBookingId)

    await updateResourceActive(client, 'sala-3-ensayo', false)
    const inactiveResourceResult = await runAvailabilityCase(client, buildPayload([
      { itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null },
    ]))
    assertResourceCatalogIssue(inactiveResourceResult.result, 'RESOURCE_INACTIVE', 'sala-3-ensayo')
    await updateResourceActive(client, 'sala-3-ensayo', true)

    await deleteResource(client, 'sala-2-podcast-locucion')
    const missingResourceResult = await runAvailabilityCase(client, buildPayload([
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
    ]))
    assertResourceCatalogIssue(missingResourceResult.result, 'RESOURCE_NOT_FOUND', 'sala-2-podcast-locucion')
    await insertResource(client, catalog.resources['sala-2-podcast-locucion'])

    const policyBlockedPayload = buildPayload([
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: null },
    ])
    const policyBlockedTraced = new TracedSqlSession(client)
    const policyBlockedResult = await checkCustomBundleResourceAvailabilityWithSql(
      policyBlockedTraced,
      {
        submission: policyBlockedPayload,
      },
    )
    assertPolicyIssue(policyBlockedResult, 'video-session')
    assert.equal(policyBlockedTraced.calls.length, 0)

    const invalidSessionResult = await checkCustomBundleResourceAvailabilityWithSql(
      {
        transactionScope: 'different_scope' as never,
        async query() {
          throw new Error('query should not be called')
        },
      },
      {
        submission: grabacionOnlyPayload,
      },
    )
    assertServerContextIssue(invalidSessionResult, 'INVALID_SQL_SESSION')

    const invalidExcludeResult = await checkCustomBundleResourceAvailabilityWithSql(
      new TracedSqlSession(client),
      {
        submission: grabacionOnlyPayload,
        excludeBookingRequestId: '',
      },
    )
    assertServerContextIssue(invalidExcludeResult, 'INVALID_EXCLUDED_BOOKING_ID')

    const readOnlySession = new TracedSqlSession(client)
    const readOnlyResult = await checkCustomBundleResourceAvailabilityWithSql(readOnlySession, {
      submission: salaPremiumPayload,
    })
    assertAvailabilityOk(readOnlyResult)
    assertReadOnlyCallsOrFail(readOnlySession.calls)

    const databaseErrorSession = new TracedSqlSession(client, 3)
    const databaseErrorResult = await checkCustomBundleResourceAvailabilityWithSql(
      databaseErrorSession,
      {
        submission: salaPremiumPayload,
      },
    )
    assert.equal(databaseErrorResult.ok, false)
    assert.equal(databaseErrorResult.stage, 'database')
    if (databaseErrorResult.ok || databaseErrorResult.stage !== 'database') {
      throw new Error('Expected database failure.')
    }
    assert.equal(databaseErrorSession.calls.some((call) => /^\s*ROLLBACK\b/i.test(call.sql)), true)

    const interactivePlan = readOnlyResult.plan
    assert.deepStrictEqual(
      interactivePlan.allocations.map((allocation) => allocation.assignedResource.resourceSlug),
      ['sala-3-ensayo', 'sala-1-grande', 'sala-2-podcast-locucion', 'sala-2-podcast-locucion'],
    )

    const planRebuild = planCustomBundleContinuousSchedule(salaPremiumPayload)
    assertPlanScheduled(planRebuild)
    assert.deepStrictEqual(planRebuild.schedule, interactivePlan.schedule)

    const directQuote = repriceCustomBundleSubmission(salaPremiumPayload)
    assert.equal(directQuote.ok, true)
    if (!directQuote.ok || directQuote.stage !== 'priced') {
      throw new Error('Expected authoritative repricing to succeed.')
    }
    const resourceRequirements = buildCustomBundleResourceRequirements(
      directQuote.quote,
      interactivePlan.schedule,
    )
    assert.equal(resourceRequirements.ok, true)

    const scheduleParity = interactivePlan.schedule
    assert.equal(
      scheduleParity.endsAtIso,
      new Date(
        new Date(scheduleParity.startsAtIso).getTime() +
          scheduleParity.totalDurationMinutes * 60 * 1000,
      ).toISOString(),
    )

    await cleanupFixtureCatalog(client)

    const cleanupCounts = await client.query<{
      bookingRequests: string
      bookingRequestItems: string
      paymentProofs: string
      resources: string
      serviceVariants: string
      services: string
    }>(
      `
        SELECT
          (SELECT COUNT(*)::text FROM booking_requests WHERE id LIKE 'bkg06-%') AS "bookingRequests",
          (SELECT COUNT(*)::text FROM booking_request_items WHERE "bookingRequestId" LIKE 'bkg06-%') AS "bookingRequestItems",
          (SELECT COUNT(*)::text FROM payment_proofs WHERE "bookingRequestId" LIKE 'bkg06-%') AS "paymentProofs",
          (SELECT COUNT(*)::text FROM resources WHERE id LIKE 'bkg06-%') AS "resources",
          (SELECT COUNT(*)::text FROM service_variants WHERE id LIKE 'bkg06-%') AS "serviceVariants",
          (SELECT COUNT(*)::text FROM services WHERE id LIKE 'bkg06-%') AS "services"
      `,
    )

    assert.equal(cleanupCounts.rows[0]?.bookingRequests, '0')
    assert.equal(cleanupCounts.rows[0]?.bookingRequestItems, '0')
    assert.equal(cleanupCounts.rows[0]?.paymentProofs, '0')
    assert.equal(cleanupCounts.rows[0]?.resources, '0')
    assert.equal(cleanupCounts.rows[0]?.serviceVariants, '0')
    assert.equal(cleanupCounts.rows[0]?.services, '0')

    console.log('booking_isolated_custom_bundle_resource_conflicts OK')
    console.log('resource catalog: verified')
    console.log('candidate priority: verified')
    console.log('half-open intervals: verified')
    console.log('blocking statuses: verified')
    console.log('fallback assignment: verified')
    console.log('unmapped policies blocked: verified')
    console.log('read-only adapter: verified')
    console.log('rollback: verified')
    console.log('cleanup: verified')
  } finally {
    try {
      await cleanupFixtureCatalog(client)
    } catch {
      // Ignore cleanup failures in the finalizer so the original error remains visible.
    }

    await client.end().catch(() => undefined)
  }
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    fail(error.message)
  }

  fail(String(error))
})
