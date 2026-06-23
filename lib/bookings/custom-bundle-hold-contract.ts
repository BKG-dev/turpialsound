import { createHash } from 'node:crypto'

import { addMinutesToDate } from '@/lib/bookings/caracas-time'
import {
  buildCustomBundleResourceRequirements,
  type CustomBundleResourcePolicyIssue,
  type CustomBundleResourceRequirement,
} from '@/lib/bookings/custom-bundle-resource-policy'
import {
  planCustomBundleContinuousSchedule,
  type CustomBundleContinuousSchedule,
  type CustomBundleScheduleIssue,
} from '@/lib/bookings/custom-bundle-schedule'
import type { CustomBundleAuthoritativeQuote } from '@/lib/bookings/custom-bundle-repricing'
import type {
  CustomBundleEstimateIssue,
  CustomBundleEstimateLine,
} from '@/lib/bookings/types'
import type { CustomBundleSubmissionContractIssue } from '@/lib/bookings/custom-bundle-submission'

export const CUSTOM_BUNDLE_HOLD_CONTRACT_VERSION = 'custom_bundle_hold_v1' as const
export const CUSTOM_BUNDLE_HOLD_TEST_WINDOW_MINUTES = 60 as const

export interface CustomBundleHoldServerContext {
  idempotencyKey: string
  now: Date
  holdDurationMinutes: number
}

export interface CustomBundleHoldContextIssue {
  code:
    | 'INVALID_IDEMPOTENCY_KEY'
    | 'INVALID_NOW'
    | 'INVALID_HOLD_DURATION'
  message: string
}

export interface CustomBundleHoldWindow {
  ok: true
  acquiredAt: Date
  expiresAt: Date
  acquiredAtIso: string
  expiresAtIso: string
}

export interface CustomBundleHoldWindowIssueResult {
  ok: false
  issues: CustomBundleHoldContextIssue[]
}

export type CustomBundleHoldWindowResult =
  | CustomBundleHoldWindow
  | CustomBundleHoldWindowIssueResult

export interface CustomBundleHoldPreparationReady {
  quote: CustomBundleAuthoritativeQuote
  schedule: CustomBundleContinuousSchedule
  requirements: CustomBundleResourceRequirement[]
  idempotencyKey: string
  requestFingerprint: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  holdDurationMinutes: number
}

export type CustomBundleHoldPreparationResult =
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
      serverContextIssues: CustomBundleHoldContextIssue[]
    }
  | {
      ok: true
      stage: 'ready'
      value: CustomBundleHoldPreparationReady
    }

export type CustomBundleIdempotencyReplayClassification =
  | 'no_existing_record'
  | 'active_replay'
  | 'expired_replay'
  | 'key_reused_for_different_request'

export type CustomBundleHoldReplayOperationalState = 'pending_hold' | 'expired_hold'

interface CustomBundleHoldFingerprintLine {
  itemSlug: string
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number
  unitPriceUsd: number
  lineTotalUsd: number
  clientPriceDisplay: string
  included: boolean
}

interface CustomBundleHoldFingerprintScheduleComponent {
  itemSlug: string
  startOffsetMinutes: number
  endOffsetMinutes: number
  durationMinutes: number
}

interface CustomBundleHoldFingerprintRequirement {
  itemSlug: string
  serviceSlug: string
  mode: CustomBundleResourceRequirement['mode']
  candidateResourceSlugs: readonly string[]
}

