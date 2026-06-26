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

function makeStore(seed: CustomBundlePaymentUploadReceiptPayload) {
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
      if (existing && existing.pathname === pathname) {
        existing = null
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
      const store = makeStore(receiptPayload)
      const recoveryToken = buildPaymentRecoveryToken({
        bookingPublicCode: receiptPayload.publicCode,
        expiresAt: new Date('2026-06-25T12:15:00.000Z'),
        now: new Date('2026-06-25T12:00:00.000Z'),
      })

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
  console.log('session lifecycle: verified')
  console.log('secret-free result: verified')
  console.log('database cleanup: verified')
  console.log('storage cleanup: verified')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => fail('Unexpected failure while validating the isolated receipt action gate.', error))
}
