'use server'

import { cookies } from 'next/headers'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  buildCustomBundlePreviewHandoffToken,
} from '@/lib/bookings/custom-bundle-preview-handoff-token'
import {
  CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
  buildCustomBundlePaymentRecoveryCookieClearOptions,
  buildCustomBundlePaymentRecoveryCookieSetOptions,
} from '@/lib/bookings/custom-bundle-payment-recovery-cookie'
import {
  CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME,
  buildCustomBundlePreviewHandoffCookieClearOptions,
  buildCustomBundlePreviewHandoffCookieSetOptions,
} from '@/lib/bookings/custom-bundle-preview-handoff-cookie'
import {
  runCustomBundlePreviewSubmissionCore,
  type CustomBundlePreviewSubmissionDependencies,
  type CustomBundlePreviewSubmissionPublicResult,
  type CustomBundlePreviewSubmissionResult,
} from '@/lib/bookings/custom-bundle-preview-submission-core'

type Runtime = 'preview' | 'production' | 'environment_not_allowed'

function getRuntime(): Runtime {
  if (isPreviewDeployment()) {
    return 'preview'
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'production'
  }

  return 'environment_not_allowed'
}

function makeInfrastructureFailure(
  code: 'PREVIEW_CUSTOM_BUNDLE_SUBMISSION_DISABLED' | 'ENVIRONMENT_NOT_ALLOWED' | 'PREVIEW_SUBMISSION_EXECUTION_FAILED',
  message: string,
): Extract<CustomBundlePreviewSubmissionResult, { ok: false }> {
  return {
    ok: false,
    stage: 'infrastructure',
    code,
    message,
  }
}

function clearPreviewHandoffCookie(): void {
  cookies().set(
    CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME,
    '',
    buildCustomBundlePreviewHandoffCookieClearOptions(),
  )
}

function clearRecoveryCookie(): void {
  cookies().set(
    CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
    '',
    buildCustomBundlePaymentRecoveryCookieClearOptions(),
  )
}

function setRecoveryCookie(token: string, now: Date, expiresAt: Date): void {
  const options = buildCustomBundlePaymentRecoveryCookieSetOptions({ now, expiresAt })
  if (!options) {
    throw new Error('Unable to build recovery cookie options.')
  }

  cookies().set(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME, token, options)
}

function setPreviewHandoffCookie(token: string, now: Date, expiresAt: Date): void {
  const options = buildCustomBundlePreviewHandoffCookieSetOptions({ now, expiresAt })
  if (!options) {
    throw new Error('Unable to build preview handoff cookie options.')
  }

  cookies().set(CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME, token, options)
}

export async function submitCustomBundlePreviewAction(
  submission: unknown,
): Promise<CustomBundlePreviewSubmissionPublicResult | Extract<CustomBundlePreviewSubmissionResult, { ok: false }>> {
  const runtime = getRuntime()
  if (runtime !== 'preview') {
    return makeInfrastructureFailure(
      runtime === 'production'
        ? 'PREVIEW_CUSTOM_BUNDLE_SUBMISSION_DISABLED'
        : 'ENVIRONMENT_NOT_ALLOWED',
      runtime === 'production'
        ? 'La simulacion Preview no esta habilitada en produccion.'
        : 'El entorno actual no permite preparar la simulacion Preview.',
    )
  }

  const dependencies: CustomBundlePreviewSubmissionDependencies = {
    runtime,
    clock: {
      now(): Date {
        return new Date()
      },
    },
    buildRecoveryToken(input) {
      return buildPaymentRecoveryToken({
        bookingPublicCode: input.bookingPublicCode,
        expiresAt: input.expiresAt,
        now: input.now,
      })
    },
    buildPreviewHandoffToken(input) {
      return buildCustomBundlePreviewHandoffToken({
        payload: input.payload,
        expiresAt: input.expiresAt,
        now: input.now,
      })
    },
  }

  let result: CustomBundlePreviewSubmissionResult
  try {
    result = runCustomBundlePreviewSubmissionCore(dependencies, { submission })
  } catch {
    clearPreviewHandoffCookie()
    return makeInfrastructureFailure(
      'PREVIEW_SUBMISSION_EXECUTION_FAILED',
      'No pudimos preparar la simulacion de la reserva.',
    )
  }

  if (!result.ok) {
    return result
  }

  try {
    const holdExpiresAt = new Date(result.holdExpiresAtIso)
    const holdAcquiredAt = new Date(result.holdAcquiredAtIso)
    setPreviewHandoffCookie(result.previewHandoffToken, holdAcquiredAt, holdExpiresAt)
    setRecoveryCookie(result.recoveryToken, holdAcquiredAt, holdExpiresAt)
  } catch {
    clearRecoveryCookie()
    clearPreviewHandoffCookie()
    return makeInfrastructureFailure(
      'PREVIEW_SUBMISSION_EXECUTION_FAILED',
      'No pudimos preparar la simulacion de la reserva.',
    )
  }

  return result.public
}
