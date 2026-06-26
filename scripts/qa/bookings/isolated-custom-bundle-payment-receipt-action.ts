import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import { normalizeCustomBundlePaymentReference } from '@/lib/bookings/custom-bundle-payment-contract'
import {
  runCustomBundlePaymentProtectedActionWithDependencies,
} from '@/lib/bookings/custom-bundle-payment-action-core'
import {
  runCustomBundlePaymentReceiptEntrypointCore,
  type CustomBundlePaymentReceiptEntrypointDependencies,
  type CustomBundlePaymentReceiptEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'
import {
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadReceipt,
  type CustomBundlePaymentUploadReceiptPayload,
} from '@/lib/bookings/custom-bundle-payment-upload-token'
import { buildCustomBundlePaymentServerIdempotencyKey } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_payment_receipt_action FAILED')
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
    fail('Unable to build a valid server idempotency key for the receipt integration test.')
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

function makeFormData(entries: Array<[string, string]>): FormData {
  const formData = new FormData()
  for (const [key, value] of entries) {
    formData.append(key, value)
  }
  return formData
}

function makeReceiptFile(): File {
  return new File(['receipt'], 'receipt.png', { type: 'image/png' })
}

function buildReceiptToken(payload: CustomBundlePaymentUploadReceiptPayload): string {
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

function makeStore(
  seed: CustomBundlePaymentUploadReceiptPayload,
  options: {
    headMode?: 'normal' | 'throws'
    deleteMode?: 'normal' | 'throws'
  } = {},
) {
  const object = {
    pathname: seed.blobPathname,
    contentType: seed.mimeType,
    sizeBytes: seed.sizeBytes,
    uploadedAt: new Date(seed.uploadedAt),
    access: 'private' as const,
  }

  const calls = { head: 0, delete: 0, put: 0 }
  let existing: typeof object | null = structuredClone(object)

  return {
    calls,
    seedReceipt(): void {
      existing = structuredClone(object)
    },
    hasObject(): boolean {
      return Boolean(existing)
    },
    async headPrivate(pathname: string) {
      calls.head += 1
      if (options.headMode === 'throws') {
        throw new Error('receipt action head failure')
      }
      if (!existing || pathname !== existing.pathname) {
        return null
      }

      return structuredClone(existing)
    },
    async putPrivate() {
      calls.put += 1
      throw new Error('receipt action should not upload')
    },
    async deletePrivate(pathname: string) {
      calls.delete += 1
      if (options.deleteMode === 'throws') {
        throw new Error('receipt action delete failure')
      }
      if (existing && existing.pathname === pathname) {
        existing = null
      }
    },
  }
}

function makeSession(options: { safetyMode?: 'empty' | 'active' | 'invalid' | 'throws'; closeMode?: 'normal' | 'throws' } = {}) {
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
          switch (options.safetyMode ?? 'empty') {
            case 'throws':
              throw new Error('receipt action safety query failure')
            case 'invalid':
              return { rows: null } as any
            case 'active':
              return {
                rows: [
                  {
                    id: 'payment-proof-001',
                    bookingRequestId: 'booking-001',
                    blobPathname: 'payment-proofs/TUR-0808-700/0123456789abcdef-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
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
      if (options.closeMode === 'throws') {
        throw new Error('receipt action close failure')
      }
    },
  }
}

function makeReceiptEntrypointDependencies(
  store: ReturnType<typeof makeStore>,
  overrides: Partial<CustomBundlePaymentReceiptEntrypointDependencies> = {},
): CustomBundlePaymentReceiptEntrypointDependencies {
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
        session: {
          transactionScope: 'single_connection' as const,
          async query() {
            return { rows: [], rowCount: 0 }
          },
        },
        async close() {
          return undefined
        },
      }
    },
    async createPrivateBlobStore() {
      return store
    },
    ...overrides,
  }
}

function makeReceiptEntrypointDependenciesWithSession(
  store: ReturnType<typeof makeStore>,
  session: ReturnType<typeof makeSession>,
  overrides: Partial<CustomBundlePaymentReceiptEntrypointDependencies> = {},
): CustomBundlePaymentReceiptEntrypointDependencies {
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
        session: session.session as any,
        async close() {
          return session.close()
        },
      } as any
    },
    async createPrivateBlobStore() {
      return store
    },
    ...overrides,
  }
}