interface CustomBundleHoldFingerprintPayload {
  contractVersion: typeof CUSTOM_BUNDLE_HOLD_CONTRACT_VERSION
  pricingSource: CustomBundleAuthoritativeQuote['pricingSource']
  bookingMode: CustomBundleAuthoritativeQuote['submission']['bookingMode']
  eventDate: string
  startTime: string
  requester: {
    name: string
    email: string
    phone: string
    whatsappConsentAccepted: boolean
  }
  extrasNotes: string
  lines: CustomBundleHoldFingerprintLine[]
  adjustments: Array<{
    label: string
    amountUsd: number
  }>
  subtotalUsd: number
  estimatedTotalUsd: number
  totalDurationMinutes: number
  schedule: {
    mode: CustomBundleContinuousSchedule['mode']
    timezone: CustomBundleContinuousSchedule['timezone']
    utcOffset: CustomBundleContinuousSchedule['utcOffset']
    eventDate: string
    startTime: string
    startsAtIso: string
    endsAtIso: string
    totalDurationMinutes: number
    components: CustomBundleHoldFingerprintScheduleComponent[]
  }
  requirements: CustomBundleHoldFingerprintRequirement[]
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidHoldDurationMinutes(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 180
}

function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{16,128}$/.test(value)
}

function normalizeIdempotencyKey(value: string): string {
  return value.trim()
}

function makeHoldContextIssue(
  code: CustomBundleHoldContextIssue['code'],
  message: string,
): CustomBundleHoldContextIssue {
  return { code, message }
}

function sortByKey<T>(
  values: readonly T[],
  getKey: (value: T) => string | number,
): T[] {
  return [...values].sort((left, right) => {
    const leftKey = getKey(left)
    const rightKey = getKey(right)
    if (leftKey < rightKey) return -1
    if (leftKey > rightKey) return 1
    return 0
  })
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  )

  const result: Record<string, unknown> = {}
  for (const [key, entry] of entries) {
    result[key] = canonicalize(entry)
  }

  return result
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function mapLinesForFingerprint(
  lines: readonly CustomBundleEstimateLine[],
): CustomBundleHoldFingerprintLine[] {
  return sortByKey(lines, (line) => line.item.slug).map((line) => ({
    itemSlug: line.item.slug,
    quantity: line.quantity,
    sessionDurationMinutes: line.sessionDurationMinutes,
    durationMinutes: line.durationMinutes,
    unitPriceUsd: line.unitPriceUsd,
    lineTotalUsd: line.lineTotalUsd,
    clientPriceDisplay: line.item.clientPriceDisplay,
    included: line.isIncluded === true,
  }))
}

function mapRequirementsForFingerprint(
  requirements: readonly CustomBundleResourceRequirement[],
): CustomBundleHoldFingerprintRequirement[] {
  return sortByKey(requirements, (requirement) => `${requirement.itemSlug}:${requirement.mode}`).map(
    (requirement) => ({
      itemSlug: requirement.itemSlug,
      serviceSlug: requirement.serviceSlug,
      mode: requirement.mode,
      candidateResourceSlugs: [...requirement.candidateResourceSlugs],
    }),
  )
}

function mapScheduleComponentsForFingerprint(
  schedule: CustomBundleContinuousSchedule,
): CustomBundleHoldFingerprintScheduleComponent[] {
  return sortByKey(schedule.components, (component) =>
    `${component.startOffsetMinutes}:${component.itemSlug}`,
  ).map((component) => ({
    itemSlug: component.itemSlug,
    startOffsetMinutes: component.startOffsetMinutes,
    endOffsetMinutes: component.endOffsetMinutes,
    durationMinutes: component.durationMinutes,
  }))
}

function mapAdjustmentsForFingerprint(
  adjustments: CustomBundleAuthoritativeQuote['estimate']['adjustments'],
): Array<{ label: string; amountUsd: number }> {
  return sortByKey(adjustments, (adjustment) => adjustment.label).map((adjustment) => ({
    label: adjustment.label,
    amountUsd: adjustment.amountUsd,
  }))
}

