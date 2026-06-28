import { createHash } from 'node:crypto'

import { prepareCustomBundleHoldContract } from '@/lib/bookings/custom-bundle-hold-contract'
import { repriceCustomBundleSubmission, type CustomBundleAuthoritativeQuote } from '@/lib/bookings/custom-bundle-repricing'
import {
  type CustomBundleSubmissionInputV1,
} from '@/lib/bookings/custom-bundle-submission'
import type {
  CustomBundlePreviewHandoffTokenPayloadInput,
} from '@/lib/bookings/custom-bundle-preview-handoff-token-core'

export const CUSTOM_BUNDLE_PREVIEW_SUBMISSION_VERSION =
  'custom_bundle_preview_submission_v1' as const

export type CustomBundlePreviewSubmissionRuntime =
  | 'preview'
  | 'isolated_test'
  | 'production'
  | 'environment_not_allowed'

export interface CustomBundlePreviewSubmissionInput {
  submission: unknown
}

export interface CustomBundlePreviewSubmissionPublicResult {
  ok: true
  stage: 'simulated_hold'
  simulated: true
  publicCode: string
  holdExpiresAtIso: string
  estimatedTotalUsd: number
  totalDurationMinutes: number
  itemCount: number
  recoveryPath: string
  message: string
}

export type CustomBundlePreviewSubmissionFailureStage =
  | 'contract'
  | 'business_rules'
  | 'schedule'
  | 'resource_policy'
  | 'server_context'
  | 'infrastructure'

export type CustomBundlePreviewSubmissionFailureCode =
  | 'INVALID_SUBMISSION'
  | 'PREVIEW_CUSTOM_BUNDLE_SUBMISSION_DISABLED'
  | 'ENVIRONMENT_NOT_ALLOWED'
  | 'INVALID_NOW'
  | 'PREVIEW_RECOVERY_TOKEN_UNAVAILABLE'
  | 'PREVIEW_HANDOFF_TOKEN_UNAVAILABLE'

export interface CustomBundlePreviewSubmissionFailure {
  ok: false
  stage: CustomBundlePreviewSubmissionFailureStage
  code: CustomBundlePreviewSubmissionFailureCode | string
  message: string
  fieldIssues?: Array<{
    code: string
    path?: Array<string | number>
    message: string
  }>
}

export interface CustomBundlePreviewSubmissionInternalSuccess {
  ok: true
  stage: 'simulated_hold'
  public: CustomBundlePreviewSubmissionPublicResult
  publicCode: string
  requestFingerprint: string
  idempotencyKey: string
  holdAcquiredAtIso: string
  holdExpiresAtIso: string
  recoveryToken: string
  previewHandoffToken: string
  recoveryTokenExpiresAtIso: string
  previewHandoffTokenExpiresAtIso: string
  quote: CustomBundleAuthoritativeQuote
  submission: CustomBundleSubmissionInputV1
}

export type CustomBundlePreviewSubmissionResult =
  | CustomBundlePreviewSubmissionFailure
  | CustomBundlePreviewSubmissionInternalSuccess

export interface CustomBundlePreviewSubmissionDependencies {
  runtime: CustomBundlePreviewSubmissionRuntime
  clock: {
    now(): Date
  }
  buildRecoveryToken(input: {
    bookingPublicCode: string
    expiresAt: Date
    now: Date
  }): string | null
  buildPreviewHandoffToken(input: {
    payload: CustomBundlePreviewHandoffTokenPayloadInput
    expiresAt: Date
    now: Date
  }): string | null
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function makeFailure(
  stage: CustomBundlePreviewSubmissionFailureStage,
  code: CustomBundlePreviewSubmissionFailureCode | string,
  message: string,
  fieldIssues?: Array<{ code: string; path?: Array<string | number>; message: string }>,
): CustomBundlePreviewSubmissionFailure {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage, code, message, fieldIssues }
    : { ok: false, stage, code, message }
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

function buildServerIdempotencyKey(submission: CustomBundleSubmissionInputV1): string {
  const canonical = stableStringify(submission)
  const digest = createHash('sha256').update(`${CUSTOM_BUNDLE_PREVIEW_SUBMISSION_VERSION}:${canonical}`).digest('hex')
  return `PREVIEW_HOLD_${digest}`
}

function getCaracasYear(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
  }).format(now)
}

