import {
  normalizeCustomBundlePaymentReference,
  type CustomBundlePaymentServerContext,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  buildCustomBundlePaymentServerIdempotencyKey,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import {
  deleteCustomBundlePaymentProofFromPrivateStore,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  reportCustomBundlePaymentWithSql,
  type ReportCustomBundlePaymentWithSqlResult,
} from '@/lib/bookings/custom-bundle-payment-reporting'
import {
  toTrustedPaymentProofMetadataFromReceiptPayload,
  type CustomBundlePaymentUploadReceiptPayload,
  type CustomBundlePaymentUploadTokenValidationResult,
} from '@/lib/bookings/custom-bundle-payment-upload-token'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'

export const CUSTOM_BUNDLE_PAYMENT_RECEIPT_ENTRYPOINT_VERSION =
  'custom_bundle_payment_receipt_entrypoint_v1' as const

export type CustomBundlePaymentReceiptEntrypointRuntime =
  | 'preview'
  | 'production'
  | 'isolated_test'

export interface CustomBundlePaymentReceiptEntrypointInput {
  submission: unknown
  uploadReceipt: string | null
}

export interface CustomBundlePaymentReceiptEntrypointDependencies {
  runtime: CustomBundlePaymentReceiptEntrypointRuntime
  clock: {
    now(): Date
  }
  validateUploadReceipt(
    receipt: string,
    expectedPublicCode: string,
    now: Date,
  ): CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadReceiptPayload>
  openSqlSession(): Promise<{
    session: CustomBundleSqlSession
    close(): Promise<void>
  }>
  createPrivateBlobStore(): Promise<CustomBundlePrivateBlobStore>
  reportPayment?: typeof reportCustomBundlePaymentWithSql
}

export type CustomBundlePaymentReceiptEntrypointResult =
  | {
      ok: true
      stage: 'simulated'
      simulated: true
      message: string
    }
  | {
      ok: true
      stage: 'reported' | 'replayed'
      simulated: false
      publicCode: string
      paymentStatus: 'payment_reported'
      replayed: boolean
      message: string
    }
  | {
      ok: false
      stage: 'contract' | 'proof' | 'booking' | 'conflict' | 'infrastructure' | 'cleanup'
      code: string
      message: string
      fieldIssues?: Array<{
        code: string
        path?: Array<string | number>
        message: string
      }>
    }

type ReceiptFailureStage = Extract<
  CustomBundlePaymentReceiptEntrypointResult,
  { ok: false }
>['stage']

type ReceiptFailure = Extract<CustomBundlePaymentReceiptEntrypointResult, { ok: false }>
type ReceiptSuccess = Extract<CustomBundlePaymentReceiptEntrypointResult, { ok: true }>

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function makeFailureResult(
  stage: ReceiptFailureStage,
  code: string,
  message: string,
  fieldIssues?: Array<{ code: string; path?: Array<string | number>; message: string }>,
): ReceiptFailure {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage, code, message, fieldIssues }
    : { ok: false, stage, code, message }
}

function makeFieldIssues(
  issues: ReadonlyArray<{ code: string; message: string; path?: Array<string | number> }>,
): Array<{ code: string; path?: Array<string | number>; message: string }> {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path ? [...issue.path] : undefined,
  }))
}

function makeClockNow(
  clock: CustomBundlePaymentReceiptEntrypointDependencies['clock'],
): { ok: true; now: Date } | { ok: false; code: 'INVALID_NOW' | 'CLOCK_READ_FAILED' } {
  try {
    const candidate = clock.now()
    if (!isValidDate(candidate)) {
      return { ok: false, code: 'INVALID_NOW' }
    }

    return { ok: true, now: new Date(candidate.getTime()) }
  } catch {
    return { ok: false, code: 'CLOCK_READ_FAILED' }
  }
}

