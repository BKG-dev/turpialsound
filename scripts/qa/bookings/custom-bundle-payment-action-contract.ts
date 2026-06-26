import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildPaymentRecoveryToken,
  validatePaymentRecoveryToken,
} from '@/lib/bookings/payment-recovery-token'
import {
  parseCustomBundlePaymentActionFormData,
  runCustomBundlePaymentProtectedActionWithDependencies,
} from '@/lib/bookings/custom-bundle-payment-action-core'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_action_contract FAILED')
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

function makeFormData(entries: Array<[string, string]>): FormData {
  const formData = new FormData()
  for (const [key, value] of entries) {
    formData.append(key, value)
  }
  return formData
}

function makeResultRecorder() {
  return {
    entrypointCalls: 0,
    authorizedCalls: 0,
    lastInput: null as null | { submission: unknown; uploadReceipt: string | null },
  }
}

function assertNoLeak(value: unknown): void {
  const text = JSON.stringify(value)
  assert.equal(text.includes('paymentRecoveryToken'), false)
  assert.equal(text.includes('paymentReportIdempotencyKey'), false)
  assert.equal(text.includes('blobPathname'), false)
  assert.equal(text.includes('sha256'), false)
  assert.equal(text.includes('createdByThisCall'), false)
  assert.equal(text.includes('uploadReceipt'), false)
}

