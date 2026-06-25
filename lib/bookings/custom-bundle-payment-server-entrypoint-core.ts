import { createHash } from 'node:crypto'

import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
  normalizeCustomBundlePaymentReference,
  validateCustomBundlePaymentReportSubmission,
  type CustomBundlePaymentReportSubmission,
  type CustomBundlePaymentReportSubmissionIssue,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  prepareCustomBundlePaymentProofUpload,
  type CustomBundlePaymentProofBoundaryContext,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  runCustomBundlePaymentProofFlow,
  type CustomBundlePaymentProofFlowClock,
  type CustomBundlePaymentProofFlowDependencies,
  type CustomBundlePaymentProofFlowResult,
} from '@/lib/bookings/custom-bundle-payment-proof-flow'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

export const CUSTOM_BUNDLE_PAYMENT_SERVER_ENTRYPOINT_VERSION =
  'custom_bundle_payment_server_entrypoint_v1' as const

export type CustomBundlePaymentServerRuntime =
  | 'preview'
  | 'production'
  | 'isolated_test'

export interface CustomBundlePaymentServerEntrypointInput {
  submission: unknown
  paymentProofFile: CustomBundlePaymentProofFileLike | null
}

export interface CustomBundlePaymentServerEntrypointDependencies {
  runtime: CustomBundlePaymentServerRuntime
  clock: CustomBundlePaymentProofFlowClock
  openSqlSession(): Promise<{
    session: CustomBundleSqlSession
    close(): Promise<void>
  }>
  createPrivateBlobStore(): Promise<CustomBundlePrivateBlobStore>
  runPaymentProofFlow?: typeof runCustomBundlePaymentProofFlow
}

export type CustomBundlePaymentServerEntrypointResult =
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

export type CustomBundlePaymentServerIdempotencyKeyResult =
  | {
      ok: true
      submission: CustomBundlePaymentReportSubmission
      idempotencyKey: string
    }
  | {
      ok: false
      contractIssues: CustomBundlePaymentReportSubmissionIssue[]
    }

type PublicFieldIssue = {
  code: string
  path?: Array<string | number>
  message: string
}

type CustomBundlePaymentServerFailureStage =
  | 'contract'
  | 'proof'
  | 'booking'
  | 'conflict'
  | 'infrastructure'
  | 'cleanup'

type IssueLike = {
  code: string
  message: string
  path?: Array<string | number>
}

const PROOF_REQUIRED_METHOD_SET = new Set<string>(CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS)

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function makeFieldIssues(issues: ReadonlyArray<IssueLike>): PublicFieldIssue[] {
  return issues.map((issue) => {
    const fieldIssue: PublicFieldIssue = {
      code: issue.code,
      message: issue.message,
    }

    if ('path' in issue && issue.path) {
      fieldIssue.path = [...issue.path]
    }

    return fieldIssue
  })
}

function makeFailureResult(
  stage: CustomBundlePaymentServerFailureStage,
  code: string,
  message: string,
  fieldIssues?: PublicFieldIssue[],
): Extract<CustomBundlePaymentServerEntrypointResult, { ok: false }> {
  return fieldIssues
    ? {
        ok: false,
        stage,
        code,
        message,
        fieldIssues,
      }
    : {
        ok: false,
        stage,
        code,
        message,
      }
}

function readClockNow(
  clock: CustomBundlePaymentProofFlowClock,
): { ok: true; now: Date } | { ok: false; code: 'INVALID_NOW' | 'CLOCK_READ_FAILED' } {
  try {
    const value = clock.now()
    if (!isValidDate(value)) {
      return { ok: false, code: 'INVALID_NOW' }
    }

    return { ok: true, now: new Date(value.getTime()) }
  } catch {
    return { ok: false, code: 'CLOCK_READ_FAILED' }
  }
}

export function buildCustomBundlePaymentServerIdempotencyKey(
  input: CustomBundlePaymentServerEntrypointInput,
): CustomBundlePaymentServerIdempotencyKeyResult {
  const parsedSubmission = validateCustomBundlePaymentReportSubmission(input.submission)
  if (!parsedSubmission.ok) {
    return { ok: false, contractIssues: parsedSubmission.issues }
  }

  const normalizedReference = normalizeCustomBundlePaymentReference(
    parsedSubmission.value.paymentReference,
  )
  const keySource = [
    CUSTOM_BUNDLE_PAYMENT_SERVER_ENTRYPOINT_VERSION,
    parsedSubmission.value.publicCode,
    parsedSubmission.value.paymentMethod,
    normalizedReference,
  ].join('|')

  return {
    ok: true,
    submission: parsedSubmission.value,
    idempotencyKey: `PAYMENT_${createHash('sha256').update(keySource).digest('hex')}`,
  }
}

