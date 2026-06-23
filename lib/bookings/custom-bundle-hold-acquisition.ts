import { randomUUID } from 'node:crypto'

import {
  classifyCustomBundleIdempotencyReplay,
  prepareCustomBundleHoldContract,
  type CustomBundleHoldContextIssue,
  type CustomBundleHoldPreparationReady,
  type CustomBundleHoldPreparationResult,
  type CustomBundleHoldServerContext,
} from '@/lib/bookings/custom-bundle-hold-contract'
import {
  buildCustomBundleBookingRequestNotes,
  buildCustomBundlePersistableLineDescriptors,
  countCustomBundlePersistableItemsByKind,
  resolveCustomBundleServiceVariantsWithSql,
  validateCustomBundlePersistenceQuote,
  type CustomBundlePersistableLineDescriptor,
  type CustomBundleResolvedServiceVariantRow,
  type CustomBundleSqlSession,
} from '@/lib/bookings/custom-bundle-persistence'
import {
  resolveCustomBundleResourceAllocationsInTransaction,
  type CustomBundleResourceAllocation,
} from '@/lib/bookings/custom-bundle-resource-availability'
import type {
  CustomBundleEstimateIssue,
} from '@/lib/bookings/types'
import type {
  CustomBundleResourcePolicyIssue,
} from '@/lib/bookings/custom-bundle-resource-policy'
import type {
  CustomBundleScheduleIssue,
} from '@/lib/bookings/custom-bundle-schedule'
import type {
  CustomBundleSubmissionContractIssue,
} from '@/lib/bookings/custom-bundle-submission'

export interface CustomBundleHoldAcquisitionServerContext
  extends CustomBundleHoldServerContext {
  publicCode: string
}

export interface AcquireCustomBundleHoldInput {
  submission: unknown
  serverContext: CustomBundleHoldAcquisitionServerContext
}

interface HoldReplayRecordRow {
  id: string
  publicCode: string
  idempotencyKey: string | null
  requestFingerprint: string | null
  holdAcquiredAt: Date | string | null
  holdExpiresAt: Date | string | null
  eventDate: Date | string | null
  eventEndDate: Date | string | null
  estimatedTotal: string | number | null
  status: string | null
  bookingMode: string | null
  pricingSource: string | null
}

interface HoldReplayCountsRow {
  itemCount: number | string
  serviceItemCount: number | string
  addonItemCount: number | string
  includedItemCount: number | string
  physicalAllocationCount: number | string
  noPhysicalAllocationCount: number | string
}

interface AcquireCustomBundleHoldSuccessBase {
  bookingRequestId: string
  publicCode: string
  idempotencyKey: string
  requestFingerprint: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  estimatedTotalUsd: number
  totalDurationMinutes: number
  itemCount: number
  serviceItemCount: number
  addonItemCount: number
  includedItemCount: number
  physicalAllocationCount: number
  noPhysicalAllocationCount: number
}

export type AcquireCustomBundleHoldResult =
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
      stage: 'schedule'
      scheduleIssues: CustomBundleScheduleIssue[]
    }
  | {
      ok: false
      stage: 'resource_policy'
      resourcePolicyIssues: CustomBundleResourcePolicyIssue[]
    }
  | {
      ok: false
      stage: 'server_context'
      code:
        | 'INVALID_SQL_SESSION'
        | 'INVALID_PUBLIC_CODE'
        | 'INVALID_EXCLUDED_BOOKING_ID'
        | 'INVALID_NOW'
      message: string
    }
  | {
      ok: false
      stage: 'server_context'
      serverContextIssues: CustomBundleHoldContextIssue[]
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
      stage: 'resource_catalog'
      code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_INACTIVE' | 'RESOURCE_SLUG_DUPLICATED'
      resourceSlug: string
      message: string
    }
  | {
      ok: false
      stage: 'collision'
      code: 'RESOURCE_UNAVAILABLE'
      itemSlug: string
      startsAtIso: string
      endsAtIso: string
      attemptedResourceSlugs: string[]
      message: string
    }
  | {
      ok: false
      stage: 'idempotency'
      code:
        | 'IDEMPOTENCY_KEY_CONFLICT'
        | 'IDEMPOTENCY_KEY_EXPIRED'
        | 'IDEMPOTENCY_RECORD_INVALID'
      message: string
    }
  | {
      ok: false
      stage: 'persistence'
      code:
        | 'PUBLIC_CODE_CONFLICT'
        | 'DATABASE_WRITE_FAILED'
        | 'TRANSACTION_RETRY_EXHAUSTED'
      message: string
    }
  | ({
      ok: true
      stage: 'acquired'
      replayed: false
    } & AcquireCustomBundleHoldSuccessBase)
  | ({
      ok: true
      stage: 'replayed'
      replayed: true
    } & AcquireCustomBundleHoldSuccessBase)

