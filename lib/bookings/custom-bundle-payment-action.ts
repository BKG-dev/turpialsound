'use server'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import { runCustomBundlePaymentServerEntrypoint } from '@/lib/bookings/custom-bundle-payment-server-entrypoint'
import type {
  CustomBundlePaymentProofFileLike,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  runCustomBundleProtectedPaymentActionCore,
  type CustomBundleProtectedPaymentActionDependencies,
  type CustomBundleProtectedPaymentActionInput,
  type CustomBundleProtectedPaymentActionResult,
} from '@/lib/bookings/custom-bundle-payment-action-core'

export const BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED_ENV =
  'BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED' as const

export type CustomBundlePaymentActionRuntime =
  | 'preview'
  | 'production'
  | 'isolated_test'
  | 'environment_not_allowed'

export interface CustomBundlePaymentActionDependencies
  extends CustomBundleProtectedPaymentActionDependencies {
  runtime: CustomBundlePaymentActionRuntime
  killSwitchEnabled: boolean
}

export type CustomBundlePaymentActionParseResult =
  | {
      ok: true
      value: CustomBundleProtectedPaymentActionInput
    }
  | {
      ok: false
      result: CustomBundlePaymentActionRequestResult
    }

type CustomBundlePaymentActionRequestResult = Extract<
  CustomBundleProtectedPaymentActionResult,
  { ok: false; stage: 'request' }
>

const ACTION_FIELD_NAMES = new Set([
  'publicCode',
  'paymentMethod',
  'paymentReference',
  'paymentRecoveryToken',
  'paymentProofFile',
])

function isFormDataLike(value: unknown): value is FormData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FormData).entries === 'function' &&
    typeof (value as FormData).getAll === 'function'
  )
}

function isFileLike(value: unknown): value is CustomBundlePaymentProofFileLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    typeof (value as Record<string, unknown>).type === 'string' &&
    typeof (value as Record<string, unknown>).size === 'number' &&
    typeof (value as Record<string, unknown>).arrayBuffer === 'function'
  )
}

function isEmptyPlaceholderFile(value: CustomBundlePaymentProofFileLike): boolean {
  return value.name === '' && value.type === '' && value.size === 0
}

function makeRequestFailure(
  code:
    | 'INVALID_ACTION_PAYLOAD'
    | 'DUPLICATE_ACTION_FIELD'
    | 'UNSUPPORTED_ACTION_FIELD',
  message: string,
  fieldIssues?: Array<{
    code: string
    path?: Array<string | number>
    message: string
  }>,
): Extract<CustomBundleProtectedPaymentActionResult, { ok: false; stage: 'request' }> {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage: 'request', code, message, fieldIssues }
    : { ok: false, stage: 'request', code, message }
}

function makeDisabledResult(): Extract<CustomBundleProtectedPaymentActionResult, { ok: false }> {
  return {
    ok: false,
    stage: 'infrastructure',
    code: 'PAYMENT_ACTION_DISABLED',
    message: 'La accion protegida de pago no esta habilitada en este entorno.',
  }
}

function normalizeTextValue(value: FormDataEntryValue | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePaymentProofFile(
  value: FormDataEntryValue | undefined,
): CustomBundlePaymentProofFileLike | null | Extract<
  CustomBundleProtectedPaymentActionResult,
  { ok: false; stage: 'request' }
> {
  if (value === undefined) {
    return null
  }

  if (!isFileLike(value)) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'El archivo de comprobante no tiene la forma esperada.',
      [
        {
          code: 'INVALID_ACTION_PAYLOAD',
          path: ['paymentProofFile'],
          message: 'El archivo de comprobante no tiene la forma esperada.',
        },
      ],
    )
  }

  return isEmptyPlaceholderFile(value) ? null : value
}

function isRequestFailure(
  value: CustomBundlePaymentActionRequestResult | CustomBundlePaymentProofFileLike | null,
): value is CustomBundlePaymentActionRequestResult {
  return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === false)
}

