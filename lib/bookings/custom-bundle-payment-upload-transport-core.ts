import { buildCustomBundlePaymentServerIdempotencyKey } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import {
  normalizeCustomBundlePaymentReference,
  validateCustomBundlePaymentReportSubmission,
  type CustomBundlePaymentReportSubmissionIssue,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  deleteCustomBundlePaymentProofFromPrivateStore,
  uploadCustomBundlePaymentProofToPrivateStore,
  type CustomBundlePaymentProofBoundaryIssue,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES,
  CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_TTL_SECONDS,
  CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES,
  type CustomBundlePaymentUploadIntentPayload,
  type CustomBundlePaymentUploadTokenValidationResult,
} from '@/lib/bookings/custom-bundle-payment-upload-token'

export type CustomBundlePaymentRecoveryAccessValidationResult =
  | {
      ok: true
      payload: {
        bookingPublicCode: string
        exp: number
        iat: number
      }
    }
  | {
      ok: false
      reason: 'invalid_token' | 'expired_token' | 'code_mismatch' | 'misconfigured_secret'
    }

export interface CustomBundlePaymentUploadTransportClock {
  now(): Date
}

export interface CustomBundlePaymentUploadTransportDependencies {
  runtime: 'preview' | 'production' | 'isolated_test'
  clock: CustomBundlePaymentUploadTransportClock
  validateRecoveryAccess(input: {
    token: string
    expectedPublicCode: string
    now: Date
  }): Promise<CustomBundlePaymentRecoveryAccessValidationResult> | CustomBundlePaymentRecoveryAccessValidationResult
  validateUploadIntent(
    token: string,
    expectedPublicCode: string | null | undefined,
    now: Date,
  ): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadIntentPayload>
  buildUploadIntent(input: {
    publicCode: string
    paymentMethod: string
    paymentReference: string
    normalizedReference: string
    paymentReportIdempotencyKey: string
    originalFilename: string | null
    declaredMimeType: CustomBundlePaymentUploadIntentPayload['declaredMimeType']
    declaredSizeBytes: number
    now: Date
    expiresAt?: Date
  }): string | null
  buildUploadReceipt(input: {
    publicCode: string
    paymentMethod: string
    normalizedReference: string
    paymentReportIdempotencyKey: string
    blobPathname: string
    sha256: string
    mimeType: CustomBundlePaymentUploadIntentPayload['declaredMimeType']
    sizeBytes: number
    originalFilename: string | null
    uploadedAt: Date
    createdByThisCall: boolean
    now: Date
    expiresAt?: Date
  }): string | null
  privateBlobStore: CustomBundlePrivateBlobStore
}

export interface CustomBundlePaymentUploadIntentInput {
  recoveryToken: string
  publicCode: string
  paymentMethod: string
  paymentReference: string
  originalFilename: string | null
  declaredMimeType: CustomBundlePaymentUploadIntentPayload['declaredMimeType']
  declaredSizeBytes: number
}

export interface CustomBundlePaymentUploadIntentResult {
  ok: true
  stage: 'intent'
  uploadIntent: string
}

export interface CustomBundlePaymentUploadProofInput {
  recoveryToken: string
  uploadIntent: string
  readBody(): Promise<Uint8Array>
  contentType: CustomBundlePaymentUploadIntentPayload['declaredMimeType']
  contentLength?: number | null
}

export interface CustomBundlePaymentUploadProofSuccess {
  ok: true
  stage: 'uploaded' | 'reused' | 'simulated'
  simulated: boolean
  createdByThisCall: boolean
  uploadReceipt: string | null
}

export interface CustomBundlePaymentUploadTransportIssue {
  code: string
  message: string
  path?: Array<string | number>
}