const BOOKING_PUBLIC_CODE_REGEX = /^TUR-\d{4}-\d{3,}$/
const BOOKING_REQUEST_EVENT_TITLE = 'Solicitud - Arma tu paquete'
const BOOKING_REQUEST_STATUS = 'under_review'
const BOOKING_REQUEST_PRIORITY_LEVEL = 'normal'
const BOOKING_REQUEST_SOURCE = 'web'
const BOOKING_REQUEST_CURRENCY = 'USD'
const BOOKING_REQUEST_BOOKING_MODE = 'custom_bundle'
const BOOKING_REQUEST_PRICING_SOURCE = 'server_catalog_v1'
const TRANSACTION_RETRYABLE_CODES = new Set(['40001', '40P01'])
const MAX_TRANSACTION_ATTEMPTS = 3
type CustomBundleHoldPreparedQuote = CustomBundleHoldPreparationReady['quote']

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidPublicCode(value: string): boolean {
  return BOOKING_PUBLIC_CODE_REGEX.test(value)
}

function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase()
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return isValidDate(parsed) ? parsed : null
  }

  return null
}

function isPostgresErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === code
  )
}

function isUniqueViolation(error: unknown): boolean {
  return isPostgresErrorWithCode(error, '23505')
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    TRANSACTION_RETRYABLE_CODES.has((error as { code: string }).code)
  )
}

function isHoldReplayRecordRow(row: HoldReplayRecordRow): boolean {
  const holdAcquiredAt = toValidDate(row.holdAcquiredAt)
  const holdExpiresAt = toValidDate(row.holdExpiresAt)
  const eventDate = toValidDate(row.eventDate)
  const eventEndDate = toValidDate(row.eventEndDate)
  const estimatedTotal = Number(row.estimatedTotal)

  return (
    typeof row.id === 'string' &&
    typeof row.publicCode === 'string' &&
    typeof row.idempotencyKey === 'string' &&
    row.idempotencyKey.trim().length > 0 &&
    typeof row.requestFingerprint === 'string' &&
    row.requestFingerprint.trim().length > 0 &&
    holdAcquiredAt !== null &&
    holdExpiresAt !== null &&
    eventDate !== null &&
    eventEndDate !== null &&
    eventEndDate.getTime() > eventDate.getTime() &&
    Number.isFinite(estimatedTotal) &&
    row.status === BOOKING_REQUEST_STATUS &&
    row.bookingMode === BOOKING_REQUEST_BOOKING_MODE &&
    row.pricingSource === BOOKING_REQUEST_PRICING_SOURCE
  )
}

function parseHoldReplayRecord(row: HoldReplayRecordRow): {
  id: string
  publicCode: string
  idempotencyKey: string
  requestFingerprint: string
  holdAcquiredAt: Date
  holdExpiresAt: Date
  eventDate: Date
  eventEndDate: Date
  estimatedTotalUsd: number
  status: string
  bookingMode: string
  pricingSource: string
} | null {
  if (!isHoldReplayRecordRow(row)) {
    return null
  }

  const holdAcquiredAt = toValidDate(row.holdAcquiredAt)
  const holdExpiresAt = toValidDate(row.holdExpiresAt)
  const eventDate = toValidDate(row.eventDate)
  const eventEndDate = toValidDate(row.eventEndDate)
  const estimatedTotal = Number(row.estimatedTotal)

  if (!holdAcquiredAt || !holdExpiresAt || !eventDate || !eventEndDate) {
    return null
  }

  return {
    id: row.id,
    publicCode: row.publicCode,
    idempotencyKey: row.idempotencyKey!,
    requestFingerprint: row.requestFingerprint!,
    holdAcquiredAt,
    holdExpiresAt,
    eventDate,
    eventEndDate,
    estimatedTotalUsd: estimatedTotal,
    status: row.status!,
    bookingMode: row.bookingMode!,
    pricingSource: row.pricingSource!,
  }
}

