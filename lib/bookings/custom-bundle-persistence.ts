import {
  CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
  repriceCustomBundleSubmission,
  type CustomBundleAuthoritativeQuote,
} from '@/lib/bookings/custom-bundle-repricing'
import {
  getCustomBundlePersistenceTarget,
  getCustomBundleServerIncludedItemSlugs,
  type CustomBundleSubmissionContractIssue,
} from '@/lib/bookings/custom-bundle-submission'
import type { CustomBundleEstimateIssue } from '@/lib/bookings/types'
import type { CustomBundleEstimateLine } from '@/lib/bookings/types'

export interface CustomBundleSqlQueryResult<Row = Record<string, unknown>> {
  rows: Row[]
  rowCount: number | null
}

export interface CustomBundleSqlExecutor {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<CustomBundleSqlQueryResult<Row>>
}

export interface PersistCustomBundleSubmissionInput {
  submission: unknown
  publicCode: string
  submittedAt: Date
}

export interface CustomBundlePersistenceCatalogResolutionIssue {
  code:
    | 'SERVICE_VARIANT_NOT_FOUND'
    | 'SERVICE_VARIANT_SERVICE_MISMATCH'
    | 'SERVICE_VARIANT_INACTIVE'
  itemSlug: string
  variantSlug: string
  message: string
}

export type PersistCustomBundleSubmissionResult =
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundleSubmissionContractIssue[]
    }
  | {
      ok: false
      stage: 'business_rules'
      businessIssues: CustomBundleEstimateIssue[]
    }
  | {
      ok: false
      stage: 'server_context'
      code: 'INVALID_PUBLIC_CODE' | 'INVALID_SUBMITTED_AT'
      message: string
    }
  | {
      ok: false
      stage: 'catalog_resolution'
      code:
        | 'SERVICE_VARIANT_NOT_FOUND'
        | 'SERVICE_VARIANT_SERVICE_MISMATCH'
        | 'SERVICE_VARIANT_INACTIVE'
      itemSlug: string
      variantSlug: string
      message: string
    }
  | {
      ok: false
      stage: 'persistence'
      code: 'PUBLIC_CODE_CONFLICT' | 'DATABASE_WRITE_FAILED'
      message: string
    }
  | {
      ok: true
      stage: 'persisted'
      bookingRequestId: string
      publicCode: string
      itemCount: number
      estimatedTotalUsd: number
      totalDurationMinutes: number
      eventDateIso: string
      eventEndDateIso: string
      serviceItemCount: number
      addonItemCount: number
      includedItemCount: number
    }

interface ResolvedServiceVariantRow {
  variantId: string
  variantSlug: string
  serviceSlug: string
  variantIsActive: boolean
  serviceIsActive: boolean
}

interface BookingRequestRow {
  id: string
  publicCode: string
  bookingMode: string
  pricingSource: string | null
  estimatedTotal: string | number | null
  currency: string
}

interface BookingRequestItemRow {
  itemSlug: string | null
  itemName: string | null
  itemKind: string | null
  serviceVariantId: string | null
  quantity: number | null
  sessionDurationMinutes: number | null
  durationMinutes: number | null
  unitPriceUsdSnapshot: string | number | null
  lineTotalUsdSnapshot: string | number | null
  clientPriceDisplay: string | null
}

interface PersistableLineDescriptor {
  itemSlug: string
  itemName: string
  itemKind: 'service' | 'addon' | 'included'
  serviceVariantId: string | null
  quantity: number
  sessionDurationMinutes: number
  durationMinutes: number
  unitPriceUsdSnapshot: string
  lineTotalUsdSnapshot: string
  clientPriceDisplay: string
}

interface ServiceVariantTargetDescriptor {
  itemSlug: string
  variantSlug: string
  serviceSlug: string
}

const BOOKING_PUBLIC_CODE_REGEX = /^TUR-\d{4}-\d{3,}$/
const CARACAS_UTC_OFFSET_MINUTES = -4 * 60
const BOOKING_REQUEST_EVENT_TITLE = 'Solicitud - Arma tu paquete'
const BOOKING_REQUEST_STATUS = 'under_review'
const BOOKING_REQUEST_PRIORITY_LEVEL = 'normal'
const BOOKING_REQUEST_SOURCE = 'web'
const BOOKING_REQUEST_CURRENCY = 'USD'
const BOOKING_REQUEST_BOOKING_MODE = 'custom_bundle'
const BOOKING_REQUEST_PRICING_SOURCE = CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE

function isValidSubmittedAt(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidPublicCode(value: string): boolean {
  return BOOKING_PUBLIC_CODE_REGEX.test(value)
}

function buildServerContextIssue(
  code: 'INVALID_PUBLIC_CODE' | 'INVALID_SUBMITTED_AT',
  message: string,
): Extract<PersistCustomBundleSubmissionResult, { stage: 'server_context' }> {
  return {
    ok: false,
    stage: 'server_context',
    code,
    message,
  }
}

function buildCatalogResolutionIssue(
  code: CustomBundlePersistenceCatalogResolutionIssue['code'],
  itemSlug: string,
  variantSlug: string,
  message: string,
): Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }> {
  return {
    ok: false,
    stage: 'catalog_resolution',
    code,
    itemSlug,
    variantSlug,
    message,
  }
}

function buildPersistenceIssue(
  code: 'PUBLIC_CODE_CONFLICT' | 'DATABASE_WRITE_FAILED',
  message: string,
): Extract<PersistCustomBundleSubmissionResult, { stage: 'persistence' }> {
  return {
    ok: false,
    stage: 'persistence',
    code,
    message,
  }
}

function buildCaracasDateTime(eventDate: string, startTime: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(startTime)

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN)
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  const invalidDateParts =
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59

  if (invalidDateParts) {
    return new Date(Number.NaN)
  }

  const utcEpochMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    CARACAS_UTC_OFFSET_MINUTES * 60 * 1000

  return new Date(utcEpochMs)
}

function formatMoneySnapshot(value: number): string {
  return value.toFixed(2)
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return Number.NaN
}

function isSameMoneyValue(value: string | number | null | undefined, expected: number): boolean {
  const numericValue = toNumber(value)
  return Number.isFinite(numericValue) && numericValue === expected
}

function isQuoteLineIncluded(line: CustomBundleEstimateLine): boolean {
  return line.isIncluded === true
}

function getServiceVariantTargets(
  quote: CustomBundleAuthoritativeQuote,
): ServiceVariantTargetDescriptor[] {
  const targets: ServiceVariantTargetDescriptor[] = []

  for (const line of quote.estimate.lines) {
    const persistenceTarget = getCustomBundlePersistenceTarget(line.item.slug)
    if (!persistenceTarget || persistenceTarget.kind !== 'service_variant') {
      continue
    }

    targets.push({
      itemSlug: line.item.slug,
      variantSlug: persistenceTarget.variantSlug,
      serviceSlug: persistenceTarget.serviceSlug,
    })
  }

  return targets
}

