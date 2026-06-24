import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
  type CustomBundlePaymentReportSubmissionIssue,
  type CustomBundlePaymentServerContext,
  validateCustomBundlePaymentReportSubmission,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  deleteCustomBundlePaymentProofFromPrivateStore,
  uploadCustomBundlePaymentProofToPrivateStore,
  type CustomBundlePaymentProofBoundaryIssue,
  type CustomBundlePaymentProofBoundaryContext,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobStore,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import {
  reportCustomBundlePaymentWithSql,
  type ReportCustomBundlePaymentWithSqlResult,
} from '@/lib/bookings/custom-bundle-payment-reporting'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

export interface CustomBundlePaymentProofFlowClock {
  now(): Date
}

export interface CustomBundlePaymentProofFlowDependencies {
  store: CustomBundlePrivateBlobStore
  session: CustomBundleSqlSession
  clock: CustomBundlePaymentProofFlowClock
  reporter?: typeof reportCustomBundlePaymentWithSql
}

export interface CustomBundlePaymentProofFlowInput {
  submission: unknown
  paymentReportIdempotencyKey: string
  paymentProofFile: CustomBundlePaymentProofFileLike | null
}

export interface CustomBundlePaymentProofFlowIssue
  extends Pick<CustomBundlePaymentProofBoundaryIssue, 'message'> {
  code:
    | CustomBundlePaymentProofBoundaryIssue['code']
    | 'PROOF_REQUIRED'
    | 'CLOCK_READ_FAILED'
  path?: Array<string | number>
}

export interface CustomBundlePaymentProofFlowOriginalFailure {
  stage: 'clock' | 'reporting_exception'
  code: 'INVALID_NOW' | 'CLOCK_READ_FAILED' | 'REPORTING_EXECUTION_FAILED'
  message: string
}

type ProofReportSuccess = Extract<ReportCustomBundlePaymentWithSqlResult, { ok: true }>
type ProofReportFailure = Extract<ReportCustomBundlePaymentWithSqlResult, { ok: false }>

export type CustomBundlePaymentProofFlowResult =
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundlePaymentReportSubmissionIssue[]
    }
  | {
      ok: false
      stage: 'proof_boundary'
      proofBoundaryIssues: CustomBundlePaymentProofFlowIssue[]
    }
  | {
      ok: false
      stage: 'blob_store'
      code:
        | 'BLOB_IDEMPOTENCY_CONFLICT'
        | 'BLOB_UPLOAD_FAILED'
        | 'BLOB_RESPONSE_INVALID'
      message: string
    }
  | {
      ok: false
      stage: 'post_upload_failure'
      originalFailure: CustomBundlePaymentProofFlowOriginalFailure
      createdByThisCall: boolean
      cleanupPerformed: boolean
      proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
    }
  | {
      ok: false
      stage: 'reporting'
      reportingResult: ProofReportFailure
      createdByThisCall: boolean
      cleanupPerformed: boolean
      proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
    }
  | {
      ok: false
      stage: 'cleanup'
      code: 'BLOB_CLEANUP_FAILED'
      message: string
      reportingResult?: ProofReportFailure
      originalFailure?: CustomBundlePaymentProofFlowOriginalFailure
      createdByThisCall: true
      cleanupPerformed: true
      proofMetadata: CustomBundleTrustedPaymentProofMetadata
    }
  | {
      ok: true
      stage: 'reported' | 'replayed'
      reportingResult: ProofReportSuccess
      createdByThisCall: boolean
      cleanupPerformed: false
      proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
    }

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isProofRequired(paymentMethod: string): boolean {
  return CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS.includes(
    paymentMethod as (typeof CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS)[number],
  )
}

function makeProofRequiredIssue(): CustomBundlePaymentProofFlowIssue {
  return {
    code: 'PROOF_REQUIRED',
    message: 'Este metodo de pago requiere un comprobante.',
    path: ['paymentProofFile'],
  }
}

function normalizeFlowIssues(
  issues: CustomBundlePaymentProofBoundaryIssue[],
): CustomBundlePaymentProofFlowIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path,
  }))
}

function makeClockFailureIssue(
  code: 'INVALID_NOW' | 'CLOCK_READ_FAILED',
): CustomBundlePaymentProofFlowIssue {
  return {
    code,
    message:
      code === 'INVALID_NOW'
        ? 'El reloj del servidor no es valido para el reporte de pago.'
        : 'El reloj del servidor no pudo leerse para continuar el reporte de pago.',
    path: ['now'],
  }
}

function makeClockFailure(
  code: 'INVALID_NOW' | 'CLOCK_READ_FAILED',
): CustomBundlePaymentProofFlowOriginalFailure {
  return {
    stage: 'clock',
    code,
    message:
      code === 'INVALID_NOW'
        ? 'El reloj del servidor no es valido para el reporte de pago.'
        : 'El reloj del servidor no pudo leerse para continuar el reporte de pago.',
  }
}

function readFlowClockNow(
  clock: CustomBundlePaymentProofFlowClock,
):
  | { ok: true; now: Date }
  | {
      ok: false
      issue: CustomBundlePaymentProofFlowIssue
      originalFailure: CustomBundlePaymentProofFlowOriginalFailure
    } {
  try {
    const value = clock.now()
    if (!isValidDate(value)) {
      const originalFailure = makeClockFailure('INVALID_NOW')
      return {
        ok: false,
        issue: makeClockFailureIssue('INVALID_NOW'),
        originalFailure,
      }
    }

    return { ok: true, now: new Date(value.getTime()) }
  } catch {
    const originalFailure = makeClockFailure('CLOCK_READ_FAILED')
    return {
      ok: false,
      issue: makeClockFailureIssue('CLOCK_READ_FAILED'),
      originalFailure,
    }
  }
}

