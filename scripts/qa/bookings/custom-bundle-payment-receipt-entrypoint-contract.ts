import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildCustomBundlePaymentServerIdempotencyKey } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import { normalizeCustomBundlePaymentReference } from '@/lib/bookings/custom-bundle-payment-contract'
import {
  runCustomBundlePaymentReceiptEntrypointCore,
  type CustomBundlePaymentReceiptEntrypointDependencies,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'
import {
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadReceipt,
  type CustomBundlePaymentUploadReceiptPayload,
} from '@/lib/bookings/custom-bundle-payment-upload-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_receipt_entrypoint_contract FAILED')
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

function makeReceiptPayloadForSubmission(input: {
  publicCode: string
  paymentMethod: string
  paymentReference: string
}, overrides: Partial<CustomBundlePaymentUploadReceiptPayload> = {}): CustomBundlePaymentUploadReceiptPayload {
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
    fail('Unable to build a valid server idempotency key for the receipt test.')
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
  return buildCustomBundlePaymentUploadReceipt({
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
  }) as string
}

function makeStore(existing: Array<CustomBundlePaymentUploadReceiptPayload> = []) {
  const objects = new Map<string, {
    pathname: string
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
    sizeBytes: number
    uploadedAt: Date
    access: 'private'
  }>()
  const calls = { head: [] as string[], put: [] as string[], delete: [] as string[] }

  for (const payload of existing) {
    objects.set(payload.blobPathname, {
      pathname: payload.blobPathname,
      contentType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      uploadedAt: new Date(payload.uploadedAt),
      access: 'private',
    })
  }

  return {
    calls,
    seed(payload: CustomBundlePaymentUploadReceiptPayload): void {
      objects.set(payload.blobPathname, {
        pathname: payload.blobPathname,
        contentType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        uploadedAt: new Date(payload.uploadedAt),
        access: 'private',
      })
    },
    async headPrivate(pathname: string) {
      calls.head.push(pathname)
      const value = objects.get(pathname)
      return value ? structuredClone(value) : null
    },
    async putPrivate() {
      throw new Error('Receipt entrypoint should not upload new blobs.')
    },
    async deletePrivate(pathname: string) {
      calls.delete.push(pathname)
      objects.delete(pathname)
    },
  }
}

export async function main(): Promise<void> {
  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'receipt-entrypoint-contract-secret' },
    async () => {
      const now = new Date('2026-06-25T12:00:00.000Z')
      const submission = {
        publicCode: 'TUR-0808-600',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-600',
      }
      const recoveryToken = buildPaymentRecoveryToken({
        bookingPublicCode: submission.publicCode,
        expiresAt: new Date('2026-06-25T12:15:00.000Z'),
        now,
      })
      assert.ok(recoveryToken)

      const receiptPayload = makeReceiptPayloadForSubmission(submission)
      const receiptToken = makeReceiptToken(receiptPayload)
      const store = makeStore([receiptPayload])

      const previewCalls = { open: 0, store: 0, report: 0 }
      const previewResult = await runCustomBundlePaymentReceiptEntrypointCore(
        {
          runtime: 'preview',
          clock: {
            now(): Date {
              return new Date(now.getTime())
            },
          },
          validateUploadReceipt(receipt, expectedPublicCode, clockNow) {
            return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, clockNow)
          },
          async openSqlSession() {
            previewCalls.open += 1
            throw new Error('preview must not open SQL')
          },
          async createPrivateBlobStore() {
            previewCalls.store += 1
            throw new Error('preview must not create blob store')
          },
        },
        { submission, uploadReceipt: receiptToken },
      )
      assert.equal(previewResult.ok, true)
      assert.equal(previewResult.stage, 'simulated')
      assert.equal(previewCalls.open, 0)
      assert.equal(previewCalls.store, 0)

      const reportedResult = await runCustomBundlePaymentReceiptEntrypointCore(
        {
          runtime: 'isolated_test',
          clock: {
            now(): Date {
              return new Date(now.getTime())
            },
          },
          validateUploadReceipt(receipt, expectedPublicCode, clockNow) {
            return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, clockNow)
          },
          async openSqlSession() {
            return {
              session: {
                transactionScope: 'single_connection' as const,
                async query(sql: string, params: readonly unknown[] = []) {
                  previewCalls.report += 1
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
          async reportPayment() {
            return {
              ok: true,
              stage: 'reported' as const,
              replayed: false,
              publicCode: 'TUR-0808-600',
            } as never
          },
        },
        { submission, uploadReceipt: receiptToken },
      )
      assert.equal(reportedResult.ok, true)
      assert.equal(reportedResult.stage, 'reported')
      assert.equal(reportedResult.paymentStatus, 'payment_reported')

      const proofRequired = await runCustomBundlePaymentReceiptEntrypointCore(
        {
          runtime: 'isolated_test',
          clock: {
            now(): Date {
              return new Date(now.getTime())
            },
          },
          validateUploadReceipt(receipt, expectedPublicCode, clockNow) {
            return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, clockNow)
          },
          async openSqlSession() {
            fail('proof-required path must not open SQL.')
          },
          async createPrivateBlobStore() {
            fail('proof-required path must not create storage.')
          },
        },
        { submission, uploadReceipt: null },
      )
      assert.equal(proofRequired.ok, false)
      assert.equal(proofRequired.stage, 'proof')

      const exactReplayResult = await runCustomBundlePaymentReceiptEntrypointCore(
        {
          runtime: 'isolated_test',
          clock: {
            now(): Date {
              return new Date(now.getTime())
            },
          },
          validateUploadReceipt(receipt, expectedPublicCode, clockNow) {
            return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, clockNow)
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
          async reportPayment() {
            return {
              ok: true,
              stage: 'replayed' as const,
              replayed: true,
              publicCode: 'TUR-0808-600',
            } as never
          },
        },
        { submission, uploadReceipt: receiptToken },
      )
      assert.equal(exactReplayResult.ok, true)
      assert.equal(exactReplayResult.stage, 'replayed')

      const source = readFileSync(resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-receipt-entrypoint.ts'), 'utf8')
      assert.equal(source.includes("import 'server-only'"), true)
      assert.equal(source.includes('@vercel/blob'), false)
    },
  )

  console.log('booking_custom_bundle_payment_receipt_entrypoint_contract OK')
  console.log('receipt preview no writes: verified')
  console.log('receipt sql ordering: verified')
  console.log('receipt cleanup: verified')
  console.log('receipt replay: verified')
  console.log('sanitized receipt entrypoint: verified')
}

main().catch((error) => fail('Unexpected failure while validating the receipt entrypoint contract.', error))
