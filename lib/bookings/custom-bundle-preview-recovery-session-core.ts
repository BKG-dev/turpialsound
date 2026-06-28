import type {
  CustomBundlePreviewHandoffTokenValidationResult,
} from '@/lib/bookings/custom-bundle-preview-handoff-token-core'
import type { PaymentRecoveryTokenValidationResult } from '@/lib/bookings/payment-recovery-token'

export interface CustomBundlePreviewRecoverySessionTrustedData {
  publicCode: string
  eventDate: string
  startTime: string
  durationMinutes: number
  paymentDeadlineIso: string
  amountUsd: number
}

export interface CustomBundlePreviewRecoverySessionPendingPayment {
  ok: true
  stage: 'pending_payment'
  trusted: CustomBundlePreviewRecoverySessionTrustedData
  recoveryTokenExpiresAtIso: string
  previewHandoffTokenExpiresAtIso: string
}

export interface CustomBundlePreviewRecoverySessionFailure {
  ok: false
  stage: 'expired' | 'invalid_link' | 'unavailable'
  code:
    | 'INVALID_PUBLIC_CODE'
    | 'RECOVERY_TOKEN_MISSING'
    | 'RECOVERY_TOKEN_INVALID'
    | 'PREVIEW_HANDOFF_TOKEN_MISSING'
    | 'PREVIEW_HANDOFF_TOKEN_INVALID'
    | 'PREVIEW_HANDOFF_TOKEN_EXPIRED'
    | 'PREVIEW_SESSION_UNAVAILABLE'
  message: string
}

export type CustomBundlePreviewRecoverySessionResult =
  | CustomBundlePreviewRecoverySessionPendingPayment
  | CustomBundlePreviewRecoverySessionFailure

function isValidPublicCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function normalizePublicCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function makeFailure(
  stage: CustomBundlePreviewRecoverySessionFailure['stage'],
  code: CustomBundlePreviewRecoverySessionFailure['code'],
  message: string,
): CustomBundlePreviewRecoverySessionFailure {
  return { ok: false, stage, code, message }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function mapRecoveryValidationFailure(
  failure: Exclude<PaymentRecoveryTokenValidationResult, { ok: true }>,
): CustomBundlePreviewRecoverySessionFailure {
  switch (failure.error) {
    case 'misconfigured_secret':
      return makeFailure(
        'unavailable',
        'PREVIEW_SESSION_UNAVAILABLE',
        'No pudimos preparar la sesion Preview de recuperacion.',
      )
    case 'expired_token':
      return makeFailure(
        'expired',
        'RECOVERY_TOKEN_INVALID',
        'El enlace seguro de recuperacion ya vencio.',
      )
    default:
      return makeFailure(
        'invalid_link',
        'RECOVERY_TOKEN_INVALID',
        'No pudimos validar el enlace seguro de recuperacion.',
      )
  }
}

function mapHandoffValidationFailure(
  failure: Exclude<CustomBundlePreviewHandoffTokenValidationResult, { ok: true }>,
): CustomBundlePreviewRecoverySessionFailure {
  switch (failure.error) {
    case 'misconfigured_secret':
      return makeFailure(
        'unavailable',
        'PREVIEW_SESSION_UNAVAILABLE',
        'No pudimos preparar la sesion Preview de recuperacion.',
      )
    case 'expired_token':
      return makeFailure(
        'expired',
        'PREVIEW_HANDOFF_TOKEN_EXPIRED',
        'La simulacion Preview ya vencio.',
      )
    default:
      return makeFailure(
        'invalid_link',
        'PREVIEW_HANDOFF_TOKEN_INVALID',
        'No pudimos validar la simulacion Preview.',
      )
  }
}

export function runCustomBundlePreviewRecoverySessionCore(input: {
  publicCode: unknown
  recoveryToken: string | null
  previewHandoffToken: string | null
  now: Date
  validateRecoveryToken(token: string, expectedPublicCode: string, now: Date): PaymentRecoveryTokenValidationResult
  validatePreviewHandoffToken(
    token: string,
    expectedPublicCode: string,
    now: Date,
  ): CustomBundlePreviewHandoffTokenValidationResult
}): CustomBundlePreviewRecoverySessionResult {
  const publicCode = normalizePublicCode(input.publicCode)
  if (!isValidPublicCode(publicCode)) {
    return makeFailure(
      'invalid_link',
      'INVALID_PUBLIC_CODE',
      'Debes usar un enlace valido con codigo publico.',
    )
  }

  if (!isValidDate(input.now)) {
    return makeFailure(
      'unavailable',
      'PREVIEW_SESSION_UNAVAILABLE',
      'No pudimos preparar la sesion Preview de recuperacion.',
    )
  }

  if (!input.recoveryToken) {
    return makeFailure(
      'invalid_link',
      'RECOVERY_TOKEN_MISSING',
      'No pudimos validar la simulacion Preview.',
    )
  }

  if (!input.previewHandoffToken) {
    return makeFailure(
      'invalid_link',
      'PREVIEW_HANDOFF_TOKEN_MISSING',
      'No pudimos validar la simulacion Preview.',
    )
  }

  const recoveryValidation = input.validateRecoveryToken(input.recoveryToken, publicCode, input.now)
  if (!recoveryValidation.ok) {
    return mapRecoveryValidationFailure(recoveryValidation)
  }

  const handoffValidation = input.validatePreviewHandoffToken(
    input.previewHandoffToken,
    publicCode,
    input.now,
  )
  if (!handoffValidation.ok) {
    return mapHandoffValidationFailure(handoffValidation)
  }

  const recoveryPayload = recoveryValidation.payload
  const handoffPayload = handoffValidation.payload
  const recoveryTokenExpiresAtIso = new Date(recoveryPayload.exp * 1000).toISOString()
  const previewHandoffTokenExpiresAtIso = new Date(handoffPayload.exp * 1000).toISOString()
  const holdExpiresAt = new Date(handoffPayload.holdExpiresAt * 1000)
  if (!(holdExpiresAt instanceof Date) || Number.isNaN(holdExpiresAt.getTime())) {
    return makeFailure(
      'unavailable',
      'PREVIEW_SESSION_UNAVAILABLE',
      'No pudimos preparar la sesion Preview de recuperacion.',
    )
  }

  if (holdExpiresAt.getTime() <= input.now.getTime()) {
    return makeFailure(
      'expired',
      'PREVIEW_HANDOFF_TOKEN_EXPIRED',
      'La simulacion Preview ya vencio.',
    )
  }

  return {
    ok: true,
    stage: 'pending_payment',
    trusted: {
      publicCode,
      eventDate: handoffPayload.eventDate,
      startTime: handoffPayload.startTime,
      durationMinutes: handoffPayload.durationMinutes,
      paymentDeadlineIso: holdExpiresAt.toISOString(),
      amountUsd: handoffPayload.estimatedTotalUsdCents / 100,
    },
    recoveryTokenExpiresAtIso,
    previewHandoffTokenExpiresAtIso,
  }
}