function mapProofBoundaryIssues(
  issues: ReadonlyArray<IssueLike>,
): Array<{ code: string; path?: Array<string | number>; message: string }> {
  return makeFieldIssues(issues)
}

function mapFlowSuccess(
  flowResult: Extract<CustomBundlePaymentProofFlowResult, { ok: true }>,
): Extract<CustomBundlePaymentServerEntrypointResult, { ok: true }> {
  return {
    ok: true,
    stage: flowResult.stage,
    simulated: false,
    publicCode: flowResult.reportingResult.publicCode,
    paymentStatus: 'payment_reported',
    replayed: flowResult.reportingResult.replayed,
    message:
      flowResult.stage === 'replayed'
        ? 'Pago consolidado ya registrado.'
        : 'Pago consolidado reportado correctamente.',
  }
}

function mapFlowFailure(
  flowResult: Extract<CustomBundlePaymentProofFlowResult, { ok: false }>,
): Extract<CustomBundlePaymentServerEntrypointResult, { ok: false }> {
  switch (flowResult.stage) {
    case 'contract':
      return makeFailureResult(
        'contract',
        flowResult.contractIssues[0]?.code ?? 'INVALID_SUBMISSION',
        'La solicitud de pago no es valida.',
        makeFieldIssues(flowResult.contractIssues),
      )
    case 'proof_boundary':
      return makeFailureResult(
        'proof',
        flowResult.proofBoundaryIssues[0]?.code ?? 'INVALID_FILE',
        'El comprobante no es valido o falta.',
        mapProofBoundaryIssues(flowResult.proofBoundaryIssues),
      )
    case 'blob_store':
      return makeFailureResult(
        flowResult.code === 'BLOB_IDEMPOTENCY_CONFLICT' ? 'conflict' : 'infrastructure',
        flowResult.code,
        'No se pudo completar la frontera privada del comprobante.',
      )
    case 'post_upload_failure':
      return makeFailureResult(
        'infrastructure',
        flowResult.originalFailure.code,
        'No se pudo continuar el reporte de pago consolidado.',
      )
    case 'reporting':
      switch (flowResult.reportingResult.stage) {
        case 'booking_eligibility':
          return makeFailureResult(
            'booking',
            'PAYMENT_BOOKING_INELIGIBLE',
            'No se pudo completar el reporte de pago consolidado.',
          )
        case 'lookup':
        case 'proof_policy':
        case 'persistence':
        case 'replay':
        case 'contract':
        case 'server_context':
          return makeFailureResult(
            'conflict',
            'code' in flowResult.reportingResult
              ? flowResult.reportingResult.code
              : 'PAYMENT_REPORT_FAILED',
            'No se pudo completar el reporte de pago consolidado.',
          )
      }
    case 'cleanup':
      return makeFailureResult(
        'cleanup',
        flowResult.code,
        'No se pudo limpiar el comprobante privado despues del fallo.',
      )
  }
}

function isProofRequired(paymentMethod: string): boolean {
  return PROOF_REQUIRED_METHOD_SET.has(paymentMethod)
}

async function runPreviewSimulation(
  dependencies: CustomBundlePaymentServerEntrypointDependencies,
  submission: CustomBundlePaymentReportSubmission,
  paymentProofFile: CustomBundlePaymentProofFileLike | null,
  idempotencyKey: string,
): Promise<CustomBundlePaymentServerEntrypointResult> {
  if (paymentProofFile) {
    const clockRead = readClockNow(dependencies.clock)
    if (!clockRead.ok) {
      return makeFailureResult(
        'infrastructure',
        clockRead.code,
        'El reloj del servidor no esta disponible para validar la vista previa.',
      )
    }

    const proofContext: CustomBundlePaymentProofBoundaryContext = {
      publicCode: submission.publicCode,
      paymentReportIdempotencyKey: idempotencyKey,
      now: clockRead.now,
    }

    const prepared = await prepareCustomBundlePaymentProofUpload({
      file: paymentProofFile,
      context: proofContext,
    })

    if (!prepared.ok) {
      return makeFailureResult(
        'proof',
        prepared.issues[0]?.code ?? 'INVALID_FILE',
        'El comprobante no es valido.',
        mapProofBoundaryIssues(prepared.issues),
      )
    }
  }

  return {
    ok: true,
    stage: 'simulated',
    simulated: true,
    message: 'Simulacion completada. No se modifico la base de datos ni se subieron archivos.',
  }
}

