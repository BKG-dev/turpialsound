import { validateCustomBundlePaymentReportSubmission, type CustomBundlePaymentReportSubmission } from '@/lib/bookings/custom-bundle-payment-contract'
import type {
  CustomBundlePaymentReceiptEntrypointInput,
  CustomBundlePaymentReceiptEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'

export interface CustomBundleProtectedPaymentActionInput {
  publicCode: unknown
  paymentMethod: unknown
  paymentReference: unknown
  uploadReceipt: unknown
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
  runReceiptEntrypoint(
    input: CustomBundlePaymentReceiptEntrypointInput,
  ): Promise<CustomBundlePaymentReceiptEntrypointResult>
}

export interface CustomBundlePaymentActionDependencies
  extends CustomBundleProtectedPaymentActionDependencies {
  runtime: 'preview' | 'production' | 'isolated_test' | 'environment_not_allowed'
  killSwitchEnabled: boolean
}

export type CustomBundleProtectedPaymentActionResult =
  | CustomBundlePaymentReceiptEntrypointResult
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

type RequestFailure = Extract<CustomBundleProtectedPaymentActionResult, { ok: false; stage: 'request' }>
type AuthorizationFailure = Extract<
  CustomBundleProtectedPaymentActionResult,
  { ok: false; stage: 'authorization' }
>
type InfrastructureFailure = Extract<
  CustomBundleProtectedPaymentActionResult,
  { ok: false; stage: 'infrastructure' }
>

export type CustomBundlePaymentActionParseResult =
  | {
      ok: true
      value: {
        publicCode: string
        paymentMethod: string
        paymentReference: string
        uploadReceipt: string | null
      }
    }
  | {
      ok: false
      result: RequestFailure
    }

const ACTION_FIELD_NAMES = new Set([
  'publicCode',
  'paymentMethod',
  'paymentReference',
  'uploadReceipt',
])

function isFormDataLike(value: unknown): value is FormData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FormData).entries === 'function' &&
    typeof (value as FormData).getAll === 'function'
  )
}

function makeRequestFailure(
  code:
    | 'INVALID_ACTION_PAYLOAD'
    | 'DUPLICATE_ACTION_FIELD'
    | 'UNSUPPORTED_ACTION_FIELD',
  message: string,
  fieldIssues?: RequestFieldIssue[],
): RequestFailure {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage: 'request', code, message, fieldIssues }
    : { ok: false, stage: 'request', code, message }
}

function makeAuthorizationFailure(
  code: 'PAYMENT_ACCESS_DENIED' | 'PAYMENT_ACCESS_UNAVAILABLE',
  message: string,
): AuthorizationFailure {
  return { ok: false, stage: 'authorization', code, message }
}

function makeInfrastructureFailure(
  code: 'PAYMENT_ACTION_DISABLED' | 'PAYMENT_ACTION_EXECUTION_FAILED',
  message: string,
): InfrastructureFailure {
  return { ok: false, stage: 'infrastructure', code, message }
}

function normalizeTextValue(value: FormDataEntryValue | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalReceipt(
  value: FormDataEntryValue | undefined,
): string | null | RequestFailure {
  if (value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'El recibo de pago protegido no tiene la forma esperada.',
      [
        {
          code: 'INVALID_ACTION_PAYLOAD',
          path: ['uploadReceipt'],
          message: 'uploadReceipt no es valido.',
        },
      ],
    )
  }

  const normalized = value.trim()
  if (normalized.length === 0) {
    return null
  }

  if (normalized.length > 8192) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'El recibo de pago protegido supera el tamano permitido.',
      [
        {
          code: 'INVALID_ACTION_PAYLOAD',
          path: ['uploadReceipt'],
          message: 'uploadReceipt supera el tamano permitido.',
        },
      ],
    )
  }

  return normalized
}

function normalizePublicCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function normalizePaymentReference(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRequestFailure(value: unknown): value is RequestFailure {
  return Boolean(value && typeof value === 'object' && 'ok' in value && (value as { ok?: unknown }).ok === false)
}

function normalizeReceiptInput(input: unknown): CustomBundleProtectedPaymentActionInput | RequestFailure {
  if (!isFormDataLike(input)) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'La accion protegida de pago requiere un FormData valido.',
      [
        {
          code: 'INVALID_ACTION_PAYLOAD',
          path: [],
          message: 'La accion protegida de pago requiere un FormData valido.',
        },
      ],
    )
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

  const unexpectedFields = [...entriesByKey.keys()].filter(
    (key) => !key.startsWith('$ACTION_') && !ACTION_FIELD_NAMES.has(key),
  )
  if (unexpectedFields.length > 0) {
    const unexpectedKey = unexpectedFields[0]
    return makeRequestFailure(
      'UNSUPPORTED_ACTION_FIELD',
      'La accion protegida de pago incluye un campo no admitido.',
      [
        {
          code: 'UNSUPPORTED_ACTION_FIELD',
          path: [unexpectedKey],
          message: `Campo no admitido: ${unexpectedKey}.`,
        },
      ],
    )
  }

  const duplicateKeys = ['publicCode', 'paymentMethod', 'paymentReference', 'uploadReceipt'].filter(
    (key) => (entriesByKey.get(key)?.length ?? 0) > 1,
  )
  if (duplicateKeys.length > 0) {
    const duplicateKey = duplicateKeys[0]
    return makeRequestFailure(
      'DUPLICATE_ACTION_FIELD',
      'La accion protegida de pago incluye un campo duplicado.',
      [
        {
          code: 'DUPLICATE_ACTION_FIELD',
          path: [duplicateKey],
          message: `Campo duplicado: ${duplicateKey}.`,
        },
      ],
    )
  }

  const publicCode = normalizePublicCode(entriesByKey.get('publicCode')?.[0])
  const paymentMethod = normalizeTextValue(entriesByKey.get('paymentMethod')?.[0])
  const paymentReference = normalizePaymentReference(entriesByKey.get('paymentReference')?.[0])
  const uploadReceipt = normalizeOptionalReceipt(entriesByKey.get('uploadReceipt')?.[0])

  const issues: RequestFieldIssue[] = []
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

  if (isRequestFailure(uploadReceipt)) {
    return uploadReceipt
  }

  if (issues.length > 0) {
    return makeRequestFailure(
      'INVALID_ACTION_PAYLOAD',
      'La accion protegida de pago no tiene la forma esperada.',
      issues,
    )
  }

  return {
    publicCode,
    paymentMethod,
    paymentReference,
    uploadReceipt,
  }
}

function readRequestBody(input: unknown): CustomBundlePaymentActionParseResult {
  const parsed = normalizeReceiptInput(input)
  if (isRequestFailure(parsed)) {
    return { ok: false, result: parsed }
  }

  return {
    ok: true,
    value: parsed as {
      publicCode: string
      paymentMethod: string
      paymentReference: string
      uploadReceipt: string | null
    },
  }
}

function readRecoveryTokenCookie(readRecoveryToken: () => string | null): string | null {
  const token = readRecoveryToken()
  return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null
}

function makeSubmission(input: {
  publicCode: string
  paymentMethod: string
  paymentReference: string
}) : CustomBundlePaymentReportSubmission {
  return {
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod as CustomBundlePaymentReportSubmission['paymentMethod'],
    paymentReference: input.paymentReference,
  }
}

export function parseCustomBundlePaymentActionFormData(
  input: unknown,
): CustomBundlePaymentActionParseResult {
  return readRequestBody(input)
}

export async function runCustomBundleProtectedPaymentActionCore(
  dependencies: CustomBundleProtectedPaymentActionDependencies,
  input: CustomBundleProtectedPaymentActionInput,
): Promise<CustomBundleProtectedPaymentActionResult> {
  const publicCode = normalizePublicCode(input.publicCode)
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

  const recoveryToken = readRecoveryTokenCookie(dependencies.readRecoveryToken)
  if (!recoveryToken) {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  let now: Date
  try {
    const candidate = dependencies.clock.now()
    if (!(candidate instanceof Date) || Number.isNaN(candidate.getTime())) {
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

  let accessResult
  try {
    accessResult = await dependencies.authorizePaymentAccess({
      token: recoveryToken,
      expectedPublicCode: publicCode,
      now,
    })
  } catch {
    return makeAuthorizationFailure(
      'PAYMENT_ACCESS_UNAVAILABLE',
      'El acceso seguro para reportar pagos no esta disponible temporalmente.',
    )
  }

  if (!accessResult.ok) {
    if (accessResult.reason === 'misconfigured_secret') {
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

  const paymentMethod = normalizeTextValue(input.paymentMethod as FormDataEntryValue | undefined)
  const paymentReference = normalizePaymentReference(
    input.paymentReference as FormDataEntryValue | undefined,
  )
  const uploadReceipt = normalizeOptionalReceipt(input.uploadReceipt as FormDataEntryValue | undefined)
  if (isRequestFailure(uploadReceipt)) {
    return uploadReceipt
  }

  const submission = makeSubmission({
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
    return await dependencies.runReceiptEntrypoint({
      submission: parsedSubmission.value,
      uploadReceipt,
    })
  } catch {
    return makeInfrastructureFailure(
      'PAYMENT_ACTION_EXECUTION_FAILED',
      'No pudimos completar la accion protegida de pago.',
    )
  }
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
    return makeInfrastructureFailure(
      'PAYMENT_ACTION_DISABLED',
      'La accion protegida de pago no esta habilitada en este entorno.',
    )
  }

  if (dependencies.runtime === 'production' && !dependencies.killSwitchEnabled) {
    return makeInfrastructureFailure(
      'PAYMENT_ACTION_DISABLED',
      'La accion protegida de pago no esta habilitada en este entorno.',
    )
  }

  return runCustomBundleProtectedPaymentActionCore(
    dependencies,
    parsed.value as {
      publicCode: string
      paymentMethod: string
      paymentReference: string
      uploadReceipt: string | null
    },
  )
}