function validateHoldContextDetails(
  context: CustomBundleHoldServerContext,
): {
  issues: CustomBundleHoldContextIssue[]
  normalizedIdempotencyKey: string
} {
  const issues: CustomBundleHoldContextIssue[] = []
  const normalizedIdempotencyKey =
    typeof context.idempotencyKey === 'string' ? normalizeIdempotencyKey(context.idempotencyKey) : ''

  if (!isValidIdempotencyKey(normalizedIdempotencyKey)) {
    issues.push(
      makeHoldContextIssue(
        'INVALID_IDEMPOTENCY_KEY',
        'La clave de idempotencia del servidor no cumple el formato esperado.',
      ),
    )
  }

  if (!isValidDate(context.now)) {
    issues.push(
      makeHoldContextIssue('INVALID_NOW', 'El instante actual del servidor no es valido.'),
    )
  }

  if (!isValidHoldDurationMinutes(context.holdDurationMinutes)) {
    issues.push(
      makeHoldContextIssue(
        'INVALID_HOLD_DURATION',
        'La duracion del hold debe ser un entero entre 1 y 180 minutos.',
      ),
    )
  }

  return {
    issues,
    normalizedIdempotencyKey,
  }
}

export function validateCustomBundleHoldServerContext(
  context: CustomBundleHoldServerContext,
): CustomBundleHoldContextIssue[] {
  return validateHoldContextDetails(context).issues
}

export function buildCustomBundleHoldWindow(
  now: Date,
  holdDurationMinutes: number,
): CustomBundleHoldWindowResult {
  if (!isValidDate(now)) {
    return {
      ok: false,
      issues: [makeHoldContextIssue('INVALID_NOW', 'El instante actual del servidor no es valido.')],
    }
  }

  if (!isValidHoldDurationMinutes(holdDurationMinutes)) {
    return {
      ok: false,
      issues: [
        makeHoldContextIssue(
          'INVALID_HOLD_DURATION',
          'La duracion del hold debe ser un entero entre 1 y 180 minutos.',
        ),
      ],
    }
  }

  const acquiredAt = new Date(now.getTime())
  const expiresAt = addMinutesToDate(acquiredAt, holdDurationMinutes)

  if (!expiresAt || !isValidDate(expiresAt) || expiresAt.getTime() <= acquiredAt.getTime()) {
    return {
      ok: false,
      issues: [
        makeHoldContextIssue(
          'INVALID_HOLD_DURATION',
          'La ventana del hold no pudo construirse correctamente.',
        ),
      ],
    }
  }

  return {
    ok: true,
    acquiredAt,
    expiresAt,
    acquiredAtIso: acquiredAt.toISOString(),
    expiresAtIso: expiresAt.toISOString(),
  }
}

export function isCustomBundleHoldActive(holdExpiresAt: Date, now: Date): boolean {
  if (!isValidDate(holdExpiresAt) || !isValidDate(now)) {
    return false
  }

  return holdExpiresAt.getTime() > now.getTime()
}

export function buildCustomBundleHoldFingerprint(input: {
  quote: CustomBundleAuthoritativeQuote
  schedule: CustomBundleContinuousSchedule
  requirements: readonly CustomBundleResourceRequirement[]
}): string {
  const payload: CustomBundleHoldFingerprintPayload = {
    contractVersion: CUSTOM_BUNDLE_HOLD_CONTRACT_VERSION,
    pricingSource: input.quote.pricingSource,
    bookingMode: input.quote.submission.bookingMode,
    eventDate: input.quote.submission.eventDate,
    startTime: input.quote.submission.startTime,
    requester: {
      name: input.quote.submission.requester.name,
      email: input.quote.submission.requester.email,
      phone: input.quote.submission.requester.phone,
      whatsappConsentAccepted: input.quote.submission.requester.whatsappConsentAccepted,
    },
    extrasNotes: input.quote.submission.extrasNotes,
    lines: mapLinesForFingerprint(input.quote.estimate.lines),
    adjustments: mapAdjustmentsForFingerprint(input.quote.estimate.adjustments),
    subtotalUsd: input.quote.estimate.subtotalUsd,
    estimatedTotalUsd: input.quote.estimate.estimatedTotalUsd,
    totalDurationMinutes: input.quote.estimate.totalDurationMinutes,
    schedule: {
      mode: input.schedule.mode,
      timezone: input.schedule.timezone,
      utcOffset: input.schedule.utcOffset,
      eventDate: input.schedule.eventDate,
      startTime: input.schedule.startTime,
      startsAtIso: input.schedule.startsAtIso,
      endsAtIso: input.schedule.endsAtIso,
      totalDurationMinutes: input.schedule.totalDurationMinutes,
      components: mapScheduleComponentsForFingerprint(input.schedule),
    },
    requirements: mapRequirementsForFingerprint(input.requirements),
  }

  return createHash('sha256').update(stableStringify(payload)).digest('hex')
}

