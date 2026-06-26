'use server'

import { cookies } from 'next/headers'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import { runCustomBundlePaymentReceiptEntrypoint } from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint'
import {
  CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
  buildCustomBundlePaymentRecoveryCookieClearOptions,
} from '@/lib/bookings/custom-bundle-payment-recovery-cookie'
import {
  parseCustomBundlePaymentActionFormData,
  runCustomBundleProtectedPaymentActionCore,
  type CustomBundlePaymentActionDependencies,
  type CustomBundleProtectedPaymentActionDependencies,
  type CustomBundleProtectedPaymentActionResult,
} from '@/lib/bookings/custom-bundle-payment-action-core'

export const BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED_ENV =
  'BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED' as const

export type CustomBundlePaymentActionRuntime =
  | 'preview'
  | 'production'
  | 'isolated_test'
  | 'environment_not_allowed'

function readRecoveryTokenCookie(): string | null {
  const token = cookies().get(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME)?.value?.trim() ?? ''
  return token.length > 0 ? token : null
}

function clearRecoveryTokenCookie(): void {
  cookies().set(
    CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
    '',
    buildCustomBundlePaymentRecoveryCookieClearOptions(),
  )
}

function getRuntime(): CustomBundlePaymentActionRuntime {
  if (isPreviewDeployment()) {
    return 'preview'
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'production'
  }

  return 'environment_not_allowed'
}

function makeDisabledResult(): Extract<CustomBundleProtectedPaymentActionResult, { ok: false }> {
  return {
    ok: false,
    stage: 'infrastructure',
    code: 'PAYMENT_ACTION_DISABLED',
    message: 'La accion protegida de pago no esta habilitada en este entorno.',
  }
}

function createAuthorizePaymentAccessAdapter(): CustomBundleProtectedPaymentActionDependencies['authorizePaymentAccess'] {
  return async ({ token, expectedPublicCode, now }) => {
    const result = validatePaymentRecoveryToken(token, expectedPublicCode, now)
    return result.ok ? { ok: true } : { ok: false, reason: result.error }
  }
}

async function runActionWithRuntime(
  input: unknown,
  dependencies: CustomBundlePaymentActionDependencies,
): Promise<CustomBundleProtectedPaymentActionResult> {
  const parsed = parseCustomBundlePaymentActionFormData(input)
  if (!parsed.ok) {
    return parsed.result
  }

  if (dependencies.runtime === 'environment_not_allowed') {
    return makeDisabledResult()
  }

  if (dependencies.runtime === 'production' && !dependencies.killSwitchEnabled) {
    return makeDisabledResult()
  }

  const coreDependencies: CustomBundleProtectedPaymentActionDependencies = {
    readRecoveryToken: dependencies.readRecoveryToken,
    clock: dependencies.clock,
    authorizePaymentAccess: dependencies.authorizePaymentAccess,
    runReceiptEntrypoint: dependencies.runReceiptEntrypoint,
  }

  return runCustomBundleProtectedPaymentActionCore(coreDependencies, parsed.value)
}

export async function runCustomBundlePaymentProtectedActionWithDependencies(
  input: unknown,
  dependencies: CustomBundlePaymentActionDependencies,
): Promise<CustomBundleProtectedPaymentActionResult> {
  return runActionWithRuntime(input, dependencies)
}

export async function reportCustomBundlePaymentProtectedAction(
  formData: FormData,
): Promise<CustomBundleProtectedPaymentActionResult> {
  const runtime = getRuntime()
  const dependencies: CustomBundlePaymentActionDependencies = {
    runtime,
    killSwitchEnabled: process.env[BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED_ENV]?.trim() === 'true',
    readRecoveryToken(): string | null {
      return readRecoveryTokenCookie()
    },
    clock: {
      now(): Date {
        return new Date()
      },
    },
    authorizePaymentAccess: createAuthorizePaymentAccessAdapter(),
    runReceiptEntrypoint: runCustomBundlePaymentReceiptEntrypoint,
  }

  const result = await runActionWithRuntime(formData, dependencies)
  if (!result.ok && result.stage === 'authorization' && result.code === 'PAYMENT_ACCESS_DENIED') {
    clearRecoveryTokenCookie()
  }

  if (result.ok && (result.stage === 'reported' || result.stage === 'replayed')) {
    clearRecoveryTokenCookie()
  }

  return result
}