export function parseCustomBundlePaymentActionFormData(
  input: unknown,
): CustomBundlePaymentActionParseResult {
  if (!isFormDataLike(input)) {
    return {
      ok: false,
      result: makeRequestFailure(
        'INVALID_ACTION_PAYLOAD',
        'La accion protegida de pago requiere un FormData valido.',
        [
          {
            code: 'INVALID_ACTION_PAYLOAD',
            path: [],
            message: 'La accion protegida de pago requiere un FormData valido.',
          },
        ],
      ),
    }
  }

  const entriesByKey = new Map<string, FormDataEntryValue[]>()
  for (const [key, value] of input.entries()) {
    const bucket = entriesByKey.get(key)
    if (bucket) {
      bucket.push(value)
    } else {
      entriesByKey.set(key, [value])
    }
  }

  const unsupportedKeys = [...entriesByKey.keys()].filter(
    (key) => !key.startsWith('$ACTION_') && !ACTION_FIELD_NAMES.has(key),
  )
  if (unsupportedKeys.length > 0) {
    const unsupportedKey = unsupportedKeys[0]
    return {
      ok: false,
      result: makeRequestFailure(
        'UNSUPPORTED_ACTION_FIELD',
        'La accion protegida de pago incluye un campo no admitido.',
        [
          {
            code: 'UNSUPPORTED_ACTION_FIELD',
            path: [unsupportedKey],
            message: `Campo no admitido: ${unsupportedKey}.`,
          },
        ],
      ),
    }
  }

  const duplicateKeys = ['publicCode', 'paymentMethod', 'paymentReference', 'paymentRecoveryToken', 'paymentProofFile'].filter(
    (key) => (entriesByKey.get(key)?.length ?? 0) > 1,
  )
  if (duplicateKeys.length > 0) {
    const duplicateKey = duplicateKeys[0]
    return {
      ok: false,
      result: makeRequestFailure(
        'DUPLICATE_ACTION_FIELD',
        'La accion protegida de pago incluye un campo duplicado.',
        [
          {
            code: 'DUPLICATE_ACTION_FIELD',
            path: [duplicateKey],
            message: `Campo duplicado: ${duplicateKey}.`,
          },
        ],
      ),
    }
  }

  const publicCode = normalizeTextValue(entriesByKey.get('publicCode')?.[0])
  const paymentMethod = normalizeTextValue(entriesByKey.get('paymentMethod')?.[0])
  const paymentReference = normalizeTextValue(entriesByKey.get('paymentReference')?.[0])
  const paymentRecoveryToken = normalizeTextValue(entriesByKey.get('paymentRecoveryToken')?.[0])
  const paymentProofFileResult = normalizePaymentProofFile(entriesByKey.get('paymentProofFile')?.[0])

  const issues: Array<{
    code: string
    path?: Array<string | number>
    message: string
  }> = []

  if (!publicCode) {
    issues.push({
      code: 'INVALID_ACTION_PAYLOAD',
      path: ['publicCode'],
      message: 'publicCode es obligatorio.',
    })
  }

  if (!paymentMethod) {
    issues.push({
      code: 'INVALID_ACTION_PAYLOAD',
      path: ['paymentMethod'],
      message: 'paymentMethod es obligatorio.',
    })
  }

  if (!paymentReference) {
    issues.push({
      code: 'INVALID_ACTION_PAYLOAD',
      path: ['paymentReference'],
      message: 'paymentReference es obligatorio.',
    })
  }

  if (!paymentRecoveryToken) {
    issues.push({
      code: 'INVALID_ACTION_PAYLOAD',
      path: ['paymentRecoveryToken'],
      message: 'paymentRecoveryToken es obligatorio.',
    })
  }

  if (isRequestFailure(paymentProofFileResult)) {
    return {
      ok: false,
      result: paymentProofFileResult,
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      result: makeRequestFailure(
        'INVALID_ACTION_PAYLOAD',
        'La accion protegida de pago no tiene la forma esperada.',
        issues,
      ),
    }
  }

  return {
    ok: true,
    value: {
      publicCode,
      paymentMethod,
      paymentReference,
      paymentRecoveryToken,
      paymentProofFile: paymentProofFileResult as CustomBundlePaymentProofFileLike | null,
    } as CustomBundleProtectedPaymentActionInput,
  }
}

function resolveRuntime(): CustomBundlePaymentActionRuntime {
  if (isPreviewDeployment()) {
    return 'preview'
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'production'
  }

  return 'environment_not_allowed'
}

function createAuthorizePaymentAccessAdapter(): CustomBundleProtectedPaymentActionDependencies['authorizePaymentAccess'] {
  return async ({ token, expectedPublicCode, now }) => {
    const result = validatePaymentRecoveryToken(token, expectedPublicCode, now)
    return result.ok ? { ok: true } : { ok: false, reason: result.error }
  }
}

function createRunServerEntrypointAdapter(): CustomBundleProtectedPaymentActionDependencies['runServerEntrypoint'] {
  return async (input) => runCustomBundlePaymentServerEntrypoint(input)
}

export async function runCustomBundlePaymentProtectedActionWithDependencies(
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

  const guardedDependencies: CustomBundleProtectedPaymentActionDependencies = {
    clock: dependencies.clock,
    authorizePaymentAccess: dependencies.authorizePaymentAccess,
    runServerEntrypoint: dependencies.runServerEntrypoint,
  }

  return runCustomBundleProtectedPaymentActionCore(guardedDependencies, parsed.value)
}

export async function reportCustomBundlePaymentProtectedAction(
  formData: FormData,
): Promise<CustomBundleProtectedPaymentActionResult> {
  const runtime = resolveRuntime()
  const dependencies: CustomBundlePaymentActionDependencies = {
    runtime,
    killSwitchEnabled: process.env[BOOKINGS_CUSTOM_BUNDLE_PAYMENT_ACTION_ENABLED_ENV]?.trim() === 'true',
    clock: {
      now(): Date {
        return new Date()
      },
    },
    authorizePaymentAccess: createAuthorizePaymentAccessAdapter(),
    runServerEntrypoint: createRunServerEntrypointAdapter(),
  }

  return runCustomBundlePaymentProtectedActionWithDependencies(formData, dependencies)
}
