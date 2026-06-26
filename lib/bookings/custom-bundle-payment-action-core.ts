import {
  validateCustomBundlePaymentReportSubmission,
  type CustomBundlePaymentReportSubmission,
} from '@/lib/bookings/custom-bundle-payment-contract'
import type {
  CustomBundlePaymentProofFileLike,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type {
  CustomBundlePaymentServerEntrypointInput,
  CustomBundlePaymentServerEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'

export interface CustomBundleProtectedPaymentActionInput {
  publicCode: unknown
  paymentMethod: unknown
  paymentReference: unknown
  paymentProofFile: CustomBundlePaymentProofFileLike | null
}

export interface CustomBundleProtectedPaymentActionDependencies {
  readRecoveryToken(): string | null
  clock: {
    now(): Date
  }
  authorizePaymentAccess(input: {
    token: string
    expectedPublicCode: string
    now: Date
  }): Promise<
    | { ok: true }
    | {
        ok: false
        reason:
          | 'invalid_token'
          | 'expired_token'
          | 'code_mismatch'
          | 'misconfigured_secret'
      }
  >
  runServerEntrypoint(
    input: CustomBundlePaymentServerEntrypointInput,
  ): Promise<
    | CustomBundlePaymentServerEntrypointResult
    | {
        ok: false
        stage: 'infrastructure'
        code: 'PAYMENT_ACTION_DISABLED'
        message: string
      }
  >
}

export type CustomBundleProtectedPaymentActionResult =
  | CustomBundlePaymentServerEntrypointResult
  | {
      ok: false
      stage: 'request'
      code:
        | 'INVALID_ACTION_PAYLOAD'
        | 'DUPLICATE_ACTION_FIELD'
        | 'UNSUPPORTED_ACTION_FIELD'
      message: string
      fieldIssues?: Array<{
        code: string
        path?: Array<string | number>
        message: string
      }>
    }
  | {
      ok: false
      stage: 'authorization'
      code: 'PAYMENT_ACCESS_DENIED' | 'PAYMENT_ACCESS_UNAVAILABLE'
      message: string
    }
  | {
      ok: false
      stage: 'infrastructure'
      code: 'PAYMENT_ACTION_DISABLED' | 'PAYMENT_ACTION_EXECUTION_FAILED'
      message: string
    }

type RequestFieldIssue = {
  code: string
  message: string
  path?: Array<string | number>
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function makeRequestFailure(
  code:
    | 'INVALID_ACTION_PAYLOAD'
    | 'DUPLICATE_ACTION_FIELD'
    | 'UNSUPPORTED_ACTION_FIELD',
  message: string,
  fieldIssues?: RequestFieldIssue[],
): Extract<CustomBundleProtectedPaymentActionResult, { ok: false; stage: 'request' }> {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage: 'request', code, message, fieldIssues }
    : { ok: false, stage: 'request', code, message }
}

function makeAuthorizationFailure(
  code: 'PAYMENT_ACCESS_DENIED' | 'PAYMENT_ACCESS_UNAVAILABLE',
  message: string,
): Extract<CustomBundleProtectedPaymentActionResult, { ok: false; stage: 'authorization' }> {
  return { ok: false, stage: 'authorization', code, message }
}

function makeInfrastructureFailure(
  code: 'PAYMENT_ACTION_DISABLED' | 'PAYMENT_ACTION_EXECUTION_FAILED',
  message: string,
): Extract<CustomBundleProtectedPaymentActionResult, { ok: false; stage: 'infrastructure' }> {
  return { ok: false, stage: 'infrastructure', code, message }
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

function normalizeRequestedPublicCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function normalizeRequestedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRequestedPaymentProofFile(
  value: unknown,
): { ok: true; value: CustomBundlePaymentProofFileLike | null } | { ok: false; issue: RequestFieldIssue } {
  if (value === null || value === undefined) {
    return { ok: true, value: null }
  }

  if (!isFileLike(value)) {
    return {
      ok: false,
      issue: {
        code: 'INVALID_ACTION_PAYLOAD',
        path: ['paymentProofFile'],
        message: 'El comprobante no tiene la forma esperada.',
      },
    }
  }

  if (value.name === '' && value.type === '' && value.size === 0) {
    return { ok: true, value: null }
  }

  return { ok: true, value }
}

function buildPaymentSubmission(input: {
  publicCode: string
  paymentMethod: string
  paymentReference: string
}): CustomBundlePaymentReportSubmission {
  return {
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod as CustomBundlePaymentReportSubmission['paymentMethod'],
    paymentReference: input.paymentReference,
  }
}

export async function runCustomBundleProtectedPaymentActionCore(
  dependencies: CustomBundleProtectedPaymentActionDependencies,
  input: CustomBundleProtectedPaymentActionInput,
): Promise<CustomBundleProtectedPaymentActionResult> {
  const publicCode = normalizeRequestedPublicCode(input.publicCode)
  if (!/^TUR-\d{4}-\d{3,}$/.test(publicCode) || publicCode.length > 32) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'No pudimos validar los datos publicos de la accion protegida.',
      [
        {
          code: 'INVALID_ACTION_PAYLOAD',
          path: ['publicCode'],
          message: 'publicCode no es valido.',
        },
      ],
    )
  }

  let paymentRecoveryToken = ''
  try {
    paymentRecoveryToken = normalizeRequestedString(dependencies.readRecoveryToken())
  } catch {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_UNAVAILABLE',
      'El acceso seguro para reportar pagos no esta disponible temporalmente.',
    )
  }

  if (paymentRecoveryToken.length === 0 || paymentRecoveryToken.length > 4096) {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  let now: Date
  try {
    const candidate = dependencies.clock.now()
    if (!isValidDate(candidate)) {
      return makeAuthorizationFailure(
        'PAYMENT_ACCESS_UNAVAILABLE',
        'El acceso seguro para reportar pagos no esta disponible temporalmente.',
      )
    }

    now = new Date(candidate.getTime())
  } catch {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_UNAVAILABLE',
      'El acceso seguro para reportar pagos no esta disponible temporalmente.',
    )
  }

  let authorizationResult
  try {
    authorizationResult = await dependencies.authorizePaymentAccess({
      token: paymentRecoveryToken,
      expectedPublicCode: publicCode,
      now,
    })
  } catch {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_UNAVAILABLE',
      'El acceso seguro para reportar pagos no esta disponible temporalmente.',
    )
  }

  if (!authorizationResult.ok) {
    if (authorizationResult.reason === 'misconfigured_secret') {
      return makeAuthorizationFailure(
        'PAYMENT_ACCESS_UNAVAILABLE',
        'El acceso seguro para reportar pagos no esta disponible temporalmente.',
      )
    }

    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  const paymentMethod = normalizeRequestedString(input.paymentMethod)
  const paymentReference = normalizeRequestedString(input.paymentReference)
  const normalizedFile = normalizeRequestedPaymentProofFile(input.paymentProofFile)
  if (!normalizedFile.ok) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'No pudimos validar la forma del comprobante de pago.',
      [normalizedFile.issue],
    )
  }

  const submission = buildPaymentSubmission({
    publicCode,
    paymentMethod,
    paymentReference,
  })

  const parsedSubmission = validateCustomBundlePaymentReportSubmission(submission)
  if (!parsedSubmission.ok) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'No pudimos validar la solicitud protegida de pago.',
      parsedSubmission.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    )
  }

  try {
    return await dependencies.runServerEntrypoint({
      submission: parsedSubmission.value,
      paymentProofFile: normalizedFile.value,
    })
  } catch {
    return makeInfrastructureFailure(
      'PAYMENT_ACTION_EXECUTION_FAILED',
      'No pudimos completar la accion protegida de pago.',
    )
  }
}