function normalizeReceiptValue(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function buildServerReceiptContext(input: {
  now: Date
  receipt: CustomBundlePaymentUploadReceiptPayload | null
  idempotencyKey: string
}): CustomBundlePaymentServerContext {
  return {
    now: new Date(input.now.getTime()),
    paymentReportIdempotencyKey: input.idempotencyKey,
    proofMetadata: input.receipt ? toTrustedPaymentProofMetadataFromReceiptPayload(input.receipt) : null,
  }
}

function mapBookingReportResult(
  result: Exclude<ReportCustomBundlePaymentWithSqlResult, { ok: true }>,
): ReceiptFailure {
  switch (result.stage) {
    case 'contract':
      return makeFailureResult(
        'contract',
        result.contractIssues[0]?.code ?? 'INVALID_SUBMISSION',
        'La solicitud de pago no es valida.',
        makeFieldIssues(result.contractIssues),
      )
    case 'server_context':
      return makeFailureResult(
        'infrastructure',
        'code' in result && typeof result.code === 'string' ? result.code : 'INVALID_SQL_SESSION',
        'No se pudo validar el contexto del reporte de pago.',
      )
    case 'lookup':
      return makeFailureResult('booking', result.code, 'No se encontro la reserva a reportar.')
    case 'proof_policy':
      return makeFailureResult('proof', 'PAYMENT_PROOF_INVALID', 'El comprobante no es valido.')
    case 'booking_eligibility':
      return makeFailureResult(
        'booking',
        'PAYMENT_BOOKING_INELIGIBLE',
        'La reserva no es elegible para reportar el pago.',
      )
    case 'replay':
      return makeFailureResult(
        'conflict',
        result.code,
        'No se pudo reutilizar el reporte de pago para esta solicitud.',
      )
    case 'persistence':
      return makeFailureResult(
        result.code === 'DATABASE_WRITE_FAILED' || result.code === 'TRANSACTION_RETRY_EXHAUSTED'
          ? 'infrastructure'
          : 'conflict',
        result.code,
        'No se pudo completar el reporte de pago consolidado.',
      )
  }
}

function mapReceiptValidationFailure(
  failure: Exclude<
    CustomBundlePaymentUploadTokenValidationResult<CustomBundlePaymentUploadReceiptPayload>,
    { ok: true }
  >,
): ReceiptFailure {
  if (failure.error === 'misconfigured_secret') {
    return makeFailureResult(
      'infrastructure',
      'PAYMENT_RECEIPT_UNAVAILABLE',
      'El acceso seguro para validar el recibo no esta disponible temporalmente.',
    )
  }

  if (failure.error === 'expired_token') {
    return makeFailureResult(
      'proof',
      'EXPIRED_UPLOAD_RECEIPT',
      'El recibo de carga ya vencio.',
    )
  }

  return makeFailureResult(
    'proof',
    'INVALID_UPLOAD_RECEIPT',
    'El recibo de carga no es valido.',
  )
}

async function cleanupOwnedReceiptAfterFailure(input: {
  session: CustomBundleSqlSession
  store: CustomBundlePrivateBlobStore
  receipt: CustomBundlePaymentUploadReceiptPayload
  reportFailure: ReceiptFailure | null
  thrownFailure: ReceiptFailure | null
}): Promise<ReceiptFailure | null> {
  if (!input.receipt.createdByThisCall) {
    return input.reportFailure ?? input.thrownFailure
  }

  const safetyQuery = await input.session
    .query<{
      id: string
      bookingRequestId: string
      blobPathname: string
      isActive: boolean
    }>(
      `
        SELECT
          id,
          "bookingRequestId",
          "blobPathname",
          "isActive"
        FROM "payment_proofs"
        WHERE "blobPathname" = $1
          AND "isActive" = true
        LIMIT 1
      `,
      [input.receipt.blobPathname],
    )
    .catch(() => null)

  if (!safetyQuery) {
    return makeFailureResult(
      'cleanup',
      'PROOF_CLEANUP_SAFETY_CHECK_FAILED',
      'No se pudo verificar si el comprobante ya estaba referenciado.',
    )
  }

  if (safetyQuery.rows.length > 0) {
    return input.reportFailure ?? input.thrownFailure
  }

  try {
    await deleteCustomBundlePaymentProofFromPrivateStore({
      store: input.store,
      pathname: input.receipt.blobPathname,
    })
  } catch {
    return makeFailureResult(
      'cleanup',
      'BLOB_CLEANUP_FAILED',
      'No se pudo limpiar el comprobante privado despues del fallo.',
    )
  }

  return input.reportFailure ?? input.thrownFailure
}

function makeSuccessResult(
  reportResult: Extract<ReportCustomBundlePaymentWithSqlResult, { ok: true }>,
): ReceiptSuccess {
  return {
    ok: true,
    stage: reportResult.stage,
    simulated: false,
    publicCode: reportResult.publicCode,
    paymentStatus: 'payment_reported',
    replayed: reportResult.replayed,
    message:
      reportResult.stage === 'replayed'
        ? 'Pago consolidado ya registrado.'
        : 'Pago consolidado reportado correctamente.',
  }
}

function isProofRequired(method: BookingPaymentMethodSlug): boolean {
  return method === 'pago_movil' || method === 'transferencia' || method === 'binance'
}

function buildBindingMismatchFailure(): ReceiptFailure {
  return makeFailureResult(
    'proof',
    'RECEIPT_BINDING_MISMATCH',
    'El recibo opaco no corresponde a la solicitud protegida de pago.',
  )
}

export async function runCustomBundlePaymentReceiptEntrypointCore(
  dependencies: CustomBundlePaymentReceiptEntrypointDependencies,
  input: CustomBundlePaymentReceiptEntrypointInput,
): Promise<CustomBundlePaymentReceiptEntrypointResult> {
  const parsedSubmission = buildCustomBundlePaymentServerIdempotencyKey({
    submission: input.submission,
    paymentProofFile: null,
  })
  if (!parsedSubmission.ok) {
    return makeFailureResult(
      'contract',
      parsedSubmission.contractIssues[0]?.code ?? 'INVALID_SUBMISSION',
      'La solicitud de pago no es valida.',
      makeFieldIssues(parsedSubmission.contractIssues),
    )
  }

  const submission = parsedSubmission.submission
  const nowResult = makeClockNow(dependencies.clock)
  if (!nowResult.ok) {
    return makeFailureResult(
      'infrastructure',
      nowResult.code,
      'El reloj del servidor no esta disponible para completar el reporte de pago.',
    )
  }

  const receiptValue = normalizeReceiptValue(input.uploadReceipt)
  const derivedIdempotencyKey = parsedSubmission.idempotencyKey

  if (dependencies.runtime === 'preview') {
    if (receiptValue) {
      const receiptValidation = dependencies.validateUploadReceipt(
        receiptValue,
        submission.publicCode,
        nowResult.now,
      )
      if (!receiptValidation.ok) {
        return mapReceiptValidationFailure(receiptValidation)
      }

      const receipt = receiptValidation.payload
      if (
        receipt.publicCode !== submission.publicCode ||
        receipt.paymentMethod !== submission.paymentMethod ||
        receipt.normalizedReference !== normalizeCustomBundlePaymentReference(submission.paymentReference) ||
        receipt.paymentReportIdempotencyKey !== derivedIdempotencyKey
      ) {
        return buildBindingMismatchFailure()
      }
    }

    return {
      ok: true,
      stage: 'simulated',
      simulated: true,
      message: 'Simulacion completada. No se modifico la base de datos ni el almacenamiento privado.',
    }
  }

  if (dependencies.runtime !== 'production' && dependencies.runtime !== 'isolated_test') {
    return makeFailureResult(
      'infrastructure',
      'ENVIRONMENT_NOT_ALLOWED',
      'El entorno actual no permite ejecutar el reporte de pago consolidado.',
    )
  }

  if (!receiptValue) {
    if (isProofRequired(submission.paymentMethod)) {
      return makeFailureResult(
        'proof',
        'PROOF_REQUIRED',
        'Este metodo de pago requiere un comprobante.',
      )
    }
  }

  let receipt: CustomBundlePaymentUploadReceiptPayload | null = null
  if (receiptValue) {
    const receiptValidation = dependencies.validateUploadReceipt(
      receiptValue,
      submission.publicCode,
      nowResult.now,
    )

    if (!receiptValidation.ok) {
      return mapReceiptValidationFailure(receiptValidation)
    }

    receipt = receiptValidation.payload
    if (
      receipt.publicCode !== submission.publicCode ||
      receipt.paymentMethod !== submission.paymentMethod ||
      receipt.normalizedReference !== normalizeCustomBundlePaymentReference(submission.paymentReference) ||
      receipt.paymentReportIdempotencyKey !== derivedIdempotencyKey
    ) {
      return buildBindingMismatchFailure()
    }
  }

  let sessionHandle: Awaited<ReturnType<CustomBundlePaymentReceiptEntrypointDependencies['openSqlSession']>> | null =
    null
  let lockAcquired = false
  let store: CustomBundlePrivateBlobStore | null = null

  async function closeSessionHandle(): Promise<void> {
    if (!sessionHandle) {
      return
    }

    await sessionHandle.close()
  }

  try {
    try {
      sessionHandle = await dependencies.openSqlSession()
    } catch {
      return makeFailureResult(
        'infrastructure',
        'SERVER_DATABASE_UNAVAILABLE',
        'La base de datos del reporte de pago no esta disponible.',
      )
    }

    const lockKey = `${CUSTOM_BUNDLE_PAYMENT_RECEIPT_ENTRYPOINT_VERSION}|${submission.publicCode}`
    try {
      await sessionHandle.session.query(
        'SELECT pg_advisory_lock(hashtextextended($1, 0))',
        [lockKey],
      )
      lockAcquired = true
    } catch {
      return makeFailureResult(
        'infrastructure',
        'PAYMENT_RECEIPT_LOCK_FAILED',
        'No se pudo adquirir el bloqueo transaccional del recibo.',
      )
    }

    try {
      store = await dependencies.createPrivateBlobStore()
    } catch {
      return makeFailureResult(
        'infrastructure',
        'PRIVATE_STORAGE_UNAVAILABLE',
        'El almacenamiento privado del comprobante no esta disponible.',
      )
    }

    if (receipt) {
      const object = await store.headPrivate(receipt.blobPathname)
      if (!object) {
        return makeFailureResult(
          'proof',
          'PROOF_OBJECT_NOT_FOUND',
          'El comprobante privado no existe.',
        )
      }

      if (
        object.access !== 'private' ||
        object.pathname !== receipt.blobPathname ||
        object.contentType !== receipt.mimeType ||
        object.sizeBytes !== receipt.sizeBytes ||
        !isValidDate(object.uploadedAt) ||
        object.uploadedAt.toISOString() !== receipt.uploadedAt ||
        object.uploadedAt.getTime() > nowResult.now.getTime()
      ) {
        return makeFailureResult(
          'proof',
          'PROOF_OBJECT_MISMATCH',
          'El comprobante privado no coincide con el recibo validado.',
        )
      }
    }

    const reportPayment = dependencies.reportPayment ?? reportCustomBundlePaymentWithSql
    let reportResult: ReportCustomBundlePaymentWithSqlResult
    try {
      reportResult = await reportPayment(sessionHandle.session, {
        submission,
        serverContext: buildServerReceiptContext({
          now: nowResult.now,
          receipt,
          idempotencyKey: derivedIdempotencyKey,
        }),
      })
    } catch {
      const failure = makeFailureResult(
        'infrastructure',
        'PAYMENT_RECEIPT_EXECUTION_FAILED',
        'No se pudo completar el reporte de pago consolidado.',
      )

      const cleanupFailure = receipt
        ? await cleanupOwnedReceiptAfterFailure({
            session: sessionHandle.session,
            store,
            receipt,
            reportFailure: null,
            thrownFailure: failure,
          })
        : failure

      return cleanupFailure ?? failure
    }

    if (reportResult.ok) {
      return makeSuccessResult(reportResult)
    }

    const mappedFailure = mapBookingReportResult(reportResult)
    const cleanupFailure = receipt
      ? await cleanupOwnedReceiptAfterFailure({
          session: sessionHandle.session,
          store,
          receipt,
          reportFailure: mappedFailure,
          thrownFailure: null,
        })
      : mappedFailure

    return cleanupFailure ?? mappedFailure
  } finally {
    if (lockAcquired && sessionHandle) {
      await sessionHandle.session
        .query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
          `${CUSTOM_BUNDLE_PAYMENT_RECEIPT_ENTRYPOINT_VERSION}|${submission.publicCode}`,
        ])
        .catch(() => {})
    }

    if (sessionHandle) {
      await closeSessionHandle().catch(() => {})
    }
  }
}