function makeServerContextIssue(
  code:
    | 'INVALID_SQL_SESSION'
    | 'INVALID_PUBLIC_CODE'
    | 'INVALID_EXCLUDED_BOOKING_ID'
    | 'INVALID_NOW',
  message: string,
): Extract<AcquireCustomBundleHoldResult, { stage: 'server_context' }> {
  return {
    ok: false,
    stage: 'server_context',
    code,
    message,
  }
}

function makeHoldContextIssuesResult(
  issues: CustomBundleHoldContextIssue[],
): Extract<AcquireCustomBundleHoldResult, { stage: 'server_context' }> {
  return {
    ok: false,
    stage: 'server_context',
    serverContextIssues: issues,
  }
}

function makeIdempotencyIssue(
  code:
    | 'IDEMPOTENCY_KEY_CONFLICT'
    | 'IDEMPOTENCY_KEY_EXPIRED'
    | 'IDEMPOTENCY_RECORD_INVALID',
  message: string,
): Extract<AcquireCustomBundleHoldResult, { stage: 'idempotency' }> {
  return {
    ok: false,
    stage: 'idempotency',
    code,
    message,
  }
}

function makePersistenceIssue(
  code: 'PUBLIC_CODE_CONFLICT' | 'DATABASE_WRITE_FAILED' | 'TRANSACTION_RETRY_EXHAUSTED',
  message: string,
): Extract<AcquireCustomBundleHoldResult, { stage: 'persistence' }> {
  return {
    ok: false,
    stage: 'persistence',
    code,
    message,
  }
}

function countSuccessAllocations(allocations: CustomBundleResourceAllocation[]): {
  physicalAllocationCount: number
  noPhysicalAllocationCount: number
} {
  return allocations.reduce(
    (accumulator, allocation) => {
      if (allocation.mode === 'physical') {
        accumulator.physicalAllocationCount += 1
      } else {
        accumulator.noPhysicalAllocationCount += 1
      }

      return accumulator
    },
    {
      physicalAllocationCount: 0,
      noPhysicalAllocationCount: 0,
    },
  )
}

function countPersistedAllocations(rows: HoldReplayCountsRow): {
  itemCount: number
  serviceItemCount: number
  addonItemCount: number
  includedItemCount: number
  physicalAllocationCount: number
  noPhysicalAllocationCount: number
} {
  return {
    itemCount: Number(rows.itemCount),
    serviceItemCount: Number(rows.serviceItemCount),
    addonItemCount: Number(rows.addonItemCount),
    includedItemCount: Number(rows.includedItemCount),
    physicalAllocationCount: Number(rows.physicalAllocationCount),
    noPhysicalAllocationCount: Number(rows.noPhysicalAllocationCount),
  }
}

async function rollbackSilently(session: CustomBundleSqlSession): Promise<void> {
  await session.query('ROLLBACK').catch(() => {})
}