function mapLineToPersistenceDescriptor(
  line: CustomBundleEstimateLine,
  resolvedServiceVariants: Map<string, ResolvedServiceVariantRow>,
): PersistableLineDescriptor | Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }> {
  if (isQuoteLineIncluded(line)) {
    return {
      itemSlug: line.item.slug,
      itemName: line.item.name,
      itemKind: 'included',
      serviceVariantId: null,
      quantity: line.quantity,
      sessionDurationMinutes: line.durationMinutes,
      durationMinutes: line.durationMinutes,
      unitPriceUsdSnapshot: formatMoneySnapshot(line.unitPriceUsd),
      lineTotalUsdSnapshot: formatMoneySnapshot(line.lineTotalUsd),
      clientPriceDisplay: line.item.clientPriceDisplay,
    }
  }

  const persistenceTarget = getCustomBundlePersistenceTarget(line.item.slug)
  if (!persistenceTarget) {
    return buildCatalogResolutionIssue(
      'SERVICE_VARIANT_NOT_FOUND',
      line.item.slug,
      '',
      `No existe una estrategia de persistencia para ${line.item.slug}.`,
    )
  }

  if (persistenceTarget.kind === 'catalog_gap') {
    return {
      itemSlug: line.item.slug,
      itemName: line.item.name,
      itemKind: 'addon',
      serviceVariantId: null,
      quantity: line.quantity,
      sessionDurationMinutes: line.durationMinutes,
      durationMinutes: line.durationMinutes,
      unitPriceUsdSnapshot: formatMoneySnapshot(line.unitPriceUsd),
      lineTotalUsdSnapshot: formatMoneySnapshot(line.lineTotalUsd),
      clientPriceDisplay: line.item.clientPriceDisplay,
    }
  }

  const resolvedServiceVariant = resolvedServiceVariants.get(persistenceTarget.variantSlug)
  if (!resolvedServiceVariant) {
    return buildCatalogResolutionIssue(
      'SERVICE_VARIANT_NOT_FOUND',
      line.item.slug,
      persistenceTarget.variantSlug,
      `No se encontro la variante ${persistenceTarget.variantSlug} para ${line.item.slug}.`,
    )
  }

  if (resolvedServiceVariant.variantSlug !== persistenceTarget.variantSlug) {
    return buildCatalogResolutionIssue(
      'SERVICE_VARIANT_NOT_FOUND',
      line.item.slug,
      persistenceTarget.variantSlug,
      `No se encontro la variante ${persistenceTarget.variantSlug} para ${line.item.slug}.`,
    )
  }

  if (resolvedServiceVariant.serviceSlug !== persistenceTarget.serviceSlug) {
    return buildCatalogResolutionIssue(
      'SERVICE_VARIANT_SERVICE_MISMATCH',
      line.item.slug,
      persistenceTarget.variantSlug,
      `La variante ${persistenceTarget.variantSlug} no pertenece al servicio esperado ${persistenceTarget.serviceSlug}.`,
    )
  }

  if (!resolvedServiceVariant.variantIsActive || !resolvedServiceVariant.serviceIsActive) {
    return buildCatalogResolutionIssue(
      'SERVICE_VARIANT_INACTIVE',
      line.item.slug,
      persistenceTarget.variantSlug,
      `La variante ${persistenceTarget.variantSlug} o su servicio asociado estan inactivos.`,
    )
  }

  return {
    itemSlug: line.item.slug,
    itemName: line.item.name,
    itemKind: 'service',
    serviceVariantId: resolvedServiceVariant.variantId,
    quantity: line.quantity,
    sessionDurationMinutes: line.durationMinutes,
    durationMinutes: line.durationMinutes,
    unitPriceUsdSnapshot: formatMoneySnapshot(line.unitPriceUsd),
    lineTotalUsdSnapshot: formatMoneySnapshot(line.lineTotalUsd),
    clientPriceDisplay: line.item.clientPriceDisplay,
  }
}

function isCatalogResolutionIssue(
  value: PersistableLineDescriptor | Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }>,
): value is Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }> {
  return 'stage' in value && value.stage === 'catalog_resolution'
}

async function rollbackSilently(executor: CustomBundleSqlExecutor): Promise<void> {
  await executor.query('ROLLBACK').catch(() => {})
}

async function resolveServiceVariants(
  executor: CustomBundleSqlExecutor,
  quote: CustomBundleAuthoritativeQuote,
): Promise<
  | {
      ok: true
      rows: Map<string, ResolvedServiceVariantRow>
    }
  | Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }>
> {
  const targets = getServiceVariantTargets(quote)

  if (targets.length === 0) {
    return {
      ok: true,
      rows: new Map(),
    }
  }

  const desiredVariantSlugs = [...new Set(targets.map((target) => target.variantSlug))]
  const result = await executor.query<ResolvedServiceVariantRow>(
    `
      SELECT
        sv.id AS "variantId",
        sv.slug AS "variantSlug",
        sv."isActive" AS "variantIsActive",
        s.slug AS "serviceSlug",
        s."isActive" AS "serviceIsActive"
      FROM "service_variants" sv
      INNER JOIN "services" s ON s.id = sv."serviceId"
      WHERE sv.slug = ANY($1::text[])
    `,
    [desiredVariantSlugs],
  )

  const rowsBySlug = new Map(result.rows.map((row) => [row.variantSlug, row]))

  for (const target of targets) {
    const resolved = rowsBySlug.get(target.variantSlug)
    if (!resolved) {
      return buildCatalogResolutionIssue(
        'SERVICE_VARIANT_NOT_FOUND',
        target.itemSlug,
        target.variantSlug,
        `No se encontro la variante ${target.variantSlug} para ${target.itemSlug}.`,
      )
    }

    if (resolved.serviceSlug !== target.serviceSlug) {
      return buildCatalogResolutionIssue(
        'SERVICE_VARIANT_SERVICE_MISMATCH',
        target.itemSlug,
        target.variantSlug,
        `La variante ${target.variantSlug} no pertenece al servicio esperado ${target.serviceSlug}.`,
      )
    }

    if (!resolved.variantIsActive || !resolved.serviceIsActive) {
      return buildCatalogResolutionIssue(
        'SERVICE_VARIANT_INACTIVE',
        target.itemSlug,
        target.variantSlug,
        `La variante ${target.variantSlug} o su servicio asociado estan inactivos.`,
      )
    }
  }

  return {
    ok: true,
    rows: rowsBySlug,
  }
}

