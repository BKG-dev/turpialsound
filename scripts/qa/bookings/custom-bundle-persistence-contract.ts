import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  persistCustomBundleSubmissionWithSql,
  type CustomBundleSqlExecutor,
} from '@/lib/bookings/custom-bundle-persistence'
import {
  CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
  repriceCustomBundleSubmission,
} from '@/lib/bookings/custom-bundle-repricing'
import {
  CUSTOM_BUNDLE_ITEMS,
} from '@/lib/bookings/custom-bundle'
import {
  CUSTOM_BUNDLE_PERSISTENCE_TARGETS,
  CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS,
} from '@/lib/bookings/custom-bundle-submission'
import type {
  CustomBundleSubmissionInputV1,
  CustomBundleSubmissionItemInputV1,
} from '@/lib/bookings/custom-bundle-submission'

type BookingRequestRow = {
  id: string
  publicCode: string
  bookingMode: string
  pricingSource: string | null
  estimatedTotal: string | number | null
  currency: string
  status: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  eventTitle: string
  notes: string | null
  internalNotes: string | null
  submittedAt: Date | null
}

type BookingRequestItemRow = {
  bookingRequestId: string
  serviceVariantId: string | null
  resourceId: string | null
  itemSlug: string | null
  itemName: string | null
  itemKind: string | null
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number | null
  unitPriceUsdSnapshot: string | number | null
  lineTotalUsdSnapshot: string | number | null
  clientPriceDisplay: string | null
  notes: string | null
}

type ServiceRow = {
  id: string
  slug: string
  name: string
  isActive: boolean
}

type ServiceVariantRow = {
  id: string
  slug: string
  name: string
  serviceSlug: string
  isActive: boolean
}

type MemoryState = {
  services: ServiceRow[]
  serviceVariants: ServiceVariantRow[]
  bookingRequests: BookingRequestRow[]
  bookingRequestItems: BookingRequestItemRow[]
}

type MemorySnapshot = MemoryState

class MemorySqlExecutor implements CustomBundleSqlExecutor {
  public readonly calls: Array<{ sql: string; params: readonly unknown[] }> = []

  public state: MemoryState = {
    services: [],
    serviceVariants: [],
    bookingRequests: [],
    bookingRequestItems: [],
  }

  private snapshot: MemorySnapshot | null = null

  public failOnItemSlug: string | null = null

  private bookingRequestSequence = 1
  private bookingRequestItemSequence = 1

  public seedService(input: ServiceRow): void {
    this.state.services.push(input)
  }

  public seedServiceVariant(input: ServiceVariantRow): void {
    this.state.serviceVariants.push(input)
  }

  private cloneState(state: MemoryState): MemoryState {
    return JSON.parse(JSON.stringify(state)) as MemoryState
  }

  private beginTransaction(): void {
    this.snapshot = this.cloneState(this.state)
  }

  private commitTransaction(): void {
    this.snapshot = null
  }

  private rollbackTransaction(): void {
    if (this.snapshot) {
      this.state = this.cloneState(this.snapshot)
    }
    this.snapshot = null
  }

  private isTransactionControl(sql: string): boolean {
    return /^\s*(BEGIN|COMMIT|ROLLBACK)\b/i.test(sql)
  }

  private resolveServiceVariantRows(variantSlugs: readonly unknown[]): Array<{
    variantId: string
    variantSlug: string
    variantIsActive: boolean
    serviceSlug: string
    serviceIsActive: boolean
  }> {
    const wantedSlugs = new Set(
      variantSlugs.filter((value): value is string => typeof value === 'string'),
    )

    return this.state.serviceVariants
      .filter((variant) => wantedSlugs.has(variant.slug))
      .map((variant) => {
        const service = this.state.services.find((entry) => entry.slug === variant.serviceSlug)
        return {
          variantId: variant.id,
          variantSlug: variant.slug,
          variantIsActive: variant.isActive,
          serviceSlug: service?.slug ?? variant.serviceSlug,
          serviceIsActive: service?.isActive ?? false,
        }
      })
  }