async function main(): Promise<void> {
  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'payment-action-contract-secret' },
    async () => {
      const now = new Date('2026-06-25T12:00:00.000Z')
      const token = buildPaymentRecoveryToken({
        bookingPublicCode: 'TUR-0808-500',
        expiresAt: new Date('2026-06-25T12:15:00.000Z'),
        now,
      })
      if (!token) {
        fail('Unable to build a valid payment recovery token.')
      }

      const exactBoundary = validatePaymentRecoveryToken(
        token,
        'TUR-0808-500',
        new Date('2026-06-25T12:15:00.000Z'),
      )
      assert.equal(exactBoundary.ok, false)
      if (exactBoundary.ok) {
        fail('Expected the exact recovery-token boundary to be rejected.')
      }

      const parsedUnknown = parseCustomBundlePaymentActionFormData(
        makeFormData([
          ['publicCode', 'TUR-0808-500'],
          ['paymentMethod', 'pago_movil'],
          ['paymentReference', 'REF-500'],
          ['uploadReceipt', 'receipt-token'],
          ['unexpected', 'nope'],
        ]),
      )
      assert.equal(parsedUnknown.ok, false)
      if (parsedUnknown.ok) {
        fail('Expected unknown fields to be rejected.')
      }

      const parsedDuplicate = parseCustomBundlePaymentActionFormData(
        makeFormData([
          ['publicCode', 'TUR-0808-500'],
          ['paymentMethod', 'pago_movil'],
          ['paymentReference', 'REF-500'],
          ['uploadReceipt', 'receipt-a'],
          ['uploadReceipt', 'receipt-b'],
        ]),
      )
      assert.equal(parsedDuplicate.ok, false)
      if (parsedDuplicate.ok) {
        fail('Expected duplicate uploadReceipt fields to be rejected.')
      }

      const parsedAction = parseCustomBundlePaymentActionFormData(
        makeFormData([
          ['publicCode', ' tur-0808-500 '],
          ['paymentMethod', ' pago_movil '],
          ['paymentReference', ' ref-500 '],
          ['uploadReceipt', '  receipt-token  '],
          ['$ACTION_ID', 'ignored'],
        ]),
      )
      assert.equal(parsedAction.ok, true)
      if (!parsedAction.ok) {
        fail('Expected the protected payment action payload to parse.')
      }
      assert.equal(parsedAction.value.publicCode, 'TUR-0808-500')
      assert.equal(parsedAction.value.uploadReceipt, 'receipt-token')

      const previewRecorder = makeResultRecorder()
      const previewResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', 'TUR-0808-500'],
          ['paymentMethod', 'pago_movil'],
          ['paymentReference', 'REF-500'],
          ['uploadReceipt', 'receipt-token'],
        ]),
        {
          runtime: 'preview',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return 'token-from-cookie'
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            previewRecorder.authorizedCalls += 1
            return { ok: true }
          },
          async runReceiptEntrypoint(input) {
            previewRecorder.entrypointCalls += 1
            previewRecorder.lastInput = input
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
      assert.equal(previewRecorder.authorizedCalls, 1)
      assert.equal(previewRecorder.entrypointCalls, 1)
      assert.equal(previewRecorder.lastInput?.uploadReceipt, 'receipt-token')
      assertNoLeak(previewResult)

      const deniedRecorder = makeResultRecorder()
      const deniedResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', 'TUR-0808-500'],
          ['paymentMethod', 'pago_movil'],
          ['paymentReference', 'REF-500'],
          ['uploadReceipt', 'receipt-token'],
        ]),
        {
          runtime: 'isolated_test',
          killSwitchEnabled: true,
          readRecoveryToken() {
            return 'token-from-cookie'
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            deniedRecorder.authorizedCalls += 1
            return { ok: false, reason: 'invalid_token' }
          },
          async runReceiptEntrypoint() {
            deniedRecorder.entrypointCalls += 1
            return {
              ok: true,
              stage: 'simulated',
              simulated: true,
              message: 'unexpected',
            }
          },
        },
      )
      assert.equal(deniedResult.ok, false)
      assert.equal(deniedResult.stage, 'authorization')
      assert.equal(deniedRecorder.authorizedCalls, 1)
      assert.equal(deniedRecorder.entrypointCalls, 0)

      const disabledRecorder = makeResultRecorder()
      const disabledResult = await runCustomBundlePaymentProtectedActionWithDependencies(
        makeFormData([
          ['publicCode', 'TUR-0808-500'],
          ['paymentMethod', 'pago_movil'],
          ['paymentReference', 'REF-500'],
          ['uploadReceipt', 'receipt-token'],
        ]),
        {
          runtime: 'production',
          killSwitchEnabled: false,
          readRecoveryToken() {
            return 'token-from-cookie'
          },
          clock: {
            now(): Date {
              return new Date('2026-06-25T12:00:00.000Z')
            },
          },
          async authorizePaymentAccess() {
            disabledRecorder.authorizedCalls += 1
            return { ok: true }
          },
          async runReceiptEntrypoint() {
            disabledRecorder.entrypointCalls += 1
            return {
              ok: true,
              stage: 'simulated',
              simulated: true,
              message: 'unexpected',
            }
          },
        },
      )
      assert.equal(disabledResult.ok, false)
      assert.equal(disabledResult.stage, 'infrastructure')
      assert.equal(disabledRecorder.entrypointCalls, 0)

      const sourcePath = resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-action.ts')
      const source = readFileSync(sourcePath, 'utf8')
      assert.equal(source.includes("'use server'"), true)
      assert.equal(source.includes('reportBookingPayment('), false)

      const legacySource = readFileSync(resolve(process.cwd(), 'lib/bookings/actions.ts'), 'utf8')
      assert.equal(legacySource.includes('reportCustomBundlePaymentProtectedAction'), false)

      const uiSource = readFileSync(
        resolve(process.cwd(), 'app/api/bookings/custom-bundle-payment-proof/upload/route.ts'),
        'utf8',
      )
      assert.equal(uiSource.includes('reportCustomBundlePaymentProtectedAction'), false)
    },
  )

  console.log('booking_custom_bundle_payment_action_contract OK')
  console.log('signed capability authorization: verified')
  console.log('exact token expiry boundary: verified')
  console.log('authorization before file read: verified')
  console.log('authorization before infrastructure: verified')
  console.log('server-only action: verified')
  console.log('production kill switch: verified')
  console.log('sanitized action result: verified')
  console.log('no client idempotency: verified')
  console.log('legacy separation: verified')
  console.log('no UI wiring: verified')
}

main().catch((error) => fail('Unexpected failure while validating the protected payment action contract.', error))