export function classifyCustomBundleIdempotencyReplay(input: {
  requestedIdempotencyKey: string
  requestedFingerprint: string
  existing:
    | null
    | {
        idempotencyKey: string
        requestFingerprint: string
        holdExpiresAt: Date
        operationalState: CustomBundleHoldReplayOperationalState
      }
  now: Date
}): CustomBundleIdempotencyReplayClassification {
  const requestedKey = normalizeIdempotencyKey(input.requestedIdempotencyKey)
  if (!input.existing) {
    return 'no_existing_record'
  }

  const existingKey = normalizeIdempotencyKey(input.existing.idempotencyKey)
  if (existingKey !== requestedKey) {
    return 'no_existing_record'
  }

  if (input.existing.requestFingerprint !== input.requestedFingerprint) {
    return 'key_reused_for_different_request'
  }

  if (input.existing.operationalState === 'expired_hold') {
    return 'expired_replay'
  }

  return isCustomBundleHoldActive(input.existing.holdExpiresAt, input.now)
    ? 'active_replay'
    : 'expired_replay'
}

export function prepareCustomBundleHoldContract(input: {
  submission: unknown
  serverContext: CustomBundleHoldServerContext
}): CustomBundleHoldPreparationResult {
  const serverContextCheck = validateHoldContextDetails(input.serverContext)
  if (serverContextCheck.issues.length > 0) {
    return {
      ok: false,
      stage: 'server_context',
      serverContextIssues: serverContextCheck.issues,
    }
  }

  const scheduleResult = planCustomBundleContinuousSchedule(input.submission)
  if (!scheduleResult.ok) {
    if (scheduleResult.stage === 'contract') {
      return {
        ok: false,
        stage: 'contract',
        contractIssues: scheduleResult.contractIssues,
      }
    }

    if (scheduleResult.stage === 'business_rules') {
      return {
        ok: false,
        stage: 'business_rules',
        businessIssues: scheduleResult.businessIssues,
      }
    }

    return {
      ok: false,
      stage: 'schedule',
      scheduleIssues: scheduleResult.scheduleIssues,
    }
  }

  const resourceRequirementsResult = buildCustomBundleResourceRequirements(
    scheduleResult.quote,
    scheduleResult.schedule,
  )

  if (!resourceRequirementsResult.ok) {
    return {
      ok: false,
      stage: 'resource_policy',
      resourcePolicyIssues: resourceRequirementsResult.issues,
    }
  }

  const holdWindow = buildCustomBundleHoldWindow(
    input.serverContext.now,
    input.serverContext.holdDurationMinutes,
  )
  if (!holdWindow.ok) {
    return {
      ok: false,
      stage: 'server_context',
      serverContextIssues: holdWindow.issues,
    }
  }

  const requestFingerprint = buildCustomBundleHoldFingerprint({
    quote: scheduleResult.quote,
    schedule: scheduleResult.schedule,
    requirements: resourceRequirementsResult.requirements,
  })

  return {
    ok: true,
    stage: 'ready',
    value: {
      quote: scheduleResult.quote,
      schedule: scheduleResult.schedule,
      requirements: resourceRequirementsResult.requirements,
      idempotencyKey: serverContextCheck.normalizedIdempotencyKey,
      requestFingerprint,
      holdAcquiredAtIso: holdWindow.acquiredAtIso,
      holdExpiresAtIso: holdWindow.expiresAtIso,
      holdDurationMinutes: input.serverContext.holdDurationMinutes,
    },
  }
}