  private createBookingRequest(params: readonly unknown[]): BookingRequestRow {
    const [publicCode] = params as [string]
    const existing = this.state.bookingRequests.find((row) => row.publicCode === publicCode)
    if (existing) {
      const error = new Error('duplicate public code')
      Object.assign(error, {
        code: '23505',
        constraint: 'booking_requests_publicCode_key',
      })
      throw error
    }

    const [,
      status,
      priorityLevel,
      source,
      requesterName,
      requesterEmail,
      requesterPhone,
      eventTitle,
      eventDate,
      eventEndDate,
      notes,
      internalNotes,
      estimatedTotal,
      currency,
      submittedAt,
      bookingMode,
      pricingSource,
    ] = params

    const row: BookingRequestRow = {
      id: `br_${this.bookingRequestSequence.toString().padStart(4, '0')}`,
      publicCode,
      bookingMode: String(bookingMode),
      pricingSource: pricingSource == null ? null : String(pricingSource),
      estimatedTotal: estimatedTotal as string | number | null,
      currency: String(currency),
      status: String(status),
      requesterName: String(requesterName),
      requesterEmail: String(requesterEmail),
      requesterPhone: String(requesterPhone),
      eventTitle: String(eventTitle),
      notes: notes == null ? null : String(notes),
      internalNotes: internalNotes == null ? null : String(internalNotes),
      submittedAt: submittedAt instanceof Date ? submittedAt : null,
    }

    void eventDate
    void eventEndDate
    void priorityLevel

    this.bookingRequestSequence += 1
    this.state.bookingRequests.push(row)
    return row
  }

  private createBookingRequestItem(params: readonly unknown[]): BookingRequestItemRow {
    const [
      bookingRequestId,
      serviceVariantId,
      resourceId,
      itemSlug,
      itemName,
      itemKind,
      quantity,
      sessionDurationMinutes,
      durationMinutes,
      unitPriceUsdSnapshot,
      lineTotalUsdSnapshot,
      clientPriceDisplay,
      notes,
    ] = params

    const slug = typeof itemSlug === 'string' ? itemSlug : null
    if (this.failOnItemSlug && slug === this.failOnItemSlug) {
      const error = new Error(`triggered failure for ${slug}`)
      Object.assign(error, { code: 'P9999' })
      throw error
    }

    if (
      slug !== null &&
      this.state.bookingRequestItems.some(
        (row) => row.bookingRequestId === String(bookingRequestId) && row.itemSlug === slug,
      )
    ) {
      const error = new Error('duplicate item slug')
      Object.assign(error, {
        code: '23505',
        constraint: 'booking_request_items_booking_request_id_item_slug_key',
      })
      throw error
    }

    const row: BookingRequestItemRow = {
      bookingRequestId: String(bookingRequestId),
      serviceVariantId: serviceVariantId == null ? null : String(serviceVariantId),
      resourceId: resourceId == null ? null : String(resourceId),
      itemSlug: slug,
      itemName: itemName == null ? null : String(itemName),
      itemKind: itemKind == null ? null : String(itemKind),
      quantity: Number(quantity),
      sessionDurationMinutes:
        sessionDurationMinutes == null ? null : Number(sessionDurationMinutes),
      durationMinutes: durationMinutes == null ? null : Number(durationMinutes),
      unitPriceUsdSnapshot:
        unitPriceUsdSnapshot == null ? null : String(unitPriceUsdSnapshot),
      lineTotalUsdSnapshot:
        lineTotalUsdSnapshot == null ? null : String(lineTotalUsdSnapshot),
      clientPriceDisplay: clientPriceDisplay == null ? null : String(clientPriceDisplay),
      notes: notes == null ? null : String(notes),
    }

    this.bookingRequestItemSequence += 1
    this.state.bookingRequestItems.push(row)
    return row
  }

  private selectBookingRequestRows(params: readonly unknown[]): BookingRequestRow[] {
    const [bookingRequestId] = params as [string]
    return this.state.bookingRequests.filter((row) => row.id === bookingRequestId)
  }

  private selectBookingRequestItemRows(params: readonly unknown[]): BookingRequestItemRow[] {
    const [bookingRequestId] = params as [string]
    return this.state.bookingRequestItems.filter((row) => row.bookingRequestId === bookingRequestId)
  }