function buildBookingRequestNotes(extrasNotes: string): string | null {
  const normalized = extrasNotes.trim()
  return normalized.length > 0 ? normalized : null
}

function assertQuoteLineIntegrity(quote: CustomBundleAuthoritativeQuote): void {
  const seenItemSlugs = new Set<string>()
  for (const line of quote.estimate.lines) {
    if (seenItemSlugs.has(line.item.slug)) {
      throw new Error(`Duplicate quote item slug detected: ${line.item.slug}`)
    }
    seenItemSlugs.add(line.item.slug)
  }
}

function buildPersistableLineDescriptors(
  quote: CustomBundleAuthoritativeQuote,
  resolvedServiceVariants: Map<string, ResolvedServiceVariantRow>,
): PersistableLineDescriptor[] | Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }> {
  const descriptors: PersistableLineDescriptor[] = []

  for (const line of quote.estimate.lines) {
    const descriptor = mapLineToPersistenceDescriptor(line, resolvedServiceVariants)
    if (isCatalogResolutionIssue(descriptor)) {
      return descriptor
    }

    descriptors.push(descriptor)
  }

  return descriptors
}

function countItemsByKind(
  descriptors: PersistableLineDescriptor[],
): {
  serviceItemCount: number
  addonItemCount: number
  includedItemCount: number
} {
  return descriptors.reduce(
    (accumulator, descriptor) => {
      if (descriptor.itemKind === 'service') {
        accumulator.serviceItemCount += 1
      } else if (descriptor.itemKind === 'addon') {
        accumulator.addonItemCount += 1
      } else {
        accumulator.includedItemCount += 1
      }

      return accumulator
    },
    {
      serviceItemCount: 0,
      addonItemCount: 0,
      includedItemCount: 0,
    },
  )
}

function buildPersistenceWriteFailure(message: string): Extract<
  PersistCustomBundleSubmissionResult,
  { stage: 'persistence' }
> {
  return buildPersistenceIssue('DATABASE_WRITE_FAILED', message)
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === '23505'
  )
}

function isPublicCodeConflictError(error: unknown): boolean {
  if (!isPostgresUniqueViolation(error)) {
    return false
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'constraint' in error &&
    typeof (error as { constraint?: unknown }).constraint === 'string'
  ) {
    return (error as { constraint: string }).constraint.includes('publicCode')
  }

  return true
}