function buildPreviewPublicCode(input: {
  now: Date
  requestFingerprint: string
  holdAcquiredAtIso: string
  estimatedTotalUsd: number
}): string {
  const year = getCaracasYear(input.now)
  const digest = createHash('sha256')
    .update(
      [
        CUSTOM_BUNDLE_PREVIEW_SUBMISSION_VERSION,
        year,
        input.requestFingerprint,
        input.holdAcquiredAtIso,
        input.estimatedTotalUsd.toFixed(2),
      ].join('|'),
    )
    .digest('hex')
  const digestNumber = BigInt(`0x${digest.slice(0, 16)}`)
  const codeNumber = digestNumber % BigInt(1_000_000_000_000)
  const suffix = codeNumber.toString().padStart(12, '0')
  return `TUR-${year}-${suffix}`
}

function isPreviewRuntimeAllowed(runtime: CustomBundlePreviewSubmissionRuntime): boolean {
  return runtime === 'preview' || runtime === 'isolated_test'
}

function mapRepricingFailure(result: Exclude<ReturnType<typeof repriceCustomBundleSubmission>, { ok: true }>): CustomBundlePreviewSubmissionFailure {
  if (result.stage === 'contract') {
    return makeFailure(
      'contract',
      'INVALID_SUBMISSION',
      'La solicitud de paquete no es valida para la simulacion Preview.',
      result.contractIssues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    )
  }

  return makeFailure(
    'business_rules',
    'INVALID_SUBMISSION',
    'La solicitud de paquete no cumple las reglas del catalogo autoritativo.',
    result.businessIssues.map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
  )
}