  public async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ) {
    const normalizedSql = sql.trim()
    this.calls.push({ sql: normalizedSql, params: [...params] })

    if (/^\s*BEGIN\b/i.test(normalizedSql)) {
      this.beginTransaction()
      return { rows: [], rowCount: 0 } as { rows: Row[]; rowCount: number }
    }

    if (/^\s*COMMIT\b/i.test(normalizedSql)) {
      this.commitTransaction()
      return { rows: [], rowCount: 0 } as { rows: Row[]; rowCount: number }
    }

    if (/^\s*ROLLBACK\b/i.test(normalizedSql)) {
      this.rollbackTransaction()
      return { rows: [], rowCount: 0 } as { rows: Row[]; rowCount: number }
    }

    if (normalizedSql.includes('FROM "service_variants"') && normalizedSql.includes('ANY($1::text[])')) {
      const variantSlugs = Array.isArray(params[0]) ? (params[0] as readonly unknown[]) : []
      const resolvedRows = this.resolveServiceVariantRows(variantSlugs)
      return {
        rows: resolvedRows as Row[],
        rowCount: resolvedRows.length,
      }
    }

    if (normalizedSql.includes('INSERT INTO "booking_requests"')) {
      const row = this.createBookingRequest(params)
      return {
        rows: [
          {
            id: row.id,
            publicCode: row.publicCode,
            bookingMode: row.bookingMode,
            pricingSource: row.pricingSource,
            estimatedTotal: row.estimatedTotal,
            currency: row.currency,
          } as Row,
        ],
        rowCount: 1,
      }
    }

    if (normalizedSql.includes('INSERT INTO "booking_request_items"')) {
      this.createBookingRequestItem(params)
      return { rows: [], rowCount: 1 } as { rows: Row[]; rowCount: number }
    }

    if (
      normalizedSql.startsWith('SELECT') &&
      normalizedSql.includes('FROM "booking_requests"') &&
      normalizedSql.includes('WHERE "id" = $1')
    ) {
      const rows = this.selectBookingRequestRows(params).map((row) => ({
        id: row.id,
        publicCode: row.publicCode,
        bookingMode: row.bookingMode,
        pricingSource: row.pricingSource,
        estimatedTotal: row.estimatedTotal,
        currency: row.currency,
      }))
      return { rows: rows as Row[], rowCount: rows.length }
    }

    if (
      normalizedSql.startsWith('SELECT') &&
      normalizedSql.includes('FROM "booking_request_items"') &&
      normalizedSql.includes('WHERE "bookingRequestId" = $1')
    ) {
      const rows = this.selectBookingRequestItemRows(params).map((row) => ({
        itemSlug: row.itemSlug,
        itemName: row.itemName,
        itemKind: row.itemKind,
        serviceVariantId: row.serviceVariantId,
        quantity: row.quantity,
        sessionDurationMinutes: row.sessionDurationMinutes,
        durationMinutes: row.durationMinutes,
        unitPriceUsdSnapshot: row.unitPriceUsdSnapshot,
        lineTotalUsdSnapshot: row.lineTotalUsdSnapshot,
        clientPriceDisplay: row.clientPriceDisplay,
      }))
      return { rows: rows as Row[], rowCount: rows.length }
    }

    throw new Error(`Unexpected SQL in memory executor: ${normalizedSql}`)
  }
}