export async function runCustomBundlePaymentServerEntrypointCore(
  dependencies: CustomBundlePaymentServerEntrypointDependencies,
  input: CustomBundlePaymentServerEntrypointInput,
): Promise<CustomBundlePaymentServerEntrypointResult> {
  if (dependencies.runtime === 'preview') {
    const idempotencyKeyResult = buildCustomBundlePaymentServerIdempotencyKey(input)
    if (!idempotencyKeyResult.ok) {
      return makeFailureResult(
        'contract',
        idempotencyKeyResult.contractIssues[0]?.code ?? 'INVALID_SUBMISSION',
        'La solicitud de pago no es valida.',
        makeFieldIssues(idempotencyKeyResult.contractIssues),
      )
    }

    const parsedSubmission = idempotencyKeyResult.submission
    if (input.paymentProofFile === null && isProofRequired(parsedSubmission.paymentMethod)) {
      return makeFailureResult(
        'proof',
        'PROOF_REQUIRED',
        'Este metodo de pago requiere un comprobante.',
        [
          {
            code: 'PROOF_REQUIRED',
            path: ['paymentProofFile'],
            message: 'Este metodo de pago requiere un comprobante.',
          },
        ],
      )
    }

    return runPreviewSimulation(
      dependencies,
      parsedSubmission,
      input.paymentProofFile,
      idempotencyKeyResult.idempotencyKey,
    )
  }

  const idempotencyKeyResult = buildCustomBundlePaymentServerIdempotencyKey(input)
  if (!idempotencyKeyResult.ok) {
    return makeFailureResult(
      'contract',
      idempotencyKeyResult.contractIssues[0]?.code ?? 'INVALID_SUBMISSION',
      'La solicitud de pago no es valida.',
      makeFieldIssues(idempotencyKeyResult.contractIssues),
    )
  }

  const parsedSubmission = idempotencyKeyResult.submission
  if (input.paymentProofFile === null && isProofRequired(parsedSubmission.paymentMethod)) {
    return makeFailureResult(
      'proof',
      'PROOF_REQUIRED',
      'Este metodo de pago requiere un comprobante.',
      [
        {
          code: 'PROOF_REQUIRED',
          path: ['paymentProofFile'],
          message: 'Este metodo de pago requiere un comprobante.',
        },
      ],
    )
  }

  if (dependencies.runtime !== 'production' && dependencies.runtime !== 'isolated_test') {
    return makeFailureResult(
      'infrastructure',
      'ENVIRONMENT_NOT_ALLOWED',
      'El entorno actual no permite ejecutar el reporte de pago consolidado.',
    )
  }

  let sessionHandle: Awaited<ReturnType<CustomBundlePaymentServerEntrypointDependencies['openSqlSession']>> | null = null
  let flowResult: CustomBundlePaymentProofFlowResult | null = null
  let closeError: unknown = null
  let sessionClosed = false

  async function closeSessionHandle(): Promise<void> {
    if (!sessionHandle || sessionClosed) {
      return
    }

    sessionClosed = true
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

    let store: CustomBundlePrivateBlobStore
    try {
      store = await dependencies.createPrivateBlobStore()
    } catch {
      return makeFailureResult(
        'infrastructure',
        'PRIVATE_STORAGE_UNAVAILABLE',
        'El almacenamiento privado del comprobante no esta disponible.',
      )
    }

    const proofFlow = dependencies.runPaymentProofFlow ?? runCustomBundlePaymentProofFlow
    try {
      flowResult = await proofFlow(
        {
          store,
          session: sessionHandle.session,
          clock: dependencies.clock,
        } satisfies CustomBundlePaymentProofFlowDependencies,
        {
          submission: input.submission,
          paymentReportIdempotencyKey: idempotencyKeyResult.idempotencyKey,
          paymentProofFile: input.paymentProofFile,
        },
      )
    } catch {
      return makeFailureResult(
        'infrastructure',
        'PAYMENT_FLOW_EXECUTION_FAILED',
        'El flujo consolidado de pago fallo de forma inesperada.',
      )
    }

    if (!flowResult) {
      return makeFailureResult(
        'infrastructure',
        'PAYMENT_FLOW_EXECUTION_FAILED',
        'El flujo consolidado de pago fallo de forma inesperada.',
      )
    }

    const mappedResult = flowResult.ok ? mapFlowSuccess(flowResult) : mapFlowFailure(flowResult)

    try {
      await closeSessionHandle()
    } catch (error) {
      closeError = error
    }

    if (closeError) {
      if (mappedResult.ok) {
        return makeFailureResult(
          'infrastructure',
          'SQL_SESSION_CLOSE_FAILED',
          'La conexion SQL dedicada no pudo cerrarse correctamente.',
        )
      }
    }

    return mappedResult
  } finally {
    if (sessionHandle && !sessionClosed) {
      await closeSessionHandle().catch((error) => {
        closeError ??= error
      })
    }
  }
}