export async function main(): Promise<void> {
  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'receipt-action-contract-secret' },
    async () => {
      const submission = {
        publicCode: 'TUR-0808-700',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-700',
      }
      const receiptPayload = makeReceiptPayloadForSubmission(submission)
      const receiptToken = buildReceiptToken(receiptPayload)
      const reusedReceiptPayload = makeReceiptPayloadForSubmission(submission, {
        createdByThisCall: false,
      })
      const reusedReceiptToken = buildReceiptToken(reusedReceiptPayload)
      const store = makeStore(receiptPayload)
      const recoveryToken = buildPaymentRecoveryToken({
        bookingPublicCode: receiptPayload.publicCode,
        expiresAt: new Date('2026-06-25T12:15:00.000Z'),
        now: new Date('2026-06-25T12:00:00.000Z'),
      })

      async function runProtectedReceiptFlow(input: {
        formData: FormData
        authorizePaymentAccess: () => Promise<{ ok: true } | { ok: false; reason: 'invalid_token' | 'expired_token' | 'code_mismatch' | 'misconfigured_secret' }>
        store: ReturnType<typeof makeStore>
        session: ReturnType<typeof makeSession>
        reportPayment: () => Promise<any>
      }): Promise<{
        result: Awaited<ReturnType<typeof runCustomBundlePaymentProtectedActionWithDependencies>>
        store: ReturnType<typeof makeStore>
        session: ReturnType<typeof makeSession>
      }> {
        const result = await runCustomBundlePaymentProtectedActionWithDependencies(input.formData, {
          runtime: 'isolated_test',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return input.authorizePaymentAccess()
          },
          async runReceiptEntrypoint(receiptInput) {
            return runCustomBundlePaymentReceiptEntrypointCore(
              makeReceiptEntrypointDependenciesWithSession(input.store, input.session, {
                async reportPayment() {
                  return input.reportPayment()
                },
              }),
              receiptInput,
            )
          },
        })
        return { result, store: input.store, session: input.session }
      }

      const previewResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        {
          runtime: 'preview',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return { ok: true }
          },
          async runReceiptEntrypoint() {
            return {
              ok: true,
              stage: 'simulated',
              simulated: true,
              message: 'Simulacion completada. No se modifico la base de datos ni el almacenamiento privado.',
            }
          },
        },
      )
      assert.equal(previewResult.ok, true)
      assert.equal(previewResult.stage, 'simulated')

      const reportedResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        {
          runtime: 'isolated_test',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return { ok: true }
          },
          async runReceiptEntrypoint(input) {
            return runCustomBundlePaymentReceiptEntrypointCore(
              makeReceiptEntrypointDependencies(store, {
                async reportPayment() {
                  return {
                    ok: true,
                    stage: 'reported' as const,
                    replayed: false,
                    publicCode: receiptPayload.publicCode,
                  } as never
                },
              }),
              input,
            )
          },
        },
      )
      assert.equal(reportedResult.ok, true)
      assert.equal(reportedResult.stage, 'reported')

      const replayedResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        {
          runtime: 'isolated_test',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return { ok: true }
          },
          async runReceiptEntrypoint(input) {
            return runCustomBundlePaymentReceiptEntrypointCore(
              makeReceiptEntrypointDependencies(store, {
                async reportPayment() {
                  return {
                    ok: true,
                    stage: 'replayed' as const,
                    replayed: true,
                    publicCode: receiptPayload.publicCode,
                  } as never
                },
              }),
              input,
            )
          },
        },
      )
      assert.equal(replayedResult.ok, true)
      assert.equal(replayedResult.stage, 'replayed')

      const conflictPayload = makeReceiptPayloadForSubmission(submission, {
        blobPathname:
          'payment-proofs/TUR-0808-700/fedcba9876543210-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png',
        sha256: 'b'.repeat(64),
      })
      const conflictToken = buildReceiptToken(conflictPayload)
      const conflictResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', conflictToken],
        ]),
        {
          runtime: 'isolated_test',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return { ok: true }
          },
          async runReceiptEntrypoint(input) {
            return runCustomBundlePaymentReceiptEntrypointCore(
              makeReceiptEntrypointDependencies(makeStore(conflictPayload), {
                async reportPayment() {
                  return {
                    ok: false,
                    stage: 'replay' as const,
                    code: 'idempotency_key_conflict' as const,
                    replayClassification: 'idempotency_key_conflict' as const,
                    message: 'conflict',
                  } as never
                },
              }),
              input,
            )
          },
        },
      )
      assert.equal(conflictResult.ok, false)
      assert.equal(conflictResult.stage, 'conflict')

      const exactBoundaryResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', 'efectivo'],
          ['paymentReference', 'REF-701'],
        ]),
        {
          runtime: 'preview',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return recoveryToken
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:15:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            return { ok: false, reason: 'expired_token' }
          },
          async runReceiptEntrypoint() {
            fail('exact boundary must not reach entrypoint.')
          },
        },
      )
      assert.equal(exactBoundaryResult.ok, false)
      assert.equal(exactBoundaryResult.stage, 'authorization')

      const invalidTokenBlocked = await runProtectedReceiptFlow({
        formData: (() => {
          const formData = new FormData()
          formData.append('publicCode', submission.publicCode)
          formData.append('paymentMethod', '   ')
          formData.append('paymentReference', 'REF-700')
          formData.append('uploadReceipt', makeReceiptFile())
          return formData
        })(),
        authorizePaymentAccess: async () => ({ ok: false, reason: 'invalid_token' }),
        store: makeStore(receiptPayload),
        session: makeSession(),
        reportPayment: async () => {
          fail('Invalid tokens must block the receipt entrypoint before SQL.')
        },
      })
      assert.equal(invalidTokenBlocked.result.ok, false)
      assert.equal(invalidTokenBlocked.result.stage, 'authorization')
      assert.equal(invalidTokenBlocked.session.calls.total, 0)
      assert.equal(invalidTokenBlocked.store.calls.head, 0)
      assert.equal(invalidTokenBlocked.store.calls.delete, 0)

      const invalidReceiptBlocked = await runProtectedReceiptFlow({
        formData: (() => {
          const formData = new FormData()
          formData.append('publicCode', submission.publicCode)
          formData.append('paymentMethod', submission.paymentMethod)
          formData.append('paymentReference', 'REF-700')
          formData.append('uploadReceipt', makeReceiptFile())
          return formData
        })(),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload),
        session: makeSession(),
        reportPayment: async () => {
          fail('Invalid receipts must block the receipt entrypoint before SQL.')
        },
      })
      assert.equal(invalidReceiptBlocked.result.ok, false)
      assert.equal(invalidReceiptBlocked.result.stage, 'request')
      assert.equal(invalidReceiptBlocked.session.calls.total, 0)
      assert.equal(invalidReceiptBlocked.store.calls.head, 0)

      const activeProofPreserved = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload),
        session: makeSession({ safetyMode: 'active' }),
        reportPayment: async () => ({
          ok: false,
          stage: 'replay',
          code: 'idempotency_key_conflict',
          replayClassification: 'idempotency_key_conflict',
          message: 'conflict',
        }),
      })
      assert.equal(activeProofPreserved.result.ok, false)
      assert.equal(activeProofPreserved.result.stage, 'conflict')
      assert.equal(activeProofPreserved.store.calls.delete, 0)
      assert.equal(activeProofPreserved.session.calls.safety, 1)

      const reusedProofPreserved = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', reusedReceiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(
          reusedReceiptPayload,
          { deleteMode: 'normal' },
        ),
        session: makeSession({ safetyMode: 'empty' }),
        reportPayment: async () => ({
          ok: false,
          stage: 'replay',
          code: 'idempotency_key_conflict',
          replayClassification: 'idempotency_key_conflict',
          message: 'conflict',
        }),
      })
      assert.equal(reusedProofPreserved.result.ok, false)
      assert.equal(reusedProofPreserved.result.stage, 'conflict')
      assert.equal(reusedProofPreserved.store.calls.delete, 0)
      assert.equal(reusedProofPreserved.session.calls.safety, 0)

      const reportThrowVisible = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload, { deleteMode: 'throws' }),
        session: makeSession({ safetyMode: 'empty' }),
        reportPayment: async () => {
          throw new Error('receipt action reporting throw')
        },
      })
      assert.equal(reportThrowVisible.result.ok, false)
      assert.equal(reportThrowVisible.result.stage, 'cleanup')
      if (reportThrowVisible.result.ok) {
        fail('Expected cleanup failure after a reporting throw.')
      }
      assert.equal(reportThrowVisible.result.code, 'BLOB_CLEANUP_FAILED')
      assert.equal(reportThrowVisible.store.calls.delete, 1)
      assert.equal('originalFailure' in reportThrowVisible.result, true)

      const deleteFailureVisible = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload, { deleteMode: 'throws' }),
        session: makeSession({ safetyMode: 'empty' }),
        reportPayment: async () => ({
          ok: false,
          stage: 'replay',
          code: 'idempotency_key_conflict',
          replayClassification: 'idempotency_key_conflict',
          message: 'conflict',
        }),
      })
      assert.equal(deleteFailureVisible.result.ok, false)
      assert.equal(deleteFailureVisible.result.stage, 'cleanup')
      if (deleteFailureVisible.result.ok) {
        fail('Expected cleanup failure when deleting the owned proof fails.')
      }
      assert.equal(deleteFailureVisible.result.code, 'BLOB_CLEANUP_FAILED')
      assert.equal(deleteFailureVisible.store.calls.delete, 1)
      assert.equal('originalFailure' in deleteFailureVisible.result, true)

      const safetyFailureVisible = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload),
        session: makeSession({ safetyMode: 'throws' }),
        reportPayment: async () => ({
          ok: false,
          stage: 'replay',
          code: 'idempotency_key_conflict',
          replayClassification: 'idempotency_key_conflict',
          message: 'conflict',
        }),
      })
      assert.equal(safetyFailureVisible.result.ok, false)
      assert.equal(safetyFailureVisible.result.stage, 'cleanup')
      if (safetyFailureVisible.result.ok) {
        fail('Expected safety-check cleanup failure.')
      }
      assert.equal(safetyFailureVisible.result.code, 'PROOF_CLEANUP_SAFETY_CHECK_FAILED')
      assert.equal(safetyFailureVisible.store.calls.delete, 0)

      const headThrowVisible = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload, { headMode: 'throws' }),
        session: makeSession(),
        reportPayment: async () => {
          fail('A headPrivate failure must stop reporting.')
        },
      })
      assert.equal(headThrowVisible.result.ok, false)
      assert.equal(headThrowVisible.result.stage, 'infrastructure')
      if (headThrowVisible.result.ok) {
        fail('Expected the headPrivate failure to be sanitized.')
      }
      assert.equal(headThrowVisible.result.code, 'PROOF_OBJECT_LOOKUP_FAILED')
      assert.equal(headThrowVisible.store.calls.delete, 0)
      assert.equal(headThrowVisible.session.calls.lock, 1)
      assert.equal(headThrowVisible.session.calls.unlock, 1)
      assert.equal(headThrowVisible.session.calls.close, 1)
      assert.equal(headThrowVisible.session.calls.safety, 0)

      const exactReplayResult = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload),
        session: makeSession({ safetyMode: 'empty' }),
        reportPayment: async () => ({
          ok: true,
          stage: 'replayed',
          simulated: false,
          publicCode: receiptPayload.publicCode,
          paymentStatus: 'payment_reported',
          replayed: true,
          message: 'Pago consolidado ya registrado.',
        }),
      })
      assert.equal(exactReplayResult.result.ok, true)
      assert.equal(exactReplayResult.result.stage, 'replayed')
      assert.equal(exactReplayResult.store.calls.delete, 0)
      assert.equal(exactReplayResult.session.calls.safety, 0)

      const reportedCleanupResult = await runProtectedReceiptFlow({
        formData: makeFormData([
          ['publicCode', submission.publicCode],
          ['paymentMethod', submission.paymentMethod],
          ['paymentReference', 'REF-700'],
          ['uploadReceipt', receiptToken],
        ]),
        authorizePaymentAccess: async () => ({ ok: true }),
        store: makeStore(receiptPayload),
        session: makeSession({ safetyMode: 'empty' }),
        reportPayment: async () => ({
          ok: true,
          stage: 'reported',
          simulated: false,
          publicCode: receiptPayload.publicCode,
          paymentStatus: 'payment_reported',
          replayed: false,
          message: 'Pago consolidado reportado correctamente.',
        }),
      })
      assert.equal(reportedCleanupResult.result.ok, true)
      assert.equal(reportedCleanupResult.result.stage, 'reported')
      assert.equal(reportedCleanupResult.store.calls.delete, 0)
      assert.equal(reportedCleanupResult.session.calls.safety, 0)

      const source = readFileSync(
        resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-action-core.ts'),
        'utf8',
      )
      assert.equal(source.includes('uploadReceipt'), true)
      assert.equal(source.includes('paymentProofFile'), false)
    },
  )

  console.log('booking_isolated_custom_bundle_payment_receipt_action OK')
  console.log('preview isolation: verified')
  console.log('private proof integration: verified')
  console.log('transactional reporting: verified')
  console.log('stable server idempotency: verified')
  console.log('exact replay: verified')
  console.log('conflict cleanup: verified')
  console.log('invalid report cleanup: verified')
  console.log('reporting exception compensation: verified')
  console.log('reused object preserved after post-upload failure: verified')
  console.log('original failure preserved: verified')
  console.log('session lifecycle: verified')
  console.log('secret-free result: verified')
  console.log('database cleanup: verified')
  console.log('storage cleanup: verified')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => fail('Unexpected failure while validating the isolated receipt action gate.', error))
}