export async function persistCustomBundleSubmissionWithSql(
  executor: CustomBundleSqlExecutor,
  input: PersistCustomBundleSubmissionInput,
): Promise<PersistCustomBundleSubmissionResult> {
  if (!isValidPublicCode(input.publicCode)) {
    return buildServerContextIssue(
      'INVALID_PUBLIC_CODE',
      'El publicCode debe cumplir el formato TUR-YYYY-NNN.',
    )
  }

  if (!isValidSubmittedAt(input.submittedAt)) {
    return buildServerContextIssue(
      'INVALID_SUBMITTED_AT',
      'submittedAt debe ser una fecha valida.',
    )
  }

  const repricingResult = repriceCustomBundleSubmission(input.submission)
  if (!repricingResult.ok) {
    if (repricingResult.stage === 'contract') {
      return {
        ok: false,
        stage: 'contract',
        contractIssues: repricingResult.contractIssues,
      }
    }

    return {
      ok: false,
      stage: 'business_rules',
      businessIssues: repricingResult.businessIssues,
    }
  }

  const quote = repricingResult.quote

  // persistenceReady en BKG-03 significaba completitud de ServiceVariant antes de existir
  // la estrategia snapshot-backed. Con snapshot-backed validado, los catalog gaps siguen
  // persistiendo como addons con serviceVariantId null.
  assertQuoteLineIntegrity(quote)

  const eventDateTime = buildCaracasDateTime(quote.submission.eventDate, quote.submission.startTime)
  const eventEndDateTime = new Date(
    eventDateTime.getTime() + quote.estimate.totalDurationMinutes * 60 * 1000,
  )

  if (Number.isNaN(eventDateTime.getTime()) || Number.isNaN(eventEndDateTime.getTime())) {
    return buildPersistenceWriteFailure('No se pudo construir la fecha autoritativa del evento.')
  }

  const transactionState = {
    started: false,
  }

  try {
    await executor.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    transactionState.started = true

    const serviceVariantResolution = await resolveServiceVariants(executor, quote)
    if (!serviceVariantResolution.ok) {
      await rollbackSilently(executor)
      transactionState.started = false
      return serviceVariantResolution
    }

    const descriptorsOrResolution = buildPersistableLineDescriptors(quote, serviceVariantResolution.rows)

    if (!Array.isArray(descriptorsOrResolution)) {
      await rollbackSilently(executor)
      transactionState.started = false
      return descriptorsOrResolution
    }

    const descriptors = descriptorsOrResolution
    const kindCounts = countItemsByKind(descriptors)
    const itemCount = descriptors.length
    const lineSnapshotTotal = descriptors.reduce(
      (total, descriptor) => total + Number(descriptor.lineTotalUsdSnapshot),
      0,
    )
    const adjustmentTotal = quote.estimate.adjustments.reduce(
      (total, adjustment) => total + adjustment.amountUsd,
      0,
    )

    if (itemCount !== quote.estimate.lines.length) {
      throw new Error('Persisted item count does not match the authoritative quote.')
    }

    if (
      Math.round((lineSnapshotTotal + adjustmentTotal) * 100) / 100 !==
      quote.estimate.estimatedTotalUsd
    ) {
      throw new Error('Persisted totals do not match the authoritative quote.')
    }

    const bookingRequestInsert = await executor.query<BookingRequestRow>(
      `
        INSERT INTO "booking_requests" (
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
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        )
        RETURNING
          "id",
          "publicCode",
          "bookingMode",
          "pricingSource",
          "estimatedTotal",
          "currency"
      `,
      [
        input.publicCode,
        BOOKING_REQUEST_STATUS,
        BOOKING_REQUEST_PRIORITY_LEVEL,
        BOOKING_REQUEST_SOURCE,
        quote.submission.requester.name,
        quote.submission.requester.email,
        quote.submission.requester.phone,
        BOOKING_REQUEST_EVENT_TITLE,
        eventDateTime,
        eventEndDateTime,
        buildBookingRequestNotes(quote.submission.extrasNotes),
        null,
        formatMoneySnapshot(quote.estimate.estimatedTotalUsd),
        BOOKING_REQUEST_CURRENCY,
        input.submittedAt,
        BOOKING_REQUEST_BOOKING_MODE,
        BOOKING_REQUEST_PRICING_SOURCE,
      ],
    ).catch((error: unknown) => {
      if (isPublicCodeConflictError(error)) {
        throw buildPersistenceIssue(
          'PUBLIC_CODE_CONFLICT',
          'Ya existe una solicitud con ese publicCode.',
        )
      }

      throw buildPersistenceWriteFailure('No se pudo crear la solicitud de reserva.')
    })

    const bookingRequestId = bookingRequestInsert.rows[0]?.id
    if (!bookingRequestId) {
      throw buildPersistenceWriteFailure('No se pudo recuperar el bookingRequest persistido.')
    }

    for (const descriptor of descriptors) {
      await executor.query(
        `
          INSERT INTO "booking_request_items" (
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        )
        `,
        [
          bookingRequestId,
          descriptor.serviceVariantId,
          null,
          descriptor.itemSlug,
          descriptor.itemName,
          descriptor.itemKind,
          descriptor.quantity,
          descriptor.sessionDurationMinutes,
          descriptor.durationMinutes,
          descriptor.unitPriceUsdSnapshot,
          descriptor.lineTotalUsdSnapshot,
          descriptor.clientPriceDisplay,
          null,
        ],
      ).catch(() => {
        throw buildPersistenceWriteFailure('No se pudo persistir una linea del paquete.')
      })
    }

    const persistedBookingRows = await executor.query<BookingRequestRow>(
      `
        SELECT
          "id",
          "publicCode",
          "bookingMode",
          "pricingSource",
          "estimatedTotal",
          "currency"
        FROM "booking_requests"
        WHERE "id" = $1
      `,
      [bookingRequestId],
    )

    const persistedBooking = persistedBookingRows.rows[0]
    if (
      !persistedBooking ||
      persistedBooking.publicCode !== input.publicCode ||
      persistedBooking.bookingMode !== BOOKING_REQUEST_BOOKING_MODE ||
      persistedBooking.pricingSource !== BOOKING_REQUEST_PRICING_SOURCE ||
      persistedBooking.currency !== BOOKING_REQUEST_CURRENCY ||
      !isSameMoneyValue(persistedBooking.estimatedTotal, quote.estimate.estimatedTotalUsd)
    ) {
      throw buildPersistenceWriteFailure('La solicitud persistida no coincide con el quote autoritativo.')
    }

    const persistedItemRows = await executor.query<BookingRequestItemRow>(
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
      [bookingRequestId],
    )

    if (persistedItemRows.rows.length !== descriptors.length) {
      throw buildPersistenceWriteFailure('El numero de lineas persistidas no coincide con el quote.')
    }

    const persistedItemsBySlug = new Map(
      persistedItemRows.rows.map((row) => [row.itemSlug ?? '', row]),
    )

    for (const descriptor of descriptors) {
      const persisted = persistedItemsBySlug.get(descriptor.itemSlug)
      if (!persisted) {
        throw buildPersistenceWriteFailure(`No se encontro la linea persistida ${descriptor.itemSlug}.`)
      }

      if (
        persisted.itemName !== descriptor.itemName ||
        persisted.itemKind !== descriptor.itemKind ||
        persisted.serviceVariantId !== descriptor.serviceVariantId ||
        persisted.quantity !== descriptor.quantity ||
        persisted.sessionDurationMinutes !== descriptor.sessionDurationMinutes ||
        persisted.durationMinutes !== descriptor.durationMinutes ||
        !isSameMoneyValue(persisted.unitPriceUsdSnapshot, Number(descriptor.unitPriceUsdSnapshot)) ||
        !isSameMoneyValue(persisted.lineTotalUsdSnapshot, Number(descriptor.lineTotalUsdSnapshot)) ||
        persisted.clientPriceDisplay !== descriptor.clientPriceDisplay
      ) {
        throw buildPersistenceWriteFailure(
          `La linea persistida ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
        )
      }
    }

    await executor.query('COMMIT')
    transactionState.started = false

    return {
      ok: true,
      stage: 'persisted',
      bookingRequestId,
      publicCode: input.publicCode,
      itemCount,
      estimatedTotalUsd: quote.estimate.estimatedTotalUsd,
      totalDurationMinutes: quote.estimate.totalDurationMinutes,
      eventDateIso: eventDateTime.toISOString(),
      eventEndDateIso: eventEndDateTime.toISOString(),
      serviceItemCount: kindCounts.serviceItemCount,
      addonItemCount: kindCounts.addonItemCount,
      includedItemCount: kindCounts.includedItemCount,
    }
  } catch (error) {
    if (transactionState.started) {
      await rollbackSilently(executor)
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'stage' in error &&
      (error as PersistCustomBundleSubmissionResult).stage === 'persistence'
    ) {
      return error as Extract<PersistCustomBundleSubmissionResult, { stage: 'persistence' }>
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'stage' in error &&
      (error as PersistCustomBundleSubmissionResult).stage === 'catalog_resolution'
    ) {
      return error as Extract<PersistCustomBundleSubmissionResult, { stage: 'catalog_resolution' }>
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'stage' in error &&
      (error as PersistCustomBundleSubmissionResult).stage === 'server_context'
    ) {
      return error as Extract<PersistCustomBundleSubmissionResult, { stage: 'server_context' }>
    }

    return buildPersistenceWriteFailure('No se pudo persistir la solicitud de Arma tu paquete.')
  }
}

export {
  CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
  getCustomBundlePersistenceTarget,
  getCustomBundleServerIncludedItemSlugs,
}