function baseSubmission(): CustomBundleSubmissionInputV1 {
  return {
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
}

function caseSubmission(
  overrides: Partial<CustomBundleSubmissionInputV1> & {
    items?: CustomBundleSubmissionItemInputV1[]
  } = {},
): CustomBundleSubmissionInputV1 {
  return {
    ...baseSubmission(),
    ...overrides,
    requester: {
      ...baseSubmission().requester,
      ...(overrides.requester ?? {}),
    },
    items: overrides.items ?? baseSubmission().items,
  }
}

function createSeededExecutor(): MemorySqlExecutor {
  const executor = new MemorySqlExecutor()
  const services: ServiceRow[] = [
    { id: 'svc_sala', slug: 'sala-ensayo', name: 'Sala de Ensayo', isActive: true },
    { id: 'svc_grabacion', slug: 'grabacion', name: 'Grabacion', isActive: true },
    {
      id: 'svc_mezcla',
      slug: 'mezcla-masterizacion',
      name: 'Mezcla y Masterizacion',
      isActive: true,
    },
    {
      id: 'svc_podcast',
      slug: 'podcast-locucion',
      name: 'Podcast / Locucion',
      isActive: true,
    },
    { id: 'svc_video', slug: 'video-session', name: 'Video Session', isActive: true },
    {
      id: 'svc_arreglos',
      slug: 'arreglos-musicales',
      name: 'Arreglos Musicales',
      isActive: true,
    },
    { id: 'svc_consultoria', slug: 'consultoria', name: 'Consultoria', isActive: true },
  ]
  for (const service of services) {
    executor.seedService(service)
  }

  const variants: ServiceVariantRow[] = [
    {
      id: 'svc_var_sala_premium',
      slug: 'sala-ensayo-premium',
      name: 'Sala Premium',
      serviceSlug: 'sala-ensayo',
      isActive: true,
    },
    {
      id: 'svc_var_sala_prioritaria',
      slug: 'sala-ensayo-prioritaria',
      name: 'Sala Prioritaria',
      serviceSlug: 'sala-ensayo',
      isActive: true,
    },
    {
      id: 'svc_var_grabacion_estudio',
      slug: 'grabacion-hora-estudio',
      name: 'Grabacion en estudio',
      serviceSlug: 'grabacion',
      isActive: true,
    },
    {
      id: 'svc_var_mezcla',
      slug: 'mezcla-por-tema',
      name: 'Mezcla',
      serviceSlug: 'mezcla-masterizacion',
      isActive: true,
    },
    {
      id: 'svc_var_master',
      slug: 'master-por-tema',
      name: 'Master',
      serviceSlug: 'mezcla-masterizacion',
      isActive: true,
    },
    {
      id: 'svc_var_podcast',
      slug: 'podcast-por-episodio',
      name: 'Podcast',
      serviceSlug: 'podcast-locucion',
      isActive: true,
    },
    {
      id: 'svc_var_studio_session',
      slug: 'studio-session-fija',
      name: 'Studio Session',
      serviceSlug: 'video-session',
      isActive: true,
    },
    {
      id: 'svc_var_arreglo',
      slug: 'arreglos-musicales-por-tema',
      name: 'Arreglo por tema',
      serviceSlug: 'arreglos-musicales',
      isActive: true,
    },
    {
      id: 'svc_var_consultoria_wrong_service',
      slug: 'consultoria-produccion',
      name: 'Clase / consultoria de produccion',
      serviceSlug: 'sala-ensayo',
      isActive: true,
    },
  ]
  for (const variant of variants) {
    executor.seedServiceVariant(variant)
  }

  return executor
}

function assertNoSQL(executor: MemorySqlExecutor, label: string): void {
  assert.equal(executor.calls.length, 0, `${label} must not execute SQL`)
}

function assertHasQuery(executor: MemorySqlExecutor, pattern: RegExp, label: string): void {
  assert.ok(
    executor.calls.some((call) => pattern.test(call.sql)),
    `${label} must execute SQL matching ${pattern}`,
  )
}

function assertPersistedBundle(
  executor: MemorySqlExecutor,
  expected: {
    publicCode: string
    itemCount: number
    serviceItemCount: number
    addonItemCount: number
    includedItemCount: number
    estimatedTotalUsd: number
    bookingMode?: string
    pricingSource?: string
  },
): void {
  const bookingRequest = executor.state.bookingRequests.find(
    (row) => row.publicCode === expected.publicCode,
  )
  assert.ok(bookingRequest, `expected booking request ${expected.publicCode} to exist`)
  assert.equal(bookingRequest?.bookingMode, expected.bookingMode ?? 'custom_bundle')
  assert.equal(
    bookingRequest?.pricingSource,
    expected.pricingSource ?? CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
  )
  assert.equal(
    Number(bookingRequest?.estimatedTotal),
    expected.estimatedTotalUsd,
    'booking request estimated total mismatch',
  )

  const items = executor.state.bookingRequestItems.filter(
    (row) => row.bookingRequestId === bookingRequest?.id,
  )
  assert.equal(items.length, expected.itemCount)

  const serviceItemCount = items.filter((row) => row.itemKind === 'service').length
  const addonItemCount = items.filter((row) => row.itemKind === 'addon').length
  const includedItemCount = items.filter((row) => row.itemKind === 'included').length
  assert.equal(serviceItemCount, expected.serviceItemCount)
  assert.equal(addonItemCount, expected.addonItemCount)
  assert.equal(includedItemCount, expected.includedItemCount)
}

function assertNoForbiddenSourcePatterns(source: string): void {
  for (const [pattern, label] of [
    [/from\s+['"]prisma['"]/, 'Prisma import'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db import'],
    [/process\.env/, 'process.env'],
    [/fetch\s*\(/, 'fetch'],
    [/['"]use server['"]/, 'use server'],
  ] as const) {
    assert.equal(pattern.test(source), false, label)
  }
}

function assertAdapterSource(pathname: string): void {
  const source = readFileSync(pathname, 'utf8')
  assertNoForbiddenSourcePatterns(source)
  assert.ok(
    source.includes('persistenceReady en BKG-03'),
    'adapter comment must document the persistenceReady context',
  )
  assert.ok(
    source.includes('CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE'),
    'adapter must use the authoritative pricing source constant',
  )
}

async function run(): Promise<void> {
  const adapterSourcePath = resolve(process.cwd(), 'lib/bookings/custom-bundle-persistence.ts')
  assertAdapterSource(adapterSourcePath)

  assert.equal(CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE, 'server_catalog_v1')

  const gapResult = repriceCustomBundleSubmission(
    caseSubmission({
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
    }),
  )
  assert.equal(gapResult.ok, true)
  if (!gapResult.ok || gapResult.stage !== 'priced') {
    throw new Error('gap payload should be priced')
  }
  assert.equal(gapResult.quote.persistenceReady, false)
  assert.deepStrictEqual(
    gapResult.quote.catalogGaps.map((gap) => gap.itemSlug),
    ['combo-percusion', 'grabaciones-voces'],
  )

  const contractExecutor = createSeededExecutor()
  const contractResult = await persistCustomBundleSubmissionWithSql(contractExecutor, {
    submission: {
      ...caseSubmission(),
      estimatedTotalUsd: 1,
    },
    publicCode: 'TUR-2099-100',
    submittedAt: new Date('2099-01-01T12:00:00.000Z'),
  })
  assert.equal(contractResult.ok, false)
  assert.equal(contractResult.stage, 'contract')
  assertNoSQL(contractExecutor, 'contract failure')

  const businessExecutor = createSeededExecutor()
  const businessResult = await persistCustomBundleSubmissionWithSql(businessExecutor, {
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
    publicCode: 'TUR-2099-101',
    submittedAt: new Date('2099-01-01T12:00:00.000Z'),
  })
  assert.equal(businessResult.ok, false)
  assert.equal(businessResult.stage, 'business_rules')
  assertNoSQL(businessExecutor, 'business rules failure')

  const invalidPublicCodeExecutor = createSeededExecutor()
  const invalidPublicCodeResult = await persistCustomBundleSubmissionWithSql(
    invalidPublicCodeExecutor,
    {
      submission: caseSubmission(),
      publicCode: 'INVALID',
      submittedAt: new Date('2099-01-01T12:00:00.000Z'),
    },
  )
  assert.equal(invalidPublicCodeResult.ok, false)
  assert.equal(invalidPublicCodeResult.stage, 'server_context')
  assert.equal(invalidPublicCodeResult.code, 'INVALID_PUBLIC_CODE')
  assertNoSQL(invalidPublicCodeExecutor, 'invalid publicCode')

  const invalidSubmittedAtExecutor = createSeededExecutor()
  const invalidSubmittedAtResult = await persistCustomBundleSubmissionWithSql(
    invalidSubmittedAtExecutor,
    {
      submission: caseSubmission(),
      publicCode: 'TUR-2099-102',
      submittedAt: new Date(Number.NaN),
    },
  )
  assert.equal(invalidSubmittedAtResult.ok, false)
  assert.equal(invalidSubmittedAtResult.stage, 'server_context')
  assert.equal(invalidSubmittedAtResult.code, 'INVALID_SUBMITTED_AT')
  assertNoSQL(invalidSubmittedAtExecutor, 'invalid submittedAt')

  const successfulExecutor = createSeededExecutor()
  const successfulResult = await persistCustomBundleSubmissionWithSql(successfulExecutor, {
    submission: caseSubmission(),
    publicCode: 'TUR-2099-001',
    submittedAt: new Date('2099-01-01T12:00:00.000Z'),
  })
  assert.equal(successfulResult.ok, true)
  assert.equal(successfulResult.stage, 'persisted')
  assertHasQuery(successfulExecutor, /BEGIN ISOLATION LEVEL SERIALIZABLE/i, 'successful persist')
  assertHasQuery(successfulExecutor, /COMMIT/i, 'successful persist')
  assertPersistedBundle(successfulExecutor, {
    publicCode: 'TUR-2099-001',
    itemCount: 5,
    serviceItemCount: 1,
    addonItemCount: 2,
    includedItemCount: 2,
    estimatedTotalUsd: 280,
  })
  assert.equal(successfulResult.eventEndDateIso, '2026-06-24T16:00:00.000Z')
  assert.equal(successfulResult.totalDurationMinutes, 120)
  assert.equal(successfulResult.serviceItemCount, 1)
  assert.equal(successfulResult.addonItemCount, 2)
  assert.equal(successfulResult.includedItemCount, 2)

  const weekendExecutor = createSeededExecutor()
  const weekendResult = await persistCustomBundleSubmissionWithSql(weekendExecutor, {
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
  assert.equal(weekendResult.ok, true)
  if (!weekendResult.ok) {
    throw new Error('weekend payload should persist')
  }
  assert.equal(weekendResult.estimatedTotalUsd, 70)
  assert.equal(weekendResult.totalDurationMinutes, 120)
  assert.equal(weekendResult.itemCount, 3)
  assert.equal(weekendResult.serviceItemCount, 1)
  assert.equal(weekendResult.addonItemCount, 0)
  assert.equal(weekendResult.includedItemCount, 2)
  assertPersistedBundle(weekendExecutor, {
    publicCode: 'TUR-2099-002',
    itemCount: 3,
    serviceItemCount: 1,
    addonItemCount: 0,
    includedItemCount: 2,
    estimatedTotalUsd: 70,
  })

  const missingVariantExecutor = createSeededExecutor()
  const missingVariantResult = await persistCustomBundleSubmissionWithSql(missingVariantExecutor, {
    submission: caseSubmission({
      items: [
        {
          itemSlug: 'grabacion-ensayo',
          quantity: 1,
          sessionDurationMinutes: null,
        },
      ],
    }),
    publicCode: 'TUR-2099-003',
    submittedAt: new Date('2099-01-03T12:00:00.000Z'),
  })
  assert.equal(missingVariantResult.ok, false)
  assert.equal(missingVariantResult.stage, 'catalog_resolution')
  assert.equal(missingVariantResult.code, 'SERVICE_VARIANT_NOT_FOUND')
  assertHasQuery(missingVariantExecutor, /BEGIN ISOLATION LEVEL SERIALIZABLE/i, 'missing service variant')
  assertHasQuery(missingVariantExecutor, /ROLLBACK/i, 'missing service variant')
  assert.equal(missingVariantExecutor.state.bookingRequests.length, 0)
  assert.equal(missingVariantExecutor.state.bookingRequestItems.length, 0)

  const duplicatePublicCodeExecutor = createSeededExecutor()
  const firstDuplicateResult = await persistCustomBundleSubmissionWithSql(
    duplicatePublicCodeExecutor,
    {
      submission: caseSubmission(),
      publicCode: 'TUR-2099-004',
      submittedAt: new Date('2099-01-04T12:00:00.000Z'),
    },
  )
  assert.equal(firstDuplicateResult.ok, true)
  const secondDuplicateResult = await persistCustomBundleSubmissionWithSql(
    duplicatePublicCodeExecutor,
    {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      }),
      publicCode: 'TUR-2099-004',
      submittedAt: new Date('2099-01-04T12:30:00.000Z'),
    },
  )
  assert.equal(secondDuplicateResult.ok, false)
  assert.equal(secondDuplicateResult.stage, 'persistence')
  assert.equal(secondDuplicateResult.code, 'PUBLIC_CODE_CONFLICT')
  assert.equal(
    duplicatePublicCodeExecutor.state.bookingRequests.filter((row) => row.publicCode === 'TUR-2099-004').length,
    1,
  )
  assertHasQuery(duplicatePublicCodeExecutor, /ROLLBACK/i, 'duplicate public code')

  const rollbackExecutor = createSeededExecutor()
  rollbackExecutor.failOnItemSlug = 'instrumentos-adicionales'
  const rollbackResult = await persistCustomBundleSubmissionWithSql(rollbackExecutor, {
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
    publicCode: 'TUR-2099-005',
    submittedAt: new Date('2099-01-05T12:00:00.000Z'),
  })
  assert.equal(rollbackResult.ok, false)
  assert.equal(rollbackResult.stage, 'persistence')
  assert.equal(rollbackResult.code, 'DATABASE_WRITE_FAILED')
  assert.equal(
    rollbackExecutor.state.bookingRequests.filter((row) => row.publicCode === 'TUR-2099-005').length,
    0,
  )
  assert.equal(rollbackExecutor.state.bookingRequestItems.length, 0)
  assertHasQuery(rollbackExecutor, /ROLLBACK/i, 'rollback failure')

  const serviceMismatchExecutor = createSeededExecutor()
  const serviceMismatchResult = await persistCustomBundleSubmissionWithSql(
    serviceMismatchExecutor,
    {
      submission: caseSubmission({
        items: [
          {
            itemSlug: 'consultoria-produccion',
            quantity: 1,
            sessionDurationMinutes: 60,
          },
        ],
      }),
      publicCode: 'TUR-2099-006',
      submittedAt: new Date('2099-01-06T12:00:00.000Z'),
    },
  )
  assert.equal(serviceMismatchResult.ok, false)
  assert.equal(serviceMismatchResult.stage, 'catalog_resolution')
  assert.equal(serviceMismatchResult.code, 'SERVICE_VARIANT_SERVICE_MISMATCH')
  assertHasQuery(serviceMismatchExecutor, /BEGIN ISOLATION LEVEL SERIALIZABLE/i, 'service mismatch')
  assertHasQuery(serviceMismatchExecutor, /ROLLBACK/i, 'service mismatch')
  assert.equal(serviceMismatchExecutor.state.bookingRequests.length, 0)
  assert.equal(serviceMismatchExecutor.state.bookingRequestItems.length, 0)

  const isolationExecutor = createSeededExecutor()
  const firstIsolationResult = await persistCustomBundleSubmissionWithSql(isolationExecutor, {
    submission: caseSubmission({
      items: [
        {
          itemSlug: 'sala-premium',
          quantity: 1,
          sessionDurationMinutes: null,
        },
      ],
    }),
    publicCode: 'TUR-2099-007',
    submittedAt: new Date('2099-01-07T12:00:00.000Z'),
  })
  assert.equal(firstIsolationResult.ok, true)
  const secondIsolationResult = await persistCustomBundleSubmissionWithSql(isolationExecutor, {
    submission: caseSubmission({
      eventDate: '2026-06-25',
      items: [
        {
          itemSlug: 'sala-premium',
          quantity: 1,
          sessionDurationMinutes: null,
        },
      ],
    }),
    publicCode: 'TUR-2099-008',
    submittedAt: new Date('2099-01-08T12:00:00.000Z'),
  })
  assert.equal(secondIsolationResult.ok, true)
  assert.equal(
    isolationExecutor.state.bookingRequestItems.filter((row) => row.itemSlug === 'sala-premium').length,
    2,
  )

  const repricedQuote = repriceCustomBundleSubmission(caseSubmission())
  assert.equal(repricedQuote.ok, true)
  if (!repricedQuote.ok || repricedQuote.stage !== 'priced') {
    throw new Error('parity quote must be priced')
  }
  assert.equal(repricedQuote.quote.pricingSource, CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE)

  assert.deepStrictEqual(
    CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS,
    ['tecnico-sonido', 'backline-equipamiento'],
  )
  assert.equal(CUSTOM_BUNDLE_ITEMS.filter((item) => item.active && !item.included).length, 22)
  assert.equal(
    CUSTOM_BUNDLE_PERSISTENCE_TARGETS['combo-percusion'].kind,
    'catalog_gap',
  )

  console.log('booking_custom_bundle_persistence_contract OK')
}

run().catch((error) => {
  console.error('booking_custom_bundle_persistence_contract FAILED')
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