export type CustomBundlePaymentUploadTransportResult =
  | CustomBundlePaymentUploadIntentResult
  | CustomBundlePaymentUploadProofSuccess
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundlePaymentReportSubmissionIssue[]
    }
  | {
      ok: false
      stage: 'authorization'
      code:
        | 'PAYMENT_ACCESS_DENIED'
        | 'PAYMENT_ACCESS_UNAVAILABLE'
        | 'INVALID_UPLOAD_TOKEN'
        | 'EXPIRED_UPLOAD_TOKEN'
      message: string
      fieldIssues?: CustomBundlePaymentUploadTransportIssue[]
    }
  | {
      ok: false
      stage: 'boundary'
      code:
        | 'INVALID_FILE'
        | 'INVALID_FILENAME'
        | 'FILE_EMPTY'
        | 'FILE_TOO_LARGE'
        | 'FILE_SIZE_MISMATCH'
        | 'INVALID_DECLARED_MIME_TYPE'
        | 'UNSUPPORTED_BINARY_SIGNATURE'
        | 'MIME_SIGNATURE_MISMATCH'
        | 'FILE_READ_FAILED'
        | 'INVALID_PUBLIC_CODE'
        | 'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY'
        | 'INVALID_NOW'
      message: string
      fieldIssues?: CustomBundlePaymentUploadTransportIssue[]
    }
  | {
      ok: false
      stage: 'store'
      code:
        | 'BLOB_IDEMPOTENCY_CONFLICT'
        | 'BLOB_UPLOAD_FAILED'
        | 'BLOB_RESPONSE_INVALID'
      message: string
    }
  | {
      ok: false
      stage: 'cleanup'
      code: 'BLOB_CLEANUP_FAILED'
      message: string
      originalFailure: {
        stage: 'receipt'
        code: 'RECEIPT_SIGNING_FAILED'
        message: string
      }
      createdByThisCall: true
      cleanupPerformed: true
    }
  | {
      ok: false
      stage: 'infrastructure'
      code: 'ENVIRONMENT_NOT_ALLOWED' | 'UPLOAD_RECEIPT_SIGNING_FAILED' | 'PAYMENT_UPLOAD_EXECUTION_FAILED'
      message: string
    }

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isSafeFilename(value: string | null): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 255) return false

  return !/[\\/\0\r\n]/.test(trimmed) && !/[\u0000-\u001f\u007f]/.test(trimmed)
}

function makeFailure(
  stage: Extract<CustomBundlePaymentUploadTransportResult, { ok: false }>['stage'],
  code: string,
  message: string,
  fieldIssues?: CustomBundlePaymentUploadTransportIssue[],
): Extract<CustomBundlePaymentUploadTransportResult, { ok: false }> {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage, code: code as never, message, fieldIssues } as Extract<
        CustomBundlePaymentUploadTransportResult,
        { ok: false }
      >
    : { ok: false, stage, code: code as never, message } as Extract<
        CustomBundlePaymentUploadTransportResult,
        { ok: false }
      >
}

function mapBoundaryIssues(
  issues: ReadonlyArray<CustomBundlePaymentProofBoundaryIssue>,
): CustomBundlePaymentUploadTransportIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path,
  }))
}

function toUploadFileLike(input: {
  bytes: Uint8Array
  declaredMimeType: CustomBundlePaymentUploadIntentPayload['declaredMimeType']
  originalFilename: string | null
}): CustomBundlePaymentProofFileLike {
  return {
    name: input.originalFilename ?? 'proof',
    type: input.declaredMimeType,
    size: input.bytes.byteLength,
    async arrayBuffer(): Promise<ArrayBuffer> {
      return input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength,
      ) as ArrayBuffer
    },
  }
}

function normalizeRecoveryToken(value: string): string {
  return value.trim()
}

