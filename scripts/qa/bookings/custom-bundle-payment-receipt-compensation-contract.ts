import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

import { buildCustomBundlePaymentServerIdempotencyKey } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import { normalizeCustomBundlePaymentReference } from '@/lib/bookings/custom-bundle-payment-contract'
import { sanitizeReceiptResult } from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint'
import {
  runCustomBundlePaymentReceiptEntrypointCore,
  type CustomBundlePaymentReceiptEntrypointDependencies,
  type CustomBundlePaymentReceiptEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'
import type { ReportCustomBundlePaymentWithSqlResult } from '@/lib/bookings/custom-bundle-payment-reporting'
import {
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadReceipt,
  type CustomBundlePaymentUploadReceiptPayload,
} from '@/lib/bookings/custom-bundle-payment-upload-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_receipt_compensation_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

function makeReceiptPayloadForSubmission(
  input: {
    publicCode: string
    paymentMethod: string
    paymentReference: string
  },
  overrides: Partial<CustomBundlePaymentUploadReceiptPayload> = {},
): CustomBundlePaymentUploadReceiptPayload {
  const now = new Date('2026-06-25T12:00:00.000Z')
  const keyResult = buildCustomBundlePaymentServerIdempotencyKey({
    submission: {
      publicCode: input.publicCode,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
    },
    paymentProofFile: null,
  })
  if (!keyResult.ok) {
    fail('Unable to build a valid server idempotency key for the receipt compensation test.')
  }

  return {
    v: 1,
    purpose: 'custom_bundle_payment_upload_receipt_v1',
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(new Date('2026-06-25T12:15:00.000Z').getTime() / 1000),
    publicCode: input.publicCode,
    paymentMethod: input.paymentMethod,
    normalizedReference: normalizeCustomBundlePaymentReference(input.paymentReference),
    paymentReportIdempotencyKey: keyResult.idempotencyKey,
    blobPathname: `payment-proofs/${input.publicCode}/0123456789abcdef-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
    sha256: 'a'.repeat(64),
    mimeType: 'image/png',
    sizeBytes: 10,
    originalFilename: 'receipt.png',
    uploadedAt: now.toISOString(),
    createdByThisCall: true,
    ...overrides,
  }
}

function makeReceiptToken(payload: CustomBundlePaymentUploadReceiptPayload): string {
  const token = buildCustomBundlePaymentUploadReceipt({
    publicCode: payload.publicCode,
    paymentMethod: payload.paymentMethod,
    normalizedReference: payload.normalizedReference,
    paymentReportIdempotencyKey: payload.paymentReportIdempotencyKey,
    blobPathname: payload.blobPathname,
    sha256: payload.sha256,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    originalFilename: payload.originalFilename,
    uploadedAt: new Date(payload.uploadedAt),
    createdByThisCall: payload.createdByThisCall,
    now: new Date('2026-06-25T12:00:00.000Z'),
    expiresAt: new Date('2026-06-25T12:15:00.000Z'),
  })

  if (!token) {
    fail('Unable to build a valid receipt token.')
  }

  return token
}

function makeStore(input: {
  payload: CustomBundlePaymentUploadReceiptPayload
  headMode?: 'normal' | 'throws'
  deleteMode?: 'normal' | 'throws'
}) {
  const calls = { head: 0, delete: 0 }
  let existing: {
    pathname: string
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
    sizeBytes: number
    uploadedAt: Date
    access: 'private'
  } | null = {
    pathname: input.payload.blobPathname,
    contentType: input.payload.mimeType,
    sizeBytes: input.payload.sizeBytes,
    uploadedAt: new Date(input.payload.uploadedAt),
    access: 'private',
  }

  return {
    calls,
    hasObject(): boolean {
      return Boolean(existing)
    },
    async headPrivate(pathname: string) {
      calls.head += 1
      if (input.headMode === 'throws') {
        throw new Error('headPrivate failed.')
      }

      if (!existing || existing.pathname !== pathname) {
        return null
      }

      return structuredClone(existing)
    },
    async putPrivate() {
      throw new Error('Receipt compensation contract should not upload new blobs.')
    },
    async deletePrivate(pathname: string) {
      calls.delete += 1
      if (input.deleteMode === 'throws') {
        throw new Error('deletePrivate failed.')
      }

      if (existing && existing.pathname === pathname) {
        existing = null
      }
    },
  }
}

function makeSession(input: { safetyMode?: 'empty' | 'active' | 'invalid' | 'throws'; closeMode?: 'normal' | 'throws' }) {
  const calls = { total: 0, lock: 0, safety: 0, unlock: 0, close: 0 }

  return {
    calls,
    session: {
      transactionScope: 'single_connection' as const,
      async query(sql: string) {
        calls.total += 1
        if (sql.includes('pg_advisory_lock')) {
          calls.lock += 1
          return { rows: [], rowCount: 0 }
        }

        if (sql.includes('payment_proofs')) {
          calls.safety += 1
          switch (input.safetyMode ?? 'empty') {
            case 'throws':
              throw new Error('Safety query failed.')
            case 'invalid':
              return { rows: null } as any
            case 'active':
              return {
                rows: [
                  {
                    id: 'payment-proof-001',
                    bookingRequestId: 'booking-001',
                    blobPathname: 'payment-proofs/TUR-0808-800/0123456789abcdef-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
                    isActive: true,
                  },
                ],
                rowCount: 1,
              }
            default:
              return { rows: [], rowCount: 0 }
          }
        }

        if (sql.includes('pg_advisory_unlock')) {
          calls.unlock += 1
          return { rows: [], rowCount: 0 }
        }

        return { rows: [], rowCount: 0 }
      },
    },
    async close() {
      calls.close += 1
      if (input.closeMode === 'throws') {
        throw new Error('Session close failed.')
      }
    },
  }
}

function makeDependencies(input: {
  store: ReturnType<typeof makeStore>
  session: ReturnType<typeof makeSession>
  reportPayment: () => Promise<ReportCustomBundlePaymentWithSqlResult>
}) : CustomBundlePaymentReceiptEntrypointDependencies {
  return {
    runtime: 'isolated_test',
    clock: {
      now(): Date {
        return new Date('2026-06-25T12:00:00.000Z')
      },
    },
    validateUploadReceipt(receipt, expectedPublicCode, now) {
      return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, now)
    },
    async openSqlSession() {
      return {
        session: input.session.session as any,
        async close() {
          return input.session.close()
        },
      } as any
    },
    async createPrivateBlobStore() {
      return input.store
    },
    async reportPayment() {
      return input.reportPayment()
    },
  }
}

function makeFailureReport(): any {
  return {
    ok: false,
    stage: 'replay',
    code: 'idempotency_key_conflict',
    replayClassification: 'idempotency_key_conflict',
    message: 'Reporte en conflicto.',
  }
}

function makeReportedSuccess(stage: 'reported' | 'replayed'): any {
  return {
    ok: true as const,
    stage,
    simulated: false as const,
    publicCode: 'TUR-0808-800',
    paymentStatus: 'payment_reported' as const,
    replayed: stage === 'replayed',
    message: stage === 'replayed' ? 'Pago consolidado ya registrado.' : 'Pago consolidado reportado correctamente.',
  }
}

function expectCleanupFailure(
  value: CustomBundlePaymentReceiptEntrypointResult,
  expectedCode: 'BLOB_CLEANUP_FAILED' | 'PROOF_CLEANUP_SAFETY_CHECK_FAILED',
): Extract<CustomBundlePaymentReceiptEntrypointResult, { ok: false }> {
  assert.equal(value.ok, false)
  if (value.ok) {
    fail('Expected a cleanup failure.')
  }

  assert.equal(value.stage, 'cleanup')
  assert.equal(value.code, expectedCode)
  return value
}

function expectOriginalFailure(
  value: Extract<CustomBundlePaymentReceiptEntrypointResult, { ok: false }>,
  expectedStage: string,
  expectedCode: string,
): void {
  assert.equal('originalFailure' in value, true)
  if (!('originalFailure' in value)) {
    fail('Expected the original failure to be preserved internally.')
  }

  assert.equal(value.originalFailure?.stage, expectedStage)
  assert.equal(value.originalFailure?.code, expectedCode)
}

async function runReceiptCase(input: {
  receiptPayload: CustomBundlePaymentUploadReceiptPayload
  safetyMode?: 'empty' | 'active' | 'invalid' | 'throws'
  headMode?: 'normal' | 'throws'
  deleteMode?: 'normal' | 'throws'
  closeMode?: 'normal' | 'throws'
  reportPayment: () => Promise<ReportCustomBundlePaymentWithSqlResult>
}) {
  const store = makeStore({
    payload: input.receiptPayload,
    headMode: input.headMode,
    deleteMode: input.deleteMode,
  })
  const session = makeSession({
    safetyMode: input.safetyMode,
    closeMode: input.closeMode,
  })
  const result = await runCustomBundlePaymentReceiptEntrypointCore(
    makeDependencies({
      store,
      session,
      reportPayment: input.reportPayment,
    }),
    {
      submission: {
        publicCode: input.receiptPayload.publicCode,
        paymentMethod: input.receiptPayload.paymentMethod,
        paymentReference: 'REF-800',
      },
      uploadReceipt: makeReceiptToken(input.receiptPayload),
    },
  )

  return { result, store, session }
}

export async function main(): Promise<void> {
  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'receipt-compensation-contract-secret' },
    async () => {
      const basePayload = makeReceiptPayloadForSubmission({
        publicCode: 'TUR-0808-800',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-800',
      })

      const reusedPayload = makeReceiptPayloadForSubmission(
        {
          publicCode: 'TUR-0808-800',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-800',
        },
        { createdByThisCall: false },
      )

      const noOwned = await runReceiptCase({
        receiptPayload: reusedPayload,
        reportPayment: async () => makeFailureReport(),
      })
      assert.equal(noOwned.session.calls.safety, 0)
      assert.equal(noOwned.store.calls.delete, 0)
      assert.equal(noOwned.result.ok, false)
      if (noOwned.result.ok) {
        fail('Expected a failure when the report operation fails.')
      }
      assert.equal(noOwned.result.stage, 'conflict')

      const activeProof = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'active',
        reportPayment: async () => makeFailureReport(),
      })
      assert.equal(activeProof.session.calls.safety, 1)
      assert.equal(activeProof.store.calls.delete, 0)
      assert.equal(activeProof.result.ok, false)
      if (activeProof.result.ok) {
        fail('Expected a failure when the report operation fails.')
      }
      assert.equal(activeProof.result.stage, 'conflict')

      const reusedObject = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'empty',
        reportPayment: async () => makeFailureReport(),
      })
      assert.equal(reusedObject.session.calls.safety, 1)
      assert.equal(reusedObject.store.calls.delete, 1)
      assert.equal(reusedObject.result.ok, false)
      if (reusedObject.result.ok) {
        fail('Expected a failure when the report operation fails.')
      }
      assert.equal(reusedObject.result.stage, 'conflict')

      const structuredDeleteFailure = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'empty',
        deleteMode: 'throws',
        reportPayment: async () => makeFailureReport(),
      })
      const cleanupFailure = expectCleanupFailure(structuredDeleteFailure.result, 'BLOB_CLEANUP_FAILED')
      expectOriginalFailure(cleanupFailure, 'conflict', 'idempotency_key_conflict')

      const sanitizedCleanupFailure = sanitizeReceiptResult(cleanupFailure)
      assert.equal('originalFailure' in sanitizedCleanupFailure, false)
      assert.equal(JSON.stringify(sanitizedCleanupFailure).includes('originalFailure'), false)

      const safetyQueryFailure = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'throws',
        reportPayment: async () => makeFailureReport(),
      })
      const safetyCleanup = expectCleanupFailure(safetyQueryFailure.result, 'PROOF_CLEANUP_SAFETY_CHECK_FAILED')
      expectOriginalFailure(safetyCleanup, 'conflict', 'idempotency_key_conflict')
      assert.equal(safetyQueryFailure.store.calls.delete, 0)

      const headFailurePayload = makeReceiptPayloadForSubmission(
        {
          publicCode: 'TUR-0808-800',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-800',
        },
      )
      const headFailureStore = makeStore({
        payload: headFailurePayload,
        headMode: 'throws',
      })
      const headFailureSession = makeSession({})
      let reportCalls = 0
      const headFailureResult = await runCustomBundlePaymentReceiptEntrypointCore(
        makeDependencies({
          store: headFailureStore,
          session: headFailureSession,
          reportPayment: async () => {
            reportCalls += 1
            return makeFailureReport()
          },
        }),
        {
          submission: {
            publicCode: headFailurePayload.publicCode,
            paymentMethod: headFailurePayload.paymentMethod,
            paymentReference: 'REF-800',
          },
          uploadReceipt: makeReceiptToken(headFailurePayload),
        },
      )
      assert.equal(headFailureResult.ok, false)
      if (headFailureResult.ok) {
        fail('Expected proof-object lookup failure to be returned.')
      }
      assert.equal(headFailureResult.stage, 'infrastructure')
      assert.equal(headFailureResult.code, 'PROOF_OBJECT_LOOKUP_FAILED')
      assert.equal(reportCalls, 0)
      assert.equal(headFailureStore.calls.delete, 0)
      assert.equal(headFailureSession.calls.lock, 1)
      assert.equal(headFailureSession.calls.unlock, 1)
      assert.equal(headFailureSession.calls.close, 1)

      const exactReplay = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'empty',
        reportPayment: async () => makeReportedSuccess('replayed'),
      })
      assert.equal(exactReplay.result.ok, true)
      assert.equal(exactReplay.result.stage, 'replayed')
      assert.equal(exactReplay.store.calls.delete, 0)

      const reported = await runReceiptCase({
        receiptPayload: basePayload,
        safetyMode: 'empty',
        reportPayment: async () => makeReportedSuccess('reported'),
      })
      assert.equal(reported.result.ok, true)
      assert.equal(reported.result.stage, 'reported')
      assert.equal(reported.store.calls.delete, 0)

      const source = sanitizeReceiptResult(cleanupFailure)
      assert.equal('originalFailure' in source, false)
    },
  )

  console.log('booking_custom_bundle_payment_receipt_compensation_contract OK')
  console.log('structured delete failure: verified')
  console.log('original reporting cause: preserved')
  console.log('active proof preservation: verified')
  console.log('reused object preservation: verified')
  console.log('head failure sanitization: verified')
  console.log('advisory lifecycle: verified')
  console.log('public result sanitization: verified')
}

main().catch((error) => fail('Unexpected failure while validating the receipt compensation contract.', error))
