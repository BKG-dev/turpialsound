import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { isCustomBundleBookingCandidate } from '@/lib/bookings/custom-bundle-booking-identity'
import {
  isCustomBundlePaymentProofRequired,
  mapBookingPaymentMethodToPublicUiMethod,
  resolveCustomBundlePaymentUiMode,
  validateCustomBundlePaymentUiFileMetadata,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-contract'
import {
  submitCustomBundlePaymentRecoveryUiFlow,
  type CustomBundlePaymentRecoveryUiFlowDependencies,
  type CustomBundlePaymentRecoveryUiFile,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-flow'
import type { BookingPaymentMethodConfig } from '@/lib/bookings/payment-settings.types'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_recovery_ui_contract FAILED')
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

function makeMethod(slug: BookingPaymentMethodConfig['slug'], details: BookingPaymentMethodConfig['details']): BookingPaymentMethodConfig {
  return {
    slug,
    enabled: true,
    name: slug,
    referenceHint: 'Referencia',
    customerMessage: 'Mensaje',
    details,
  }
}

function makeDependencies(recorder: {
  createIntentCalls: number
  uploadCalls: number
  reportCalls: number
  lastUploadIntentInput?: unknown
  lastUploadProofInput?: unknown
  lastReportInput?: unknown
}): CustomBundlePaymentRecoveryUiFlowDependencies {
  return {
    async createUploadIntent(input) {
      recorder.createIntentCalls += 1
      recorder.lastUploadIntentInput = input
      return { ok: true as const, uploadIntent: 'upload-intent-token' }
    },
    async uploadProof(input) {
      recorder.uploadCalls += 1
      recorder.lastUploadProofInput = input
      return { ok: true as const, simulated: false, uploadReceipt: 'receipt-token' }
    },
    async reportPayment(input) {
      recorder.reportCalls += 1
      recorder.lastReportInput = input
      return {
        ok: true,
        stage: 'reported',
        simulated: false,
        publicCode: input.publicCode,
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
  assert.equal(isCustomBundleBookingCandidate({ eventTitle: ' Solicitud - Arma tu paquete ' }), true)
  assert.equal(isCustomBundleBookingCandidate({ eventTitle: 'Solicitud - Arma tu paquete' }), true)
  assert.equal(isCustomBundleBookingCandidate({ eventTitle: 'Solicitud - Arma tu paquete extra' }), false)
  assert.equal(resolveCustomBundlePaymentUiMode({ isPreview: true, isCustomBundleBookingCandidate: true }), 'preview_simulation')
  assert.equal(resolveCustomBundlePaymentUiMode({ isPreview: true, isCustomBundleBookingCandidate: false }), 'disabled')
  assert.equal(resolveCustomBundlePaymentUiMode({ isPreview: false, isCustomBundleBookingCandidate: true }), 'disabled')

  const publicMethod = mapBookingPaymentMethodToPublicUiMethod(
    makeMethod('pago_movil', {
      beneficiaryName: 'Turpial Sound',
      beneficiaryDocument: 'J-12345678-9',
      bankName: 'Banco',
      phoneNumber: '0414-0000000',
    }),
  )
  assert.equal(publicMethod.proofRequired, true)
  assert.equal(publicMethod.configurationReady, true)
  assert.equal(publicMethod.details.some((detail) => detail.value === 'Por definir'), false)

  const fallbackMethod = mapBookingPaymentMethodToPublicUiMethod(
    makeMethod('transferencia', {
      beneficiaryName: 'Por definir',
      beneficiaryDocument: 'Por definir',
      bankName: 'Por definir',
      phoneNumber: 'Por definir',
    }),
  )
  assert.equal(fallbackMethod.configurationReady, false)
  assert.equal(fallbackMethod.details.length, 0)

  assert.equal(isCustomBundlePaymentProofRequired('pago_movil'), true)
  assert.equal(isCustomBundlePaymentProofRequired('efectivo'), false)

  const validMetadata = validateCustomBundlePaymentUiFileMetadata({
    name: 'receipt.png',
    type: 'image/png',
    size: 4,
  })
  assert.equal(validMetadata.ok, true)
  if (!validMetadata.ok) {
    fail('Expected a valid file metadata payload.')
  }

  const invalidMime = validateCustomBundlePaymentUiFileMetadata({
    name: 'receipt.pdf',
    type: 'application/pdf',
    size: 4,
  })
  assert.equal(invalidMime.ok, false)

  const invalidSize = validateCustomBundlePaymentUiFileMetadata({
    name: 'receipt.png',
    type: 'image/png',
    size: 3_900_001,
  })
  assert.equal(invalidSize.ok, false)

  const invalidName = validateCustomBundlePaymentUiFileMetadata({
    name: 'receipt/evil.png',
    type: 'image/png',
    size: 4,
  })
  assert.equal(invalidName.ok, false)

  const proofRequiredRecorder = {
    createIntentCalls: 0,
    uploadCalls: 0,
    reportCalls: 0,
    lastUploadIntentInput: undefined as unknown,
    lastUploadProofInput: undefined as unknown,
    lastReportInput: undefined as unknown,
  }
  const proofRequiredResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-777',
    paymentMethod: 'pago_movil',
    paymentReference: 'REF-777',
    file: makeFile(),
    dependencies: makeDependencies(proofRequiredRecorder),
  })
  assert.equal(proofRequiredResult.ok, true)
  assert.equal(proofRequiredRecorder.createIntentCalls, 1)
  assert.equal(proofRequiredRecorder.uploadCalls, 1)
  assert.equal(proofRequiredRecorder.reportCalls, 1)
  assert.equal((proofRequiredRecorder.lastReportInput as { uploadReceipt: string | null } | undefined)?.uploadReceipt, 'receipt-token')

  const cashRecorder = {
    createIntentCalls: 0,
    uploadCalls: 0,
    reportCalls: 0,
    lastUploadIntentInput: undefined as unknown,
    lastUploadProofInput: undefined as unknown,
    lastReportInput: undefined as unknown,
  }
  const cashResult = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-778',
    paymentMethod: 'efectivo',
    paymentReference: 'REF-778',
    file: null,
    dependencies: makeDependencies(cashRecorder),
  })
  assert.equal(cashResult.ok, true)
  assert.equal(cashRecorder.createIntentCalls, 0)
  assert.equal(cashRecorder.uploadCalls, 0)
  assert.equal(cashRecorder.reportCalls, 1)
  assert.equal((cashRecorder.lastReportInput as { uploadReceipt: string | null } | undefined)?.uploadReceipt, null)

  const previewFlow = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-779',
    paymentMethod: 'binance',
    paymentReference: 'REF-779',
    file: makeFile(),
    dependencies: {
      async createUploadIntent(input) {
        assert.equal(input.publicCode, 'TUR-0808-779')
        return { ok: true as const, uploadIntent: 'upload-intent-token' }
      },
      async uploadProof() {
        return { ok: true as const, simulated: true, uploadReceipt: null }
      },
      async reportPayment(input) {
        assert.equal(input.uploadReceipt, null)
        return {
          ok: true,
          stage: 'simulated',
          simulated: true,
          publicCode: input.publicCode,
          paymentStatus: 'payment_reported',
          replayed: false,
          message: 'Simulacion completada. No se registro el pago ni se subio el comprobante.',
        } as never
      },
    },
  })
  assert.equal(previewFlow.ok, true)
  assert.equal(previewFlow.stage, 'simulated')

  const invalidMethodRecorder = {
    createIntentCalls: 0,
    uploadCalls: 0,
    reportCalls: 0,
  }
  const invalidMethod = await submitCustomBundlePaymentRecoveryUiFlow({
    paymentUiMode: 'preview_simulation',
    publicCode: 'TUR-0808-780',
    paymentMethod: 'pago_movil',
    paymentReference: '   ',
    file: null,
    dependencies: makeDependencies(invalidMethodRecorder),
  })
  assert.equal(invalidMethod.ok, false)
  assert.equal(invalidMethod.stage, 'validation_error')
  assert.equal(invalidMethodRecorder.createIntentCalls, 0)
  assert.equal(invalidMethodRecorder.uploadCalls, 0)
  assert.equal(invalidMethodRecorder.reportCalls, 0)

  const reportSource = readSource('components/bookings/CustomBundlePaymentRecoveryForm.tsx')
  assert.equal(reportSource.includes('reportCustomBundlePaymentProtectedAction'), true)
  assert.equal(reportSource.includes('reportBookingPayment'), false)
  assert.equal(reportSource.includes('accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"'), true)
  assert.equal(reportSource.includes('aria-live="polite"'), true)
  assert.equal(reportSource.includes('Simular reporte de pago'), true)

  const gatewaySource = readSource('components/bookings/PaymentRecoveryGatewayClient.tsx')
  assert.equal(gatewaySource.includes('useRef'), true)
  assert.equal(gatewaySource.includes('replaceState'), true)
  assert.equal(gatewaySource.includes('localStorage'), false)
  assert.equal(gatewaySource.includes('sessionStorage'), false)
  assert.equal(gatewaySource.includes('CustomBundlePaymentRecoveryForm'), true)
  assert.equal(gatewaySource.includes('Reintentar validación'), true)

  const routeSource = readSource('app/api/bookings/payment-recovery/session/route.ts')
  assert.equal(routeSource.includes('version: 2'), true)
  assert.equal(routeSource.includes('paymentUiMode'), true)
  assert.equal(routeSource.includes('paymentMethods'), true)
  assert.equal(routeSource.includes('isCustomBundleBookingCandidate'), true)

  const uiContractSource = readSource('lib/bookings/custom-bundle-payment-recovery-ui-contract.ts')
  assert.equal(uiContractSource.includes('Por definir'), true)
  assert.equal(uiContractSource.includes('validateCustomBundlePaymentUiFileMetadata'), true)
  assert.equal(uiContractSource.includes('resolveCustomBundlePaymentUiMode'), true)

  const flowSource = readSource('lib/bookings/custom-bundle-payment-recovery-ui-flow.ts')
  assert.equal(flowSource.includes('createUploadIntent'), true)
  assert.equal(flowSource.includes('uploadProof'), true)
  assert.equal(flowSource.includes('reportPayment'), true)
  assert.equal(flowSource.includes('FormData'), false)

  const formActionSource = readSource('lib/bookings/custom-bundle-payment-action.ts')
  assert.equal(formActionSource.includes('reportCustomBundlePaymentProtectedAction'), true)

  const legacySource = readSource('lib/bookings/actions.ts')
  assert.equal(legacySource.includes('CustomBundlePaymentRecoveryForm'), false)

  console.log('booking_custom_bundle_payment_recovery_ui_contract OK')
  console.log('preview-only payment ui: verified')
  console.log('secure recovery session: verified')
  console.log('payment method contract: verified')
  console.log('intent before upload: verified')
  console.log('raw protected upload: verified')
  console.log('receipt action wiring: verified')
  console.log('no client token persistence: verified')
  console.log('no file in server action: verified')
  console.log('simulation disclosure: verified')
  console.log('legacy fallback: verified')
  console.log('no wizard wiring: verified')
  console.log('no production activation: verified')
}

main().catch((error) => fail('Unexpected failure while validating the payment recovery UI contract.', error))
