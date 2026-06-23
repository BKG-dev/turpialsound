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
  CustomBundleResourceRequirement,
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
}

export interface CustomBundlePersistedReplayItem {
  itemSlug: string | null
  itemName: string | null
  itemKind: string | null
  serviceVariantId: string | null
  resourceId: string | null
  quantity: number | string | null
  sessionDurationMinutes: number | string | null
  durationMinutes: number | string | null
  unitPriceUsdSnapshot: number | string | null
  lineTotalUsdSnapshot: number | string | null
  clientPriceDisplay: string | null
}

export interface CustomBundleReplayIntegrityIssue {
  code:
    | 'REPLAY_ITEM_COUNT_MISMATCH'
    | 'REPLAY_ITEM_SLUG_DUPLICATED'
    | 'REPLAY_ITEM_SLUG_MISSING'
    | 'REPLAY_ITEM_SLUG_ADDITIONAL'
    | 'REPLAY_ITEM_NAME_MISMATCH'
    | 'REPLAY_ITEM_KIND_MISMATCH'
    | 'REPLAY_ITEM_QUANTITY_MISMATCH'
    | 'REPLAY_ITEM_SESSION_DURATION_MISMATCH'
    | 'REPLAY_ITEM_DURATION_MISMATCH'
    | 'REPLAY_ITEM_UNIT_PRICE_MISMATCH'
    | 'REPLAY_ITEM_LINE_TOTAL_MISMATCH'
    | 'REPLAY_ITEM_CLIENT_PRICE_DISPLAY_MISMATCH'
    | 'REPLAY_ITEM_SERVICE_VARIANT_MISMATCH'
    | 'REPLAY_ITEM_RESOURCE_MISSING'
    | 'REPLAY_ITEM_RESOURCE_PRESENT'
    | 'REPLAY_ITEM_RESOURCE_FORBIDDEN'
    | 'REPLAY_ITEM_RESOURCE_INCONCLUSIVE'
  message: string
  itemSlug?: string
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

export function countCustomBundleRequirementsByMode(
  requirements: readonly CustomBundleResourceRequirement[],
): {
  physicalAllocationCount: number
  noPhysicalAllocationCount: number
} {
  return requirements.reduce(
    (accumulator, requirement) => {
      if (requirement.mode === 'physical') {
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

function countSuccessAllocations(
  allocations: readonly { mode: 'physical' | 'no_physical_resource' }[],
): {
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
        COUNT(*) FILTER (WHERE "itemKind" = 'included')::int AS "includedItemCount"
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
    }
  }

  return row
}

async function readPersistedReplayItems(
  session: CustomBundleSqlSession,
  bookingRequestId: string,
): Promise<CustomBundlePersistedReplayItem[]> {
  const result = await session.query<CustomBundlePersistedReplayItem>(
    `
      SELECT
        "itemSlug",
        "itemName",
        "itemKind",
        "serviceVariantId",
        "resourceId",
        "quantity",
        "sessionDurationMinutes",
        "durationMinutes",
        "unitPriceUsdSnapshot",
        "lineTotalUsdSnapshot",
        "clientPriceDisplay"
      FROM "booking_request_items"
      WHERE "bookingRequestId" = $1
      ORDER BY "createdAt", id
    `,
    [bookingRequestId],
  )

  return result.rows
}

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function isSameMoneyValue(value: string | number | null | undefined, expected: number): boolean {
  const numericValue = toFiniteNumber(value)
  return numericValue !== null && numericValue === expected
}

function isSameNullableNumber(
  value: string | number | null | undefined,
  expected: number | null,
): boolean {
  if (expected === null) {
    return value === null || value === undefined || value === ''
  }

  const numericValue = toFiniteNumber(value)
  return numericValue !== null && numericValue === expected
}

function buildReplayIntegrityIssue(
  code: CustomBundleReplayIntegrityIssue['code'],
  message: string,
  itemSlug?: string,
): CustomBundleReplayIntegrityIssue {
  return itemSlug ? { code, message, itemSlug } : { code, message }
}

export function validateCustomBundlePersistedReplayItems(input: {
  descriptors: readonly CustomBundlePersistableLineDescriptor[]
  requirements: readonly CustomBundleResourceRequirement[]
  persistedItems: readonly CustomBundlePersistedReplayItem[]
}): CustomBundleReplayIntegrityIssue[] {
  const issues: CustomBundleReplayIntegrityIssue[] = []
  const descriptorBySlug = new Map<string, CustomBundlePersistableLineDescriptor>()
  const requirementBySlug = new Map<string, CustomBundleResourceRequirement>()
  const persistedBySlug = new Map<string, CustomBundlePersistedReplayItem>()

  for (const requirement of input.requirements) {
    requirementBySlug.set(requirement.itemSlug, requirement)
  }

  for (const descriptor of input.descriptors) {
    if (descriptorBySlug.has(descriptor.itemSlug)) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SLUG_DUPLICATED',
          `La linea ${descriptor.itemSlug} aparece mas de una vez en los descriptores autoritativos.`,
          descriptor.itemSlug,
        ),
      )
      continue
    }

    descriptorBySlug.set(descriptor.itemSlug, descriptor)
  }