async function readHoldReplayRecord(
  session: CustomBundleSqlSession,
  idempotencyKey: string,
  forUpdate: boolean,
): Promise<HoldReplayRecordRow | null> {
  const result = await session.query<HoldReplayRecordRow>(
    `
      SELECT
        id,
        "publicCode",
        "idempotencyKey",
        "requestFingerprint",
        "holdAcquiredAt",
        "holdExpiresAt",
        "eventDate",
        "eventEndDate",
        "estimatedTotal",
        status,
        "bookingMode",
        "pricingSource"
      FROM "booking_requests"
      WHERE "idempotencyKey" = $1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [idempotencyKey],
  )

  return result.rows[0] ?? null
}

async function readPublicCodeReplayRecord(
  session: CustomBundleSqlSession,
  publicCode: string,
): Promise<HoldReplayRecordRow | null> {
  const result = await session.query<HoldReplayRecordRow>(
    `
      SELECT
        id,
        "publicCode",
        "idempotencyKey",
        "requestFingerprint",
        "holdAcquiredAt",
        "holdExpiresAt",
        "eventDate",
        "eventEndDate",
        "estimatedTotal",
        status,
        "bookingMode",
        "pricingSource"
      FROM "booking_requests"
      WHERE "publicCode" = $1
    `,
    [publicCode],
  )

  return result.rows[0] ?? null
}

async function readPersistedCounts(
  session: CustomBundleSqlSession,
  bookingRequestId: string,
): Promise<HoldReplayCountsRow> {
  const result = await session.query<HoldReplayCountsRow>(
    `
      SELECT
        COUNT(*)::int AS "itemCount",
        COUNT(*) FILTER (WHERE "itemKind" = 'service')::int AS "serviceItemCount",
        COUNT(*) FILTER (WHERE "itemKind" = 'addon')::int AS "addonItemCount",
        COUNT(*) FILTER (WHERE "itemKind" = 'included')::int AS "includedItemCount",
        COUNT(*) FILTER (WHERE "itemKind" = 'service' AND "resourceId" IS NOT NULL)::int AS "physicalAllocationCount",
        COUNT(*) FILTER (WHERE "itemKind" = 'service' AND "resourceId" IS NULL)::int AS "noPhysicalAllocationCount"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
    `,
    [bookingRequestId],
  )

  const row = result.rows[0]
  if (!row) {
    return {
      itemCount: 0,
      serviceItemCount: 0,
      addonItemCount: 0,
      includedItemCount: 0,
      physicalAllocationCount: 0,
      noPhysicalAllocationCount: 0,
    }
  }

  return row
}

function buildAcquiredSuccessResult(input: {
  bookingRequestId: string
  publicCode: string
  idempotencyKey: string
  requestFingerprint: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  quote: CustomBundleHoldPreparedQuote
  allocations: CustomBundleResourceAllocation[]
  descriptors: CustomBundlePersistableLineDescriptor[]
}): Extract<AcquireCustomBundleHoldResult, { ok: true; stage: 'acquired' }> {
  const itemCounts = countCustomBundlePersistableItemsByKind(input.descriptors)
  const allocationCounts = countSuccessAllocations(input.allocations)

  return {
    ok: true,
    stage: 'acquired',
    replayed: false,
    bookingRequestId: input.bookingRequestId,
    publicCode: input.publicCode,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
    holdAcquiredAtIso: input.holdAcquiredAtIso,
    holdExpiresAtIso: input.holdExpiresAtIso,
    estimatedTotalUsd: input.quote.estimate.estimatedTotalUsd,
    totalDurationMinutes: input.quote.estimate.totalDurationMinutes,
    itemCount: input.descriptors.length,
    serviceItemCount: itemCounts.serviceItemCount,
    addonItemCount: itemCounts.addonItemCount,
    includedItemCount: itemCounts.includedItemCount,
    physicalAllocationCount: allocationCounts.physicalAllocationCount,
    noPhysicalAllocationCount: allocationCounts.noPhysicalAllocationCount,
  }
}

function buildReplayedSuccessResult(input: {
  bookingRequestId: string
  publicCode: string
  idempotencyKey: string
  requestFingerprint: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  quote: CustomBundleHoldPreparedQuote
  persistedCounts: HoldReplayCountsRow
}): Extract<AcquireCustomBundleHoldResult, { ok: true; stage: 'replayed' }> {
  const counts = countPersistedAllocations(input.persistedCounts)

  return {
    ok: true,
    stage: 'replayed',
    replayed: true,
    bookingRequestId: input.bookingRequestId,
    publicCode: input.publicCode,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
    holdAcquiredAtIso: input.holdAcquiredAtIso,
    holdExpiresAtIso: input.holdExpiresAtIso,
    estimatedTotalUsd: input.quote.estimate.estimatedTotalUsd,
    totalDurationMinutes: input.quote.estimate.totalDurationMinutes,
    itemCount: counts.itemCount,
    serviceItemCount: counts.serviceItemCount,
    addonItemCount: counts.addonItemCount,
    includedItemCount: counts.includedItemCount,
    physicalAllocationCount: counts.physicalAllocationCount,
    noPhysicalAllocationCount: counts.noPhysicalAllocationCount,
  }
}

function getPreparedHoldValue(
  prepared: CustomBundleHoldPreparationResult,
): Extract<CustomBundleHoldPreparationResult, { ok: true; stage: 'ready' }>['value'] | null {
  if (!prepared.ok || prepared.stage !== 'ready') {
    return null
  }

  return prepared.value
}

function buildHoldContractResult(
  prepared: CustomBundleHoldPreparationResult,
): AcquireCustomBundleHoldResult | null {
  if (prepared.ok) {
    return null
  }

  switch (prepared.stage) {
    case 'contract':
      return {
        ok: false,
        stage: 'contract',
        contractIssues: prepared.contractIssues,
      }
    case 'business_rules':
      return {
        ok: false,
        stage: 'business_rules',
        businessIssues: prepared.businessIssues,
      }
    case 'schedule':
      return {
        ok: false,
        stage: 'schedule',
        scheduleIssues: prepared.scheduleIssues,
      }
    case 'resource_policy':
      return {
        ok: false,
        stage: 'resource_policy',
        resourcePolicyIssues: prepared.resourcePolicyIssues,
      }
    case 'server_context':
      return makeHoldContextIssuesResult(prepared.serverContextIssues)
  }
}

export async function acquireCustomBundleHoldWithSql(
  session: CustomBundleSqlSession,
  input: AcquireCustomBundleHoldInput,
): Promise<AcquireCustomBundleHoldResult> {
  if (session.transactionScope !== 'single_connection') {
    return makeServerContextIssue(
      'INVALID_SQL_SESSION',
      'La adquisicion del hold requiere una conexion SQL transaccional dedicada.',
    )
  }

  const normalizedPublicCode = normalizePublicCode(input.serverContext.publicCode)
  if (!isValidPublicCode(normalizedPublicCode)) {
    return makeServerContextIssue(
      'INVALID_PUBLIC_CODE',
      'El publicCode debe cumplir el formato TUR-YYYY-NNN.',
    )
  }

  const prepared = prepareCustomBundleHoldContract({
    submission: input.submission,
    serverContext: {
      idempotencyKey: input.serverContext.idempotencyKey,
      now: input.serverContext.now,
      holdDurationMinutes: input.serverContext.holdDurationMinutes,
    },
  })

  const preparedError = buildHoldContractResult(prepared)
  if (preparedError) {
    return preparedError
  }

  const preparedValue = getPreparedHoldValue(prepared)
  if (!preparedValue) {
    return makeHoldContextIssuesResult([
      {
        code: 'INVALID_NOW',
        message: 'No se pudo preparar la solicitud autoritativa.',
      },
    ])
  }

  const persistenceQuoteIssues = validateCustomBundlePersistenceQuote(preparedValue.quote)
  if (persistenceQuoteIssues.length > 0) {
    return makePersistenceIssue(
      'DATABASE_WRITE_FAILED',
      'La cotizacion autoritativa no cumple las invariantes de persistencia.',
    )
  }

  const preparedContext = {
    idempotencyKey: preparedValue.idempotencyKey,
    requestFingerprint: preparedValue.requestFingerprint,
    holdAcquiredAtIso: preparedValue.holdAcquiredAtIso,
    holdExpiresAtIso: preparedValue.holdExpiresAtIso,
    holdAcquiredAt: new Date(preparedValue.holdAcquiredAtIso),
    holdExpiresAt: new Date(preparedValue.holdExpiresAtIso),
  }

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await session.query('BEGIN ISOLATION LEVEL SERIALIZABLE')

      const existingReplayRow = await readHoldReplayRecord(session, preparedContext.idempotencyKey, true)
      if (existingReplayRow) {
        const parsedExisting = parseHoldReplayRecord(existingReplayRow)
        if (!parsedExisting) {
          await rollbackSilently(session)
          return makeIdempotencyIssue(
            'IDEMPOTENCY_RECORD_INVALID',
            'El registro de idempotencia existente no es valido.',
          )
        }

        const replayClassification = classifyCustomBundleIdempotencyReplay({
          requestedIdempotencyKey: preparedContext.idempotencyKey,
          requestedFingerprint: preparedContext.requestFingerprint,
          existing: {
            idempotencyKey: parsedExisting.idempotencyKey,
            requestFingerprint: parsedExisting.requestFingerprint,
            holdExpiresAt: parsedExisting.holdExpiresAt,
          },
          now: input.serverContext.now,
        })

        if (replayClassification === 'active_replay') {
          const persistedCounts = await readPersistedCounts(session, parsedExisting.id)
          await rollbackSilently(session)
          return buildReplayedSuccessResult({
            bookingRequestId: parsedExisting.id,
            publicCode: parsedExisting.publicCode,
            idempotencyKey: parsedExisting.idempotencyKey,
            requestFingerprint: parsedExisting.requestFingerprint,
            holdAcquiredAtIso: parsedExisting.holdAcquiredAt.toISOString(),
            holdExpiresAtIso: parsedExisting.holdExpiresAt.toISOString(),
            quote: preparedValue.quote,
            persistedCounts,
          })
        }

        await rollbackSilently(session)
        if (replayClassification === 'expired_replay') {
          return makeIdempotencyIssue(
            'IDEMPOTENCY_KEY_EXPIRED',
            'La clave de idempotencia ya expiro.',
          )
        }

        return makeIdempotencyIssue(
          'IDEMPOTENCY_KEY_CONFLICT',
          'La clave de idempotencia se reutilizo para una solicitud distinta.',
        )
      }

      const serviceVariantResolution = await resolveCustomBundleServiceVariantsWithSql(
        session,
        preparedValue.quote,
      )
      if (!serviceVariantResolution.ok) {
        await rollbackSilently(session)
        if (serviceVariantResolution.stage === 'catalog_resolution') {
          return serviceVariantResolution
        }
        return makePersistenceIssue(
          'DATABASE_WRITE_FAILED',
          'No se pudieron resolver las variantes persistibles del paquete.',
        )
      }

      const resourceAllocationResult = await resolveCustomBundleResourceAllocationsInTransaction(
        session,
        {
          quote: preparedValue.quote,
          schedule: preparedValue.schedule,
          requirements: preparedValue.requirements,
          conflictMode: 'established_bookings_and_active_holds',
          now: input.serverContext.now,
        },
      )

      if (!resourceAllocationResult.ok) {
        await rollbackSilently(session)

        switch (resourceAllocationResult.stage) {
          case 'resource_catalog':
            return resourceAllocationResult
          case 'collision':
            return resourceAllocationResult
          case 'database':
            return makePersistenceIssue(
              'DATABASE_WRITE_FAILED',
              resourceAllocationResult.message,
            )
          case 'server_context':
            return makeServerContextIssue(resourceAllocationResult.code, resourceAllocationResult.message)
        }
      }

      const descriptorsResult = buildCustomBundlePersistableLineDescriptors(
        preparedValue.quote,
        serviceVariantResolution.rows as Map<string, CustomBundleResolvedServiceVariantRow>,
      )

      if (!Array.isArray(descriptorsResult)) {
        await rollbackSilently(session)
        return descriptorsResult
      }

      const descriptors = descriptorsResult
      const bookingRequestId = randomUUID().replace(/-/g, '')
      const holdWindowAcquiredAt = preparedContext.holdAcquiredAt
      const holdWindowExpiresAt = preparedContext.holdExpiresAt

      const bookingRequestInsertResult = await session.query<{ id: string }>(
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
          )
          RETURNING id
        `,
        [
          bookingRequestId,
          normalizedPublicCode,
          BOOKING_REQUEST_STATUS,
          BOOKING_REQUEST_PRIORITY_LEVEL,
          BOOKING_REQUEST_SOURCE,
          preparedValue.quote.submission.requester.name,
          preparedValue.quote.submission.requester.email,
          preparedValue.quote.submission.requester.phone,
          BOOKING_REQUEST_EVENT_TITLE,
          new Date(preparedValue.schedule.startsAtIso),
          new Date(preparedValue.schedule.endsAtIso),
          buildCustomBundleBookingRequestNotes(preparedValue.quote.submission.extrasNotes),
          '[ops_status:pending_payment]',
          preparedValue.quote.estimate.estimatedTotalUsd.toFixed(2),
          BOOKING_REQUEST_CURRENCY,
          input.serverContext.now,
          BOOKING_REQUEST_BOOKING_MODE,
          BOOKING_REQUEST_PRICING_SOURCE,
          preparedContext.idempotencyKey,
          preparedContext.requestFingerprint,
          holdWindowAcquiredAt,
          holdWindowExpiresAt,
          input.serverContext.now,
          input.serverContext.now,
        ],
      ).catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw error
        }

        throw new Error(
          error instanceof Error ? error.message : 'No se pudo crear la solicitud de hold.',
        )
      })

      const persistedBookingRequestId = bookingRequestInsertResult.rows[0]?.id ?? bookingRequestId

      for (const descriptor of descriptors) {
        const allocation = resourceAllocationResult.plan.allocations.find(
          (candidate) => candidate.itemSlug === descriptor.itemSlug,
        )
        if (descriptor.itemKind === 'service' && !allocation) {
          throw new Error(`No se encontro la asignacion de recurso para ${descriptor.itemSlug}.`)
        }

        const resourceId = descriptor.itemKind === 'service' && allocation?.mode === 'physical'
          ? allocation.assignedResource.resourceId
          : null

        await session.query(
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
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL, $14, $15
            )
          `,
          [
            randomUUID().replace(/-/g, ''),
            persistedBookingRequestId,
            descriptor.serviceVariantId,
            resourceId,
            descriptor.itemSlug,
            descriptor.itemName,
            descriptor.itemKind,
            descriptor.quantity,
            descriptor.sessionDurationMinutes,
            descriptor.durationMinutes,
            descriptor.unitPriceUsdSnapshot,
            descriptor.lineTotalUsdSnapshot,
            descriptor.clientPriceDisplay,
            input.serverContext.now,
            input.serverContext.now,
          ],
        )
      }

      const persistedBookingRows = await session.query<HoldReplayRecordRow>(
        `
          SELECT
            id,
            "publicCode",
            "idempotencyKey",
            "requestFingerprint",
            "holdAcquiredAt",
            "holdExpiresAt",
            "eventDate",
            "eventEndDate",
            "estimatedTotal",
            status,
            "bookingMode",
            "pricingSource"
          FROM "booking_requests"
          WHERE id = $1
        `,
        [persistedBookingRequestId],
      )

      const persistedBooking = parseHoldReplayRecord(persistedBookingRows.rows[0] ?? null)
      if (
        !persistedBooking ||
        persistedBooking.publicCode !== normalizedPublicCode ||
        persistedBooking.idempotencyKey !== preparedContext.idempotencyKey ||
        persistedBooking.requestFingerprint !== preparedContext.requestFingerprint ||
        persistedBooking.holdAcquiredAt.getTime() !== holdWindowAcquiredAt.getTime() ||
        persistedBooking.holdExpiresAt.getTime() !== holdWindowExpiresAt.getTime() ||
        persistedBooking.bookingMode !== BOOKING_REQUEST_BOOKING_MODE ||
        persistedBooking.pricingSource !== BOOKING_REQUEST_PRICING_SOURCE ||
        persistedBooking.status !== BOOKING_REQUEST_STATUS ||
        persistedBooking.eventDate.getTime() !== new Date(preparedValue.schedule.startsAtIso).getTime() ||
        persistedBooking.eventEndDate.getTime() !== new Date(preparedValue.schedule.endsAtIso).getTime() ||
        persistedBooking.estimatedTotalUsd !== preparedValue.quote.estimate.estimatedTotalUsd
      ) {
        throw new Error('La fila de hold persistida no coincide con el quote autoritativo.')
      }

      const persistedItemCounts = await readPersistedCounts(session, persistedBookingRequestId)
      const expectedCounts = countCustomBundlePersistableItemsByKind(descriptors)
      if (
        persistedItemCounts.itemCount !== descriptors.length ||
        persistedItemCounts.serviceItemCount !== expectedCounts.serviceItemCount ||
        persistedItemCounts.addonItemCount !== expectedCounts.addonItemCount ||
        persistedItemCounts.includedItemCount !== expectedCounts.includedItemCount
      ) {
        throw new Error('Las lineas persistidas no coinciden con el quote autoritativo.')
      }

      const allocationsCounts = countSuccessAllocations(resourceAllocationResult.plan.allocations)
      const bookingSuccess = buildAcquiredSuccessResult({
        bookingRequestId: persistedBookingRequestId,
        publicCode: normalizedPublicCode,
        idempotencyKey: preparedContext.idempotencyKey,
        requestFingerprint: preparedContext.requestFingerprint,
        holdAcquiredAtIso: preparedContext.holdAcquiredAtIso,
        holdExpiresAtIso: preparedContext.holdExpiresAtIso,
        quote: preparedValue.quote,
        allocations: resourceAllocationResult.plan.allocations,
        descriptors,
      })

      if (
        bookingSuccess.physicalAllocationCount !== allocationsCounts.physicalAllocationCount ||
        bookingSuccess.noPhysicalAllocationCount !== allocationsCounts.noPhysicalAllocationCount
      ) {
        throw new Error('Las asignaciones persistidas no coinciden con el plan autoritativo.')
      }

      await session.query('COMMIT')

      return bookingSuccess
    } catch (error) {
      await rollbackSilently(session)

      if (isRetryableTransactionError(error)) {
        if (attempt < MAX_TRANSACTION_ATTEMPTS) {
          continue
        }

        return makePersistenceIssue(
          'TRANSACTION_RETRY_EXHAUSTED',
          'No se pudo completar la adquisicion del hold tras varios intentos.',
        )
      }

      if (isUniqueViolation(error)) {
        const replayRecord = await readHoldReplayRecord(session, preparedContext.idempotencyKey, false)
        if (replayRecord) {
          const parsedReplayRecord = parseHoldReplayRecord(replayRecord)
          if (!parsedReplayRecord) {
            return makeIdempotencyIssue(
              'IDEMPOTENCY_RECORD_INVALID',
              'El registro de idempotencia existente no es valido.',
            )
          }

          const replayClassification = classifyCustomBundleIdempotencyReplay({
            requestedIdempotencyKey: preparedContext.idempotencyKey,
            requestedFingerprint: preparedContext.requestFingerprint,
            existing: {
              idempotencyKey: parsedReplayRecord.idempotencyKey,
              requestFingerprint: parsedReplayRecord.requestFingerprint,
              holdExpiresAt: parsedReplayRecord.holdExpiresAt,
            },
            now: input.serverContext.now,
          })

          if (replayClassification === 'active_replay') {
            const persistedCounts = await readPersistedCounts(session, parsedReplayRecord.id)
            return buildReplayedSuccessResult({
              bookingRequestId: parsedReplayRecord.id,
              publicCode: parsedReplayRecord.publicCode,
              idempotencyKey: parsedReplayRecord.idempotencyKey,
              requestFingerprint: parsedReplayRecord.requestFingerprint,
              holdAcquiredAtIso: parsedReplayRecord.holdAcquiredAt.toISOString(),
              holdExpiresAtIso: parsedReplayRecord.holdExpiresAt.toISOString(),
              quote: preparedValue.quote,
              persistedCounts,
            })
          }

          if (replayClassification === 'expired_replay') {
            return makeIdempotencyIssue(
              'IDEMPOTENCY_KEY_EXPIRED',
              'La clave de idempotencia ya expiro.',
            )
          }

          return makeIdempotencyIssue(
            'IDEMPOTENCY_KEY_CONFLICT',
            'La clave de idempotencia se reutilizo para una solicitud distinta.',
          )
        }

        const publicCodeRecord = await readPublicCodeReplayRecord(session, normalizedPublicCode)
        if (publicCodeRecord) {
          return makePersistenceIssue(
            'PUBLIC_CODE_CONFLICT',
            'Ya existe una solicitud con ese publicCode.',
          )
        }

        return makePersistenceIssue(
          'DATABASE_WRITE_FAILED',
          'No se pudo persistir la solicitud de hold.',
        )
      }

      return makePersistenceIssue(
        'DATABASE_WRITE_FAILED',
        error instanceof Error ? 'No se pudo persistir la solicitud de hold.' : 'No se pudo persistir la solicitud de hold.',
      )
    }
  }

  return makePersistenceIssue(
    'TRANSACTION_RETRY_EXHAUSTED',
    'No se pudo completar la adquisicion del hold tras varios intentos.',
  )
}