export function runCustomBundlePreviewSubmissionCore(
  dependencies: CustomBundlePreviewSubmissionDependencies,
  input: CustomBundlePreviewSubmissionInput,
): CustomBundlePreviewSubmissionResult {
  if (!isPreviewRuntimeAllowed(dependencies.runtime)) {
    return makeFailure(
      dependencies.runtime === 'production' ? 'infrastructure' : 'infrastructure',
      dependencies.runtime === 'production'
        ? 'PREVIEW_CUSTOM_BUNDLE_SUBMISSION_DISABLED'
        : 'ENVIRONMENT_NOT_ALLOWED',
      dependencies.runtime === 'production'
        ? 'La simulacion Preview no esta habilitada en produccion.'
        : 'El entorno actual no permite preparar la simulacion Preview.',
    )
  }

  const nowCandidate = dependencies.clock.now()
  if (!isValidDate(nowCandidate)) {
    return makeFailure(
      'server_context',
      'INVALID_NOW',
      'El reloj del servidor no es valido para preparar la simulacion Preview.',
    )
  }

  const now = new Date(nowCandidate.getTime())
  const repriced = repriceCustomBundleSubmission(input.submission)
  if (!repriced.ok) {
    return mapRepricingFailure(repriced)
  }

  const idempotencyKey = buildServerIdempotencyKey(repriced.quote.submission)
  const holdResult = prepareCustomBundleHoldContract({
    submission: repriced.quote.submission,
    serverContext: {
      idempotencyKey,
      now,
      holdDurationMinutes: 60,
    },
  })

  if (!holdResult.ok) {
    if (holdResult.stage === 'contract') {
      return makeFailure(
        'contract',
        'INVALID_SUBMISSION',
        'La solicitud de paquete no es valida para la simulacion Preview.',
        holdResult.contractIssues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      )
    }

    if (holdResult.stage === 'business_rules') {
      return makeFailure(
        'business_rules',
        'INVALID_SUBMISSION',
        'La solicitud de paquete no cumple las reglas del catalogo autoritativo.',
        holdResult.businessIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
        })),
      )
    }

    if (holdResult.stage === 'schedule') {
      return makeFailure(
        'schedule',
        'INVALID_SUBMISSION',
        'La solicitud de paquete no pudo planificarse para la simulacion Preview.',
        holdResult.scheduleIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
        })),
      )
    }

    if (holdResult.stage === 'resource_policy') {
      return makeFailure(
        'resource_policy',
        'INVALID_SUBMISSION',
        'La solicitud de paquete no pudo planificarse para la simulacion Preview.',
        holdResult.resourcePolicyIssues.map((issue) => ({
          code: issue.code,
          message: issue.message,
        })),
      )
    }

    return makeFailure(
      'server_context',
      'INVALID_NOW',
      'El reloj del servidor no es valido para preparar la simulacion Preview.',
      holdResult.serverContextIssues.map((issue) => ({
        code: issue.code,
        message: issue.message,
      })),
    )
  }

  const hold = holdResult.value
  const holdAcquiredAt = new Date(hold.holdAcquiredAtIso)
  const holdExpiresAt = new Date(hold.holdExpiresAtIso)
  if (!isValidDate(holdAcquiredAt) || !isValidDate(holdExpiresAt)) {
    return makeFailure(
      'server_context',
      'INVALID_NOW',
      'La ventana simulada del hold no es valida.',
    )
  }

  const publicCode = buildPreviewPublicCode({
    now,
    requestFingerprint: hold.requestFingerprint,
    holdAcquiredAtIso: hold.holdAcquiredAtIso,
    estimatedTotalUsd: hold.quote.estimate.estimatedTotalUsd,
  })
  const holdExpiresAtIso = holdExpiresAt.toISOString()
  const holdAcquiredAtIso = holdAcquiredAt.toISOString()
  const itemCount = hold.quote.estimate.lines.length
  const estimatedTotalUsd = hold.quote.estimate.estimatedTotalUsd
  const holdWindowMinutes = hold.holdDurationMinutes
  if (!Number.isInteger(holdWindowMinutes) || holdWindowMinutes <= 0) {
    return makeFailure(
      'server_context',
      'INVALID_NOW',
      'La ventana simulada del hold no es valida.',
    )
  }

  const totalDurationMinutes = hold.quote.estimate.totalDurationMinutes
  const recoveryToken = dependencies.buildRecoveryToken({
    bookingPublicCode: publicCode,
    expiresAt: holdExpiresAt,
    now,
  })
  if (!recoveryToken) {
    return makeFailure(
      'infrastructure',
      'PREVIEW_RECOVERY_TOKEN_UNAVAILABLE',
      'No pudimos generar el token de recuperacion Preview.',
    )
  }

  const estimatedTotalUsdCents = Math.max(0, Math.round(estimatedTotalUsd * 100))
  const previewHandoffToken = dependencies.buildPreviewHandoffToken({
    payload: {
      publicCode,
      requestFingerprint: hold.requestFingerprint,
      eventDate: hold.quote.submission.eventDate,
      startTime: hold.quote.submission.startTime,
      durationMinutes: totalDurationMinutes,
      estimatedTotalUsdCents,
      holdAcquiredAt: Math.floor(holdAcquiredAt.getTime() / 1000),
      holdExpiresAt: Math.floor(holdExpiresAt.getTime() / 1000),
    },
    expiresAt: holdExpiresAt,
    now,
  })
  if (!previewHandoffToken) {
    return makeFailure(
      'infrastructure',
      'PREVIEW_HANDOFF_TOKEN_UNAVAILABLE',
      'No pudimos generar el handoff Preview.',
    )
  }

  const publicResult: CustomBundlePreviewSubmissionPublicResult = {
    ok: true,
    stage: 'simulated_hold',
    simulated: true,
    publicCode,
    holdExpiresAtIso,
    estimatedTotalUsd,
    totalDurationMinutes,
    itemCount,
    recoveryPath: `/reservas/pago?code=${encodeURIComponent(publicCode)}`,
    message: 'Simulacion de apartado preparada. Continua al pago simulado.',
  }

  return {
    ok: true,
    stage: 'simulated_hold',
    public: publicResult,
    publicCode,
    requestFingerprint: hold.requestFingerprint,
    idempotencyKey,
    holdAcquiredAtIso,
    holdExpiresAtIso,
    recoveryToken,
    previewHandoffToken,
    recoveryTokenExpiresAtIso: holdExpiresAtIso,
    previewHandoffTokenExpiresAtIso: holdExpiresAtIso,
    quote: hold.quote,
    submission: hold.quote.submission,
  }
}