  if (input.persistedItems.length !== input.descriptors.length) {
    issues.push(
      buildReplayIntegrityIssue(
        'REPLAY_ITEM_COUNT_MISMATCH',
        'El numero de items persistidos no coincide con la semantica autoritativa del replay.',
      ),
    )
  }

  for (const persistedItem of input.persistedItems) {
    const itemSlug = persistedItem.itemSlug?.trim() ?? ''
    if (itemSlug.length === 0) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SLUG_MISSING',
          'Un item persistido del replay no tiene itemSlug valido.',
        ),
      )
      continue
    }

    if (persistedBySlug.has(itemSlug)) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SLUG_DUPLICATED',
          `La linea ${itemSlug} aparece mas de una vez en los items persistidos.`,
          itemSlug,
        ),
      )
      continue
    }

    persistedBySlug.set(itemSlug, persistedItem)

    if (!descriptorBySlug.has(itemSlug)) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SLUG_ADDITIONAL',
          `La linea ${itemSlug} no forma parte del quote autoritativo del replay.`,
          itemSlug,
        ),
      )
    }
  }

  for (const descriptor of input.descriptors) {
    const persistedItem = persistedBySlug.get(descriptor.itemSlug)
    if (!persistedItem) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SLUG_MISSING',
          `Falta la linea persistida ${descriptor.itemSlug}.`,
          descriptor.itemSlug,
        ),
      )
      continue
    }

    const requirement = requirementBySlug.get(descriptor.itemSlug)
    const persistedQuantity = toFiniteNumber(persistedItem.quantity)
    const persistedSessionDurationMinutes = toFiniteNumber(persistedItem.sessionDurationMinutes)
    const persistedDurationMinutes = toFiniteNumber(persistedItem.durationMinutes)
    const persistedItemKind = persistedItem.itemKind?.trim() ?? ''
    const persistedServiceVariantId = persistedItem.serviceVariantId?.trim() ?? null
    const persistedResourceId = persistedItem.resourceId?.trim() ?? null
    const persistedClientPriceDisplay = persistedItem.clientPriceDisplay?.trim() ?? ''

    if (persistedItem.itemName !== descriptor.itemName) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_NAME_MISMATCH',
          `El nombre de la linea ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (persistedItemKind !== descriptor.itemKind) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_KIND_MISMATCH',
          `El tipo de la linea ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (persistedQuantity === null || persistedQuantity !== descriptor.quantity) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_QUANTITY_MISMATCH',
          `La cantidad de la linea ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (!isSameNullableNumber(persistedSessionDurationMinutes, descriptor.sessionDurationMinutes)) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SESSION_DURATION_MISMATCH',
          `La sessionDurationMinutes de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (persistedDurationMinutes === null || persistedDurationMinutes !== descriptor.durationMinutes) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_DURATION_MISMATCH',
          `La durationMinutes de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (!isSameMoneyValue(persistedItem.unitPriceUsdSnapshot, Number(descriptor.unitPriceUsdSnapshot))) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_UNIT_PRICE_MISMATCH',
          `El precio unitario de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (!isSameMoneyValue(persistedItem.lineTotalUsdSnapshot, Number(descriptor.lineTotalUsdSnapshot))) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_LINE_TOTAL_MISMATCH',
          `El total de linea de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (persistedClientPriceDisplay !== descriptor.clientPriceDisplay) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_CLIENT_PRICE_DISPLAY_MISMATCH',
          `La presentacion de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (descriptor.itemKind === 'service') {
      if (persistedServiceVariantId !== descriptor.serviceVariantId) {
        issues.push(
          buildReplayIntegrityIssue(
            'REPLAY_ITEM_SERVICE_VARIANT_MISMATCH',
            `La serviceVariantId de ${descriptor.itemSlug} no coincide con el quote autoritativo.`,
            descriptor.itemSlug,
          ),
        )
      }
    } else if (persistedServiceVariantId !== null) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_SERVICE_VARIANT_MISMATCH',
          `La linea ${descriptor.itemSlug} no debe conservar serviceVariantId.`,
          descriptor.itemSlug,
        ),
      )
    }

    if (requirement?.mode === 'physical') {
      if (persistedResourceId === null) {
        issues.push(
          buildReplayIntegrityIssue(
            'REPLAY_ITEM_RESOURCE_MISSING',
            `La linea fisica ${descriptor.itemSlug} debe conservar resourceId.`,
            descriptor.itemSlug,
          ),
        )
      }
    } else if (persistedResourceId !== null) {
      issues.push(
        buildReplayIntegrityIssue(
          'REPLAY_ITEM_RESOURCE_FORBIDDEN',
          `La linea ${descriptor.itemSlug} no debe conservar resourceId.`,
          descriptor.itemSlug,
        ),
      )
    }
  }

  return issues
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
  descriptors: readonly CustomBundlePersistableLineDescriptor[]
  requirements: readonly CustomBundleResourceRequirement[]
}): Extract<AcquireCustomBundleHoldResult, { ok: true; stage: 'replayed' }> {
  const itemCounts = countCustomBundlePersistableItemsByKind(input.descriptors)
  const allocationCounts = countCustomBundleRequirementsByMode(input.requirements)

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
    itemCount: input.descriptors.length,
    serviceItemCount: itemCounts.serviceItemCount,
    addonItemCount: itemCounts.addonItemCount,
    includedItemCount: itemCounts.includedItemCount,
    physicalAllocationCount: allocationCounts.physicalAllocationCount,
    noPhysicalAllocationCount: allocationCounts.noPhysicalAllocationCount,
  }
}