async function compensateOwnedProofAfterFailure(input: {
  dependencies: CustomBundlePaymentProofFlowDependencies
  createdByThisCall: boolean
  proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
  reportingResult?: ProofReportFailure
  originalFailure?: CustomBundlePaymentProofFlowOriginalFailure
}): Promise<CustomBundlePaymentProofFlowResult> {
  if (!input.createdByThisCall || !input.proofMetadata) {
    if (input.reportingResult) {
      return {
        ok: false,
        stage: 'reporting',
        reportingResult: input.reportingResult,
        createdByThisCall: false,
        cleanupPerformed: false,
        proofMetadata: input.proofMetadata,
      }
    }

    return {
      ok: false,
      stage: 'post_upload_failure',
      originalFailure: input.originalFailure!,
      createdByThisCall: false,
      cleanupPerformed: false,
      proofMetadata: input.proofMetadata,
    }
  }

  const cleanupResult = await deleteCustomBundlePaymentProofFromPrivateStore({
    store: input.dependencies.store,
    pathname: input.proofMetadata.blobPathname,
  })

  if (!cleanupResult.ok) {
    if (input.reportingResult) {
      return {
        ok: false,
        stage: 'cleanup',
        code: cleanupResult.code,
        message: cleanupResult.message,
        reportingResult: input.reportingResult,
        createdByThisCall: true,
        cleanupPerformed: true,
        proofMetadata: input.proofMetadata,
      }
    }

    return {
      ok: false,
      stage: 'cleanup',
      code: cleanupResult.code,
      message: cleanupResult.message,
      originalFailure: input.originalFailure!,
      createdByThisCall: true,
      cleanupPerformed: true,
      proofMetadata: input.proofMetadata,
    }
  }

  if (input.reportingResult) {
    return {
      ok: false,
      stage: 'reporting',
      reportingResult: input.reportingResult,
      createdByThisCall: true,
      cleanupPerformed: true,
      proofMetadata: input.proofMetadata,
    }
  }

  return {
    ok: false,
    stage: 'post_upload_failure',
    originalFailure: input.originalFailure!,
    createdByThisCall: true,
    cleanupPerformed: true,
    proofMetadata: input.proofMetadata,
  }
}

export async function runCustomBundlePaymentProofFlow(
  dependencies: CustomBundlePaymentProofFlowDependencies,
  input: CustomBundlePaymentProofFlowInput,
): Promise<CustomBundlePaymentProofFlowResult> {
  const parsedSubmission = validateCustomBundlePaymentReportSubmission(input.submission)
  if (!parsedSubmission.ok) {
    return {
      ok: false,
      stage: 'contract',
      contractIssues: parsedSubmission.issues,
    }
  }

  const requiresProof = isProofRequired(parsedSubmission.value.paymentMethod)
  const paymentProofFile = input.paymentProofFile

  if (requiresProof && !paymentProofFile) {
    return {
      ok: false,
      stage: 'proof_boundary',
      proofBoundaryIssues: [makeProofRequiredIssue()],
    }
  }

  let proofMetadata: CustomBundleTrustedPaymentProofMetadata | null = null
  let createdByThisCall = false

  if (paymentProofFile) {
    const boundaryContext: CustomBundlePaymentProofBoundaryContext = {
      publicCode: parsedSubmission.value.publicCode,
      paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
      now: dependencies.clock.now(),
    }

    const uploadResult = await uploadCustomBundlePaymentProofToPrivateStore({
      store: dependencies.store,
      file: paymentProofFile,
      context: boundaryContext,
    })

    if (!uploadResult.ok) {
      if (uploadResult.stage === 'boundary') {
        return {
          ok: false,
          stage: 'proof_boundary',
          proofBoundaryIssues: normalizeFlowIssues(uploadResult.issues),
        }
      }

      return {
        ok: false,
        stage: 'blob_store',
        code: uploadResult.code,
        message: uploadResult.message,
      }
    }

    proofMetadata = uploadResult.metadata
    createdByThisCall = uploadResult.createdByThisCall
  }

  const reportNowResult = readFlowClockNow(dependencies.clock)
  if (!reportNowResult.ok) {
    return compensateOwnedProofAfterFailure({
      dependencies,
      createdByThisCall,
      proofMetadata,
      originalFailure: reportNowResult.originalFailure,
    })
  }

  const reporter = dependencies.reporter ?? reportCustomBundlePaymentWithSql
  let reportingResult: ReportCustomBundlePaymentWithSqlResult
  try {
    reportingResult = await reporter(dependencies.session, {
      submission: parsedSubmission.value,
      serverContext: {
        now: reportNowResult.now,
        paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
        proofMetadata,
      } as CustomBundlePaymentServerContext,
    })
  } catch {
    return compensateOwnedProofAfterFailure({
      dependencies,
      createdByThisCall,
      proofMetadata,
      originalFailure: {
        stage: 'reporting_exception',
        code: 'REPORTING_EXECUTION_FAILED',
        message: 'El reporte de pago consolidado falló inesperadamente.',
      },
    })
  }

  if (reportingResult.ok) {
    return {
      ok: true,
      stage: reportingResult.stage,
      reportingResult,
      createdByThisCall,
      cleanupPerformed: false,
      proofMetadata,
    }
  }

  return compensateOwnedProofAfterFailure({
    dependencies,
    createdByThisCall,
    proofMetadata,
    reportingResult,
  })
}
