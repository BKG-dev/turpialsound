import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { shouldClearInitialRecoveryToken } from '@/lib/bookings/custom-bundle-payment-recovery-client-session'
import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES,
} from '@/lib/bookings/custom-bundle-payment-proof-constants'
import {
  submitCustomBundlePaymentRecoveryUiFlow,
  type CustomBundlePaymentRecoveryUiFlowDependencies,
  type CustomBundlePaymentRecoveryUiFile,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-flow'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_recovery_ui_hardening_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function makeFile(overrides: Partial<CustomBundlePaymentRecoveryUiFile> = {}): CustomBundlePaymentRecoveryUiFile {
  return {
    name: 'receipt.png',
    type: 'image/png',
    size: 4,
    value: new File([new Uint8Array([1, 2, 3, 4])], 'receipt.png', { type: 'image/png' }),
    ...overrides,
  }
}

function makeDependencies(recorder: {
  createIntentCalls: number
  uploadCalls: number
  reportCalls: number
}): CustomBundlePaymentRecoveryUiFlowDependencies {
  return {
    async createUploadIntent() {
      recorder.createIntentCalls += 1
      return { ok: true as const, uploadIntent: 'upload-intent-token' }
    },
    async uploadProof() {
      recorder.uploadCalls += 1
      return { ok: true as const, simulated: false, uploadReceipt: 'receipt-token' }
    },
    async reportPayment() {
      recorder.reportCalls += 1
      return {
        ok: true,
        stage: 'reported',
        simulated: false,
        publicCode: 'TUR-0808-880',
        paymentStatus: 'payment_reported',
        replayed: false,
        message: 'Pago consolidado reportado correctamente.',
      } as never
    },
  }
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

async function main(): Promise<void> {
  const disabledRecorder = { createIntentCalls: 0, uploadCalls: 0, reportCalls: 0 }
  const disabledResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'disabled',
    publicCode: 'TUR-0808-880',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-DISABLED',
    file: makeFile(),
    dependencies: makeDependencies(disabledRecorder),
  })
  assert.equal(disabledResult.ok, false)
  assert.equal(disabledResult.stage, 'validation_error')
  assert.equal(disabledResult.code, 'PAYMENT_UI_DISABLED')
  assert.equal(disabledRecorder.createIntentCalls, 0)
  assert.equal(disabledRecorder.uploadCalls, 0)
  assert.equal(disabledRecorder.reportCalls, 0)

  const unknownModeResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'bogus' as never,
    publicCode: 'TUR-0808-880',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-UNKNOWN',
    file: null,
    dependencies: makeDependencies({ createIntentCalls: 0, uploadCalls: 0, reportCalls: 0 }),
  })
  assert.equal(unknownModeResult.ok, false)
  assert.equal(unknownModeResult.code, 'INVALID_PAYMENT_UI_MODE')

  const previewRecorder = { createIntentCalls: 0, uploadCalls: 0, reportCalls: 0 }
  const previewResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-881',
    paymentMethod: 'efectivo',
    paymentReference: 'REF-PREVIEW',
    file: null,
    dependencies: makeDependencies(previewRecorder),
  })
  assert.equal(previewResult.ok, true)
  assert.equal(previewRecorder.createIntentCalls, 0)
  assert.equal(previewRecorder.uploadCalls, 0)
  assert.equal(previewRecorder.reportCalls, 1)

  assert.equal(
    shouldClearInitialRecoveryToken({
      responseOk: false,
      responseState: null,
      hasValidPendingSession: false,
    }),
    false,
  )
  assert.equal(
    shouldClearInitialRecoveryToken({
      responseOk: true,
      responseState: null,
      hasValidPendingSession: false,
    }),
    false,
  )
  assert.equal(
    shouldClearInitialRecoveryToken({
      responseOk: true,
      responseState: 'pending_payment',
      hasValidPendingSession: false,
    }),
    false,
  )
  assert.equal(
    shouldClearInitialRecoveryToken({
      responseOk: true,
      responseState: 'pending_payment',
      hasValidPendingSession: true,
    }),
    true,
  )
  assert.equal(
    shouldClearInitialRecoveryToken({
      responseOk: true,
      responseState: 'invalid_link',
      hasValidPendingSession: false,
    }),
    true,
  )
  for (const terminalState of [
    'payment_reported',
    'confirmed',
    'expired',
    'cancelled',
    'not_found',
    'unavailable',
  ] as const) {
    assert.equal(
      shouldClearInitialRecoveryToken({
        responseOk: true,
        responseState: terminalState,
        hasValidPendingSession: false,
      }),
      true,
    )
  }

  const transientFailureResult = shouldClearInitialRecoveryToken({
    responseOk: false,
    responseState: 'payment_reported',
    hasValidPendingSession: false,
  })
  assert.equal(transientFailureResult, false)

  const dependencyFailureResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-882',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-882',
    file: makeFile(),
    dependencies: {
      async createUploadIntent() {
        throw new Error('boom')
      },
      async uploadProof() {
        return { ok: true as const, simulated: false, uploadReceipt: 'receipt-token' }
      },
      async reportPayment() {
        return {
          ok: true,
          stage: 'reported',
          simulated: false,
          publicCode: 'TUR-0808-882',
          paymentStatus: 'payment_reported',
          replayed: false,
          message: 'Pago consolidado reportado correctamente.',
        } as never
      },
    },
  })
  assert.equal(dependencyFailureResult.ok, false)
  assert.equal(dependencyFailureResult.stage, 'upload_error')
  assert.equal(dependencyFailureResult.code, 'UPLOAD_INTENT_REQUEST_FAILED')

  const uploadFailureResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-883',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-883',
    file: makeFile(),
    dependencies: {
      async createUploadIntent() {
        return { ok: true as const, uploadIntent: 'upload-intent-token' }
      },
      async uploadProof() {
        throw new Error('boom')
      },
      async reportPayment() {
        return {
          ok: true,
          stage: 'reported',
          simulated: false,
          publicCode: 'TUR-0808-883',
          paymentStatus: 'payment_reported',
          replayed: false,
          message: 'Pago consolidado reportado correctamente.',
        } as never
      },
    },
  })
  assert.equal(uploadFailureResult.ok, false)
  assert.equal(uploadFailureResult.stage, 'upload_error')
  assert.equal(uploadFailureResult.code, 'PROOF_UPLOAD_REQUEST_FAILED')

  const actionFailureResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-884',
    paymentMethod: 'efectivo',
    paymentReference: 'REF-884',
    file: null,
    dependencies: {
      async createUploadIntent() {
        return { ok: true as const, uploadIntent: 'upload-intent-token' }
      },
      async uploadProof() {
        return { ok: true as const, simulated: false, uploadReceipt: 'receipt-token' }
      },
      async reportPayment() {
        throw new Error('boom')
      },
    },
  })
  assert.equal(actionFailureResult.ok, false)
  assert.equal(actionFailureResult.stage, 'action_error')
  assert.equal(actionFailureResult.code, 'PAYMENT_REPORT_REQUEST_FAILED')

  const flowSource = readSource('lib/bookings/custom-bundle-payment-recovery-ui-flow.ts')
  assert.equal(flowSource.includes('PAYMENT_UI_DISABLED'), true)
  assert.equal(flowSource.includes('UPLOAD_INTENT_REQUEST_FAILED'), true)
  assert.equal(flowSource.includes('PROOF_UPLOAD_REQUEST_FAILED'), true)
  assert.equal(flowSource.includes('PAYMENT_REPORT_REQUEST_FAILED'), true)
  assert.equal(flowSource.includes('error.message'), false)

  const formSource = readSource('components/bookings/CustomBundlePaymentRecoveryForm.tsx')
  assert.equal(formSource.includes('La interfaz de reporte de pago no esta habilitada en este entorno.'), true)
  assert.equal(formSource.includes('No pudimos completar la simulacion del pago. Revisa tu conexion e intenta nuevamente.'), true)
  assert.equal(formSource.includes('error.message'), false)

  const contractSource = readSource('lib/bookings/custom-bundle-payment-contract.ts')
  const proofConstantsSource = readSource('lib/bookings/custom-bundle-payment-proof-constants.ts')
  assert.equal(contractSource.includes("from '@/lib/bookings/custom-bundle-payment-proof-constants'"), true)
  assert.equal(contractSource.includes('CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES = 3_900_000'), false)
  assert.equal(contractSource.includes('CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES = ['), false)
  assert.equal(proofConstantsSource.includes('CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES = 3_900_000'), true)
  assert.equal(proofConstantsSource.includes('image/avif'), true)

  const gatewaySource = readSource('components/bookings/PaymentRecoveryGatewayClient.tsx')
  assert.equal(gatewaySource.includes('shouldClearInitialRecoveryToken'), true)
  assert.equal(gatewaySource.includes('localStorage'), false)
  assert.equal(gatewaySource.includes('sessionStorage'), false)
  assert.equal(gatewaySource.includes('wizard'), false)

  const uiContractSource = readSource('lib/bookings/custom-bundle-payment-recovery-ui-contract.ts')
  assert.equal(uiContractSource.includes('resolveCustomBundlePaymentUiMode'), true)
  assert.equal(uiContractSource.includes('validateCustomBundlePaymentUiFileMetadata'), true)
  assert.equal(flowSource.includes('production'), false)

  assert.equal(readSource('components/bookings/CustomBundlePaymentRecoveryForm.tsx').includes('reportBookingPayment'), false)
  assert.equal(readSource('lib/bookings/actions.ts').includes('CustomBundlePaymentRecoveryForm'), false)

  console.log('booking_custom_bundle_payment_recovery_ui_hardening_contract OK')
  console.log('disabled ui mode: blocked')
  console.log('zero disabled infrastructure: verified')
  console.log('transient token retention: verified')
  console.log('retry token reuse: verified')
  console.log('trusted token clearing: verified')
  console.log('single proof constants source: verified')
  console.log('dependency exceptions sanitized: verified')
  console.log('raw client errors blocked: verified')
  console.log('no production activation: verified')
  console.log('no wizard wiring: verified')
}

main().catch((error) => fail('Unexpected failure while validating the payment recovery UI hardening contract.', error))