export async function createCustomBundlePaymentUploadIntent(
  dependencies: CustomBundlePaymentUploadTransportDependencies,
  input: CustomBundlePaymentUploadIntentInput,
): Promise<CustomBundlePaymentUploadTransportResult> {
  const parsedSubmission = validateCustomBundlePaymentReportSubmission({
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference,
  })
  if (!parsedSubmission.ok) {
    return {
      ok: false,
      stage: 'contract',
      contractIssues: parsedSubmission.issues,
    }
  }

  const now = dependencies.clock.now()
  if (!isValidDate(now)) {
    return makeFailure('authorization', 'PAYMENT_ACCESS_UNAVAILABLE', 'El acceso seguro no esta disponible temporalmente.')
  }

  const token = normalizeRecoveryToken(input.recoveryToken)
  if (token.length === 0 || token.length > 4096) {
    return makeFailure(
      'authorization',
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  const authorization = await dependencies.validateRecoveryAccess({
    token,
    expectedPublicCode: parsedSubmission.value.publicCode,
    now: new Date(now.getTime()),
  })
  if (!authorization.ok) {
    if (authorization.reason === 'misconfigured_secret') {
      return makeFailure(
        'authorization',
        'PAYMENT_ACCESS_UNAVAILABLE',
        'El acceso seguro para reportar pagos no esta disponible temporalmente.',
      )
    }

    return makeFailure(
      'authorization',
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  const normalizedReference = normalizeCustomBundlePaymentReference(parsedSubmission.value.paymentReference)
  const idempotencyKeyResult = buildCustomBundlePaymentServerIdempotencyKey({
    submission: parsedSubmission.value,
    paymentProofFile: null,
  })
  if (!idempotencyKeyResult.ok) {
    return {
      ok: false,
      stage: 'contract',
      contractIssues: idempotencyKeyResult.contractIssues,
    }
  }

  const expiresAt = new Date(Math.min(authorization.payload.exp, Math.floor((now.getTime() + 600_000) / 1000)) * 1000)
  const uploadIntent = dependencies.buildUploadIntent({
    publicCode: parsedSubmission.value.publicCode,
    paymentMethod: parsedSubmission.value.paymentMethod,
    paymentReference: parsedSubmission.value.paymentReference,
    normalizedReference,
    paymentReportIdempotencyKey: idempotencyKeyResult.idempotencyKey,
    originalFilename: isSafeFilename(input.originalFilename) ? input.originalFilename?.trim() ?? null : null,
    declaredMimeType: input.declaredMimeType,
    declaredSizeBytes: input.declaredSizeBytes,
    now,
    expiresAt,
  })

  if (!uploadIntent) {
    return makeFailure(
      'infrastructure',
      'PAYMENT_UPLOAD_EXECUTION_FAILED',
      'No se pudo generar el intento de subida protegido.',
    )
  }

  return {
    ok: true,
    stage: 'intent',
    uploadIntent,
  }
}

async function cleanupOwnedUploadObject(input: {
  dependencies: CustomBundlePaymentUploadTransportDependencies
  uploaded: { pathname: string }
}): Promise<CustomBundlePaymentUploadTransportResult> {
  const cleanupResult = await deleteCustomBundlePaymentProofFromPrivateStore({
    store: input.dependencies.privateBlobStore,
    pathname: input.uploaded.pathname,
  })

  if (!cleanupResult.ok) {
    return {
      ok: false,
      stage: 'cleanup',
      code: cleanupResult.code,
      message: cleanupResult.message,
      originalFailure: {
        stage: 'receipt',
        code: 'RECEIPT_SIGNING_FAILED',
        message: 'No se pudo firmar el recibo opaco de la subida protegida.',
      },
      createdByThisCall: true,
      cleanupPerformed: true,
    }
  }

  return {
    ok: false,
    stage: 'infrastructure',
    code: 'UPLOAD_RECEIPT_SIGNING_FAILED',
    message: 'No se pudo firmar el recibo opaco de la subida protegida.',
  }
}

export async function uploadCustomBundlePaymentProofWithIntent(
  dependencies: CustomBundlePaymentUploadTransportDependencies,
  input: CustomBundlePaymentUploadProofInput,
): Promise<CustomBundlePaymentUploadTransportResult> {
  const recoveryToken = normalizeRecoveryToken(input.recoveryToken)
  if (recoveryToken.length === 0 || recoveryToken.length > 4096) {
    return makeFailure(
      'authorization',
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  const now = dependencies.clock.now()
  if (!isValidDate(now)) {
    return makeFailure(
      'authorization',
      'PAYMENT_ACCESS_UNAVAILABLE',
      'El acceso seguro no esta disponible temporalmente.',
    )
  }

  const intentValidation = dependencies.validateUploadIntent(input.uploadIntent, null, now)
  if (!intentValidation.ok) {
    if (intentValidation.error === 'expired_token') {
      return makeFailure(
        'authorization',
        'EXPIRED_UPLOAD_TOKEN',
        'El intento de subida ya vencio.',
      )
    }

    if (intentValidation.error === 'misconfigured_secret') {
      return makeFailure(
        'authorization',
        'PAYMENT_ACCESS_UNAVAILABLE',
        'El acceso seguro para reportar pagos no esta disponible temporalmente.',
      )
    }

    return makeFailure(
      'authorization',
      'INVALID_UPLOAD_TOKEN',
      'No pudimos validar el intento de subida protegido.',
    )
  }

  const authorization = await dependencies.validateRecoveryAccess({
    token: recoveryToken,
    expectedPublicCode: intentValidation.payload.publicCode,
    now: new Date(now.getTime()),
  })
  if (!authorization.ok) {
    if (authorization.reason === 'misconfigured_secret') {
      return makeFailure(
        'authorization',
        'PAYMENT_ACCESS_UNAVAILABLE',
        'El acceso seguro para reportar pagos no esta disponible temporalmente.',
      )
    }

    return makeFailure(
      'authorization',
      'PAYMENT_ACCESS_DENIED',
      'No pudimos validar el acceso seguro para reportar este pago.',
    )
  }

  if (input.contentType !== intentValidation.payload.declaredMimeType) {
    return makeFailure(
      'boundary',
      'INVALID_DECLARED_MIME_TYPE',
      'El tipo MIME declarado no coincide con el intento de subida.',
    )
  }

  const contentLength = input.contentLength ?? null
  if (contentLength !== null) {
    if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES) {
      return makeFailure(
        'boundary',
        'FILE_TOO_LARGE',
        'El comprobante supera el maximo permitido para esta subida protegida.',
      )
    }

    if (contentLength !== intentValidation.payload.declaredSizeBytes) {
      return makeFailure(
        'boundary',
        'FILE_SIZE_MISMATCH',
        'El tamano del archivo no coincide con el contenido declarado.',
      )
    }
  }

  const bodyBytes = await input.readBody().catch(() => null)
  if (!bodyBytes) {
    return makeFailure('boundary', 'FILE_READ_FAILED', 'No se pudo leer el comprobante.')
  }

  if (!Number.isInteger(bodyBytes.byteLength) || bodyBytes.byteLength <= 0) {
    return makeFailure('boundary', 'FILE_EMPTY', 'El comprobante no puede estar vacio.')
  }

  if (bodyBytes.byteLength > CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES) {
    return makeFailure(
      'boundary',
      'FILE_TOO_LARGE',
      'El comprobante supera el maximo permitido para esta subida protegida.',
    )
  }

  if (bodyBytes.byteLength > CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES) {
    return makeFailure(
      'boundary',
      'FILE_TOO_LARGE',
      'El comprobante supera el maximo permitido para esta solicitud.',
    )
  }

  const fileLike = toUploadFileLike({
    bytes: bodyBytes,
    declaredMimeType: intentValidation.payload.declaredMimeType,
    originalFilename: intentValidation.payload.originalFilename,
  })

  if (dependencies.runtime === 'preview') {
    return {
      ok: true,
      stage: 'simulated',
      simulated: true,
      createdByThisCall: false,
      uploadReceipt: null,
    }
  }

  const uploadResult = await uploadCustomBundlePaymentProofToPrivateStore({
    store: dependencies.privateBlobStore,
    file: fileLike,
    context: {
      publicCode: intentValidation.payload.publicCode,
      paymentReportIdempotencyKey: intentValidation.payload.paymentReportIdempotencyKey,
      now,
    },
  })

  if (!uploadResult.ok) {
    if (uploadResult.stage === 'boundary') {
      return {
        ok: false,
        stage: 'boundary',
        code: uploadResult.issues[0]?.code ?? 'INVALID_FILE',
        message: 'No pudimos validar el comprobante protegido.',
        fieldIssues: mapBoundaryIssues(uploadResult.issues),
      }
    }

    return makeFailure('store', uploadResult.code, uploadResult.message)
  }

  const uploadReceipt = dependencies.buildUploadReceipt({
    publicCode: intentValidation.payload.publicCode,
    paymentMethod: intentValidation.payload.paymentMethod,
    normalizedReference: intentValidation.payload.normalizedReference,
    paymentReportIdempotencyKey: intentValidation.payload.paymentReportIdempotencyKey,
    blobPathname: uploadResult.metadata.blobPathname,
    sha256: uploadResult.metadata.sha256,
    mimeType: uploadResult.metadata.mimeType,
    sizeBytes: uploadResult.metadata.sizeBytes,
    originalFilename: uploadResult.metadata.originalFilename,
    uploadedAt: uploadResult.metadata.uploadedAt,
    createdByThisCall: uploadResult.createdByThisCall,
    now,
    expiresAt: new Date(
      Math.min(
        authorization.payload.exp * 1000,
        now.getTime() + CUSTOM_BUNDLE_PAYMENT_UPLOAD_RECEIPT_TTL_SECONDS * 1000,
      ),
    ),
  })

  if (!uploadReceipt) {
    if (uploadResult.createdByThisCall) {
      return cleanupOwnedUploadObject({
        dependencies,
        uploaded: uploadResult.privateObject,
      })
    }

    return makeFailure(
      'infrastructure',
      'UPLOAD_RECEIPT_SIGNING_FAILED',
      'No se pudo firmar el recibo opaco de la subida protegida.',
    )
  }

  return {
    ok: true,
    stage: uploadResult.stage,
    simulated: false,
    createdByThisCall: uploadResult.createdByThisCall,
    uploadReceipt,
  }
}
