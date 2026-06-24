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
}

export interface CustomBundlePaymentProofFlowInput {
  submission: unknown
  paymentReportIdempotencyKey: string
  paymentProofFile: CustomBundlePaymentProofFileLike | null
}

export interface CustomBundlePaymentProofFlowIssue
  extends Pick<CustomBundlePaymentProofBoundaryIssue, 'message'> {
  code: CustomBundlePaymentProofBoundaryIssue['code'] | 'PROOF_REQUIRED'
  path?: Array<string | number>
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
      reportingResult: ProofReportFailure
      createdByThisCall: true
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

async function cleanupCreatedProofIfNeeded(input: {
  dependencies: CustomBundlePaymentProofFlowDependencies
  createdByThisCall: boolean
  proofMetadata: CustomBundleTrustedPaymentProofMetadata | null
}): Promise<{ ok: true } | { ok: false; code: 'BLOB_CLEANUP_FAILED'; message: string }> {
  if (!input.createdByThisCall || !input.proofMetadata) {
    return { ok: true }
  }

  const cleanupResult = await deleteCustomBundlePaymentProofFromPrivateStore({
    store: input.dependencies.store,
    pathname: input.proofMetadata.blobPathname,
  })

  if (!cleanupResult.ok) {
    return cleanupResult
  }

  return { ok: true }
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

  const reportNow = dependencies.clock.now()
  if (!isValidDate(reportNow)) {
    return {
      ok: false,
      stage: 'proof_boundary',
      proofBoundaryIssues: [
        {
          code: 'INVALID_NOW',
          message: 'El reloj del servidor no es valido para el reporte de pago.',
          path: ['now'],
        },
      ],
    }
  }

  const reportingResult = await reportCustomBundlePaymentWithSql(dependencies.session, {
    submission: parsedSubmission.value,
    serverContext: {
      now: reportNow,
      paymentReportIdempotencyKey: input.paymentReportIdempotencyKey,
      proofMetadata,
    } as CustomBundlePaymentServerContext,
  })

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

  const cleanupResult = await cleanupCreatedProofIfNeeded({
    dependencies,
    createdByThisCall,
    proofMetadata,
  })

  if (!cleanupResult.ok) {
    return {
      ok: false,
      stage: 'cleanup',
      code: cleanupResult.code,
      message: cleanupResult.message,
      reportingResult,
      createdByThisCall: true,
      proofMetadata: proofMetadata!,
    }
  }

  return {
    ok: false,
    stage: 'reporting',
    reportingResult,
    createdByThisCall,
    cleanupPerformed: createdByThisCall,
    proofMetadata,
  }
}
