import type { CustomBundleProtectedPaymentActionResult } from '@/lib/bookings/custom-bundle-payment-action-core'
import {
  isCustomBundlePaymentProofRequired,
  validateCustomBundlePaymentUiFileMetadata,
  type CustomBundlePaymentRecoveryUiMode,
} from '@/lib/bookings/custom-bundle-payment-recovery-ui-contract'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'

export interface CustomBundlePaymentRecoveryUiFile {
  name: string
  type: string
  size: number
  value: unknown
}

export interface CustomBundlePaymentRecoveryUiFlowDependencies {
  createUploadIntent(input: {
    publicCode: string
    paymentMethod: BookingPaymentMethodSlug
    paymentReference: string
    originalFilename: string
    declaredMimeType: string
    declaredSizeBytes: number
  }): Promise<
    | { ok: true; uploadIntent: string }
    | { ok: false; code: string; message: string }
  >

  uploadProof(input: {
    uploadIntent: string
    file: CustomBundlePaymentRecoveryUiFile
  }): Promise<
    | {
        ok: true
        simulated: boolean
        uploadReceipt: string | null
      }
    | {
        ok: false
        code: string
        message: string
      }
  >

  reportPayment(input: {
    publicCode: string
    paymentMethod: BookingPaymentMethodSlug
    paymentReference: string
    uploadReceipt: string | null
  }): Promise<CustomBundleProtectedPaymentActionResult>
}

export type CustomBundlePaymentRecoveryUiFlowResult =
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
      message: string
    }
  | {
      ok: false
      stage: 'validation_error' | 'upload_error' | 'action_error' | 'authorization_error'
      code: string
      message: string
      fieldIssues?: Array<{
        code: string
        path?: Array<string | number>
        message: string
      }>
    }

function isValidPublicCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function normalizePaymentReference(value: string): string {
  return value.trim()
}

function makeFailure(
  stage: Extract<CustomBundlePaymentRecoveryUiFlowResult, { ok: false }>['stage'],
  code: string,
  message: string,
  fieldIssues?: Array<{ code: string; path?: Array<string | number>; message: string }>,
): Extract<CustomBundlePaymentRecoveryUiFlowResult, { ok: false }> {
  return fieldIssues && fieldIssues.length > 0
    ? { ok: false, stage, code, message, fieldIssues }
    : { ok: false, stage, code, message }
}

function mapActionResult(result: CustomBundleProtectedPaymentActionResult): CustomBundlePaymentRecoveryUiFlowResult {
  if (result.ok) {
    if (result.stage === 'simulated') {
      return {
        ok: true,
        stage: 'simulated',
        simulated: true,
        message: result.message,
      }
    }

    return {
      ok: true,
      stage: result.stage,
      simulated: false,
      message:
        result.stage === 'replayed'
          ? 'El pago ya habia sido reportado.'
          : 'El pago fue reportado correctamente.',
    }
  }

  if (result.stage === 'authorization') {
    return makeFailure('authorization_error', result.code, result.message)
  }

  const fieldIssues = 'fieldIssues' in result ? result.fieldIssues : undefined
  if (result.stage === 'request' || result.stage === 'proof') {
    return makeFailure('validation_error', result.code, result.message, fieldIssues)
  }

  return makeFailure('action_error', result.code, result.message, fieldIssues)
}

export async function submitCustomBundlePaymentRecoveryUiFlow(input: {
  paymentUiMode: CustomBundlePaymentRecoveryUiMode
  publicCode: string
  paymentMethod: BookingPaymentMethodSlug
  paymentReference: string
  file: CustomBundlePaymentRecoveryUiFile | null
  dependencies: CustomBundlePaymentRecoveryUiFlowDependencies
}): Promise<CustomBundlePaymentRecoveryUiFlowResult> {
  if (input.paymentUiMode !== 'preview_simulation' && input.paymentUiMode !== 'disabled') {
    return makeFailure('validation_error', 'INVALID_PAYMENT_UI_MODE', 'El modo de la interfaz de pago no es valido.')
  }

  const publicCode = input.publicCode.trim().toUpperCase()
  if (!isValidPublicCode(publicCode)) {
    return makeFailure(
      'validation_error',
      'INVALID_PUBLIC_CODE',
      'No pudimos validar el codigo publico para continuar.',
    )
  }

  if (!['pago_movil', 'transferencia', 'binance', 'efectivo'].includes(input.paymentMethod)) {
    return makeFailure(
      'validation_error',
      'INVALID_PAYMENT_METHOD',
      'No pudimos validar el metodo de pago para continuar.',
    )
  }

  const paymentReference = normalizePaymentReference(input.paymentReference)
  if (paymentReference.length === 0 || paymentReference.length > 120) {
    return makeFailure(
      'validation_error',
      'INVALID_PAYMENT_REFERENCE',
      'No pudimos validar la referencia para continuar.',
    )
  }

  const proofRequired = isCustomBundlePaymentProofRequired(input.paymentMethod)
  const fileResult = input.file
    ? validateCustomBundlePaymentUiFileMetadata({
        name: input.file.name,
        type: input.file.type,
        size: input.file.size,
      })
    : null

  if (proofRequired && !input.file) {
    return makeFailure(
      'validation_error',
      'FILE_REQUIRED',
      'Este metodo de pago requiere un comprobante.',
    )
  }

  if (input.file && !fileResult?.ok) {
    return makeFailure(
      'validation_error',
      fileResult?.issues[0]?.code ?? 'INVALID_FILE',
      'El archivo seleccionado no es valido.',
      fileResult?.issues,
    )
  }

  let uploadReceipt: string | null = null

  if (input.file) {
    if (!fileResult?.ok) {
      return makeFailure(
        'validation_error',
        'INVALID_FILE',
        'El archivo seleccionado no es valido.',
      )
    }

    const createIntentResult = await input.dependencies.createUploadIntent({
      publicCode,
      paymentMethod: input.paymentMethod,
      paymentReference,
      originalFilename: fileResult.value.name,
      declaredMimeType: fileResult.value.type,
      declaredSizeBytes: fileResult.value.size,
    })

    if (!createIntentResult.ok) {
      const stage =
        createIntentResult.code === 'INVALID_REQUEST' || createIntentResult.code === 'UNSUPPORTED_INTENT_FIELD'
          ? 'validation_error'
          : 'upload_error'
      return makeFailure(stage, createIntentResult.code, createIntentResult.message)
    }

    const uploadResult = await input.dependencies.uploadProof({
      uploadIntent: createIntentResult.uploadIntent,
      file: input.file,
    })

    if (!uploadResult.ok) {
      return makeFailure('upload_error', uploadResult.code, uploadResult.message)
    }

    uploadReceipt = uploadResult.simulated ? null : uploadResult.uploadReceipt
  }

  const actionResult = await input.dependencies.reportPayment({
    publicCode,
    paymentMethod: input.paymentMethod,
    paymentReference,
    uploadReceipt,
  })

  return mapActionResult(actionResult)
}