async function buildValidatedReplaySuccessResult(input: {
  session: CustomBundleSqlSession
  parsedReplayRecord: {
    id: string
    publicCode: string
    idempotencyKey: string
    requestFingerprint: string
    holdAcquiredAt: Date
    holdExpiresAt: Date
  }
  preparedValue: CustomBundleHoldPreparationReady
}): Promise<AcquireCustomBundleHoldResult> {
  const serviceVariantResolution = await resolveCustomBundleServiceVariantsWithSql(
    input.session,
    input.preparedValue.quote,
  )

  if (!serviceVariantResolution.ok) {
    await rollbackSilently(input.session)
    if (serviceVariantResolution.stage === 'catalog_resolution') {
      return serviceVariantResolution
    }

    return makePersistenceIssue(
      'DATABASE_WRITE_FAILED',
      'No se pudieron resolver las variantes persistibles del replay.',
    )
  }

  const descriptorsResult = buildCustomBundlePersistableLineDescriptors(
    input.preparedValue.quote,
    serviceVariantResolution.rows as Map<string, CustomBundleResolvedServiceVariantRow>,
  )

  if (!Array.isArray(descriptorsResult)) {
    await rollbackSilently(input.session)
    return descriptorsResult
  }

  const persistedItems = await readPersistedReplayItems(input.session, input.parsedReplayRecord.id)
  const replayIssues = validateCustomBundlePersistedReplayItems({
    descriptors: descriptorsResult,
    requirements: input.preparedValue.requirements,
    persistedItems,
  })

  if (replayIssues.length > 0) {
    await rollbackSilently(input.session)
    return makeIdempotencyIssue(
      'IDEMPOTENCY_RECORD_INVALID',
      'El registro de idempotencia existente no es valido.',
    )
  }

  await rollbackSilently(input.session)

  return buildReplayedSuccessResult({
    bookingRequestId: input.parsedReplayRecord.id,
    publicCode: input.parsedReplayRecord.publicCode,
    idempotencyKey: input.parsedReplayRecord.idempotencyKey,
    requestFingerprint: input.parsedReplayRecord.requestFingerprint,
    holdAcquiredAtIso: input.parsedReplayRecord.holdAcquiredAt.toISOString(),
    holdExpiresAtIso: input.parsedReplayRecord.holdExpiresAt.toISOString(),
    quote: input.preparedValue.quote,
    descriptors: descriptorsResult,
    requirements: input.preparedValue.requirements,
  })
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
    let idempotencyLockAcquired = false
    let fingerprintLockAcquired = false
    try {
      await session.query('SELECT pg_advisory_lock(hashtext($1))', [
        preparedContext.idempotencyKey,
      ])
      idempotencyLockAcquired = true

      await session.query('SELECT pg_advisory_lock(hashtext($1))', [
        preparedContext.requestFingerprint,
      ])
      fingerprintLockAcquired = true

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
          return buildValidatedReplaySuccessResult({
            session,
            parsedReplayRecord: {
              id: parsedExisting.id,
              publicCode: parsedExisting.publicCode,
              idempotencyKey: parsedExisting.idempotencyKey,
              requestFingerprint: parsedExisting.requestFingerprint,
              holdAcquiredAt: parsedExisting.holdAcquiredAt,
              holdExpiresAt: parsedExisting.holdExpiresAt,
            },
            preparedValue,
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
        const requiresAllocation = descriptor.itemKind === 'service' && descriptor.durationMinutes > 0
        const allocation = requiresAllocation
          ? resourceAllocationResult.plan.allocations.find(
              (candidate) => candidate.itemSlug === descriptor.itemSlug,
            )
          : null
        if (requiresAllocation && !allocation) {
          throw new Error(`No se encontro la asignacion de recurso para ${descriptor.itemSlug}.`)
        }

        const resourceId = requiresAllocation && allocation?.mode === 'physical'
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
            return buildValidatedReplaySuccessResult({
              session,
              parsedReplayRecord: {
                id: parsedReplayRecord.id,
                publicCode: parsedReplayRecord.publicCode,
                idempotencyKey: parsedReplayRecord.idempotencyKey,
                requestFingerprint: parsedReplayRecord.requestFingerprint,
                holdAcquiredAt: parsedReplayRecord.holdAcquiredAt,
                holdExpiresAt: parsedReplayRecord.holdExpiresAt,
              },
              preparedValue,
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
    } finally {
      if (fingerprintLockAcquired) {
        await session
          .query('SELECT pg_advisory_unlock(hashtext($1))', [preparedContext.requestFingerprint])
          .catch(() => {})
      }
      if (idempotencyLockAcquired) {
        await session
          .query('SELECT pg_advisory_unlock(hashtext($1))', [preparedContext.idempotencyKey])
          .catch(() => {})
      }
    }
  }

  return makePersistenceIssue(
    'TRANSACTION_RETRY_EXHAUSTED',
    'No se pudo completar la adquisicion del hold tras varios intentos.',
  )
}
