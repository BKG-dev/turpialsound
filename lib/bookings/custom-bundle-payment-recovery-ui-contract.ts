import type { BookingPaymentMethodConfig, BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'
import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES,
} from '@/lib/bookings/custom-bundle-payment-proof-constants'

export type CustomBundlePaymentRecoveryUiMode =
  | 'preview_simulation'
  | 'disabled'

export interface CustomBundlePaymentRecoveryUiMethodDetail {
  key: string
  label: string
  value: string
}

export interface CustomBundlePaymentRecoveryUiMethod {
  slug:
    | 'pago_movil'
    | 'transferencia'
    | 'binance'
    | 'efectivo'
  name: string
  referenceHint: string
  customerMessage: string
  proofRequired: boolean
  configurationReady: boolean
  details: Array<{
    key: string
    label: string
    value: string
  }>
}

export interface CustomBundlePaymentRecoveryUiSession {
  version: 2
  publicCode: string
  operationalStatus: 'pending_payment'
  paymentUiMode: CustomBundlePaymentRecoveryUiMode
  serviceName: string
  variantName: string
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  paymentDeadlineIso: string | null
  selectedPaymentMethodSlug: BookingPaymentMethodSlug
  paymentReference: string
  amountUsd: number
  amountBs: number
  amountUsdLabel: string
  amountBsLabel: string
  bcvRate: number
  paymentMethods: CustomBundlePaymentRecoveryUiMethod[]
}

export interface CustomBundlePaymentRecoveryUiFileMetadata {
  name: string
  type: string
  size: number
}

export type CustomBundlePaymentRecoveryUiFileMetadataIssueCode =
  | 'INVALID_FILE'
  | 'INVALID_FILENAME'
  | 'FILE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'INVALID_DECLARED_MIME_TYPE'

export interface CustomBundlePaymentRecoveryUiFileMetadataIssue {
  code: CustomBundlePaymentRecoveryUiFileMetadataIssueCode
  path: Array<string | number>
  message: string
}

export type CustomBundlePaymentRecoveryUiFileMetadataValidationResult =
  | {
      ok: true
      value: CustomBundlePaymentRecoveryUiFileMetadata
    }
  | {
      ok: false
      issues: CustomBundlePaymentRecoveryUiFileMetadataIssue[]
    }

const CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS = new Set<BookingPaymentMethodSlug>([
  'pago_movil',
  'transferencia',
  'binance',
])

const PUBLIC_DETAIL_FALLBACK = 'Por definir'

const METHOD_DETAIL_LABELS: Record<string, Record<string, string>> = {
  pago_movil: {
    beneficiaryName: 'Beneficiario',
    beneficiaryDocument: 'Documento',
    bankName: 'Banco',
    phoneNumber: 'Teléfono',
  },
  transferencia: {
    bankName: 'Banco',
    accountNumber: 'Cuenta',
    accountHolder: 'Titular',
    beneficiaryDocument: 'Documento',
  },
  binance: {
    payId: 'Pay ID',
    phoneNumber: 'Teléfono',
  },
  efectivo: {},
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isAllowedMimeType(value: string): boolean {
  return (CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

function isSafeFilename(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !/[\\/\0\r\n]/.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value)
  )
}

function isConfigurationValueReady(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() !== PUBLIC_DETAIL_FALLBACK
}

function shouldExposeDetailValue(value: unknown): boolean {
  return isConfigurationValueReady(value)
}

export function isCustomBundlePaymentProofRequired(
  method: BookingPaymentMethodSlug,
): boolean {
  return CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS.has(method)
}

export function validateCustomBundlePaymentUiFileMetadata(
  input: unknown,
): CustomBundlePaymentRecoveryUiFileMetadataValidationResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        {
          code: 'INVALID_FILE',
          path: [],
          message: 'El archivo de comprobante no es valido.',
        },
      ],
    }
  }

  const name = normalizeText(input.name)
  const type = normalizeText(input.type).toLowerCase()
  const size = typeof input.size === 'number' ? input.size : Number.NaN
  const issues: CustomBundlePaymentRecoveryUiFileMetadataIssue[] = []

  if (!isSafeFilename(name)) {
    issues.push({
      code: 'INVALID_FILENAME',
      path: ['name'],
      message: 'El nombre del archivo no es valido.',
    })
  }

  if (!Number.isInteger(size) || size <= 0) {
    issues.push({
      code: 'FILE_EMPTY',
      path: ['size'],
      message: 'El archivo no puede estar vacio.',
    })
  } else if (size > CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES) {
    issues.push({
      code: 'FILE_TOO_LARGE',
      path: ['size'],
      message: 'El archivo supera el tamano permitido.',
    })
  }

  if (!isAllowedMimeType(type)) {
    issues.push({
      code: 'INVALID_DECLARED_MIME_TYPE',
      path: ['type'],
      message: 'El tipo MIME declarado no es valido.',
    })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    value: {
      name,
      type,
      size,
    },
  }
}

export function resolveCustomBundlePaymentUiMode(input: {
  isPreview: boolean
  isCustomBundleBookingCandidate: boolean
}): CustomBundlePaymentRecoveryUiMode {
  return input.isPreview && input.isCustomBundleBookingCandidate
    ? 'preview_simulation'
    : 'disabled'
}

export function mapBookingPaymentMethodToPublicUiMethod(
  method: BookingPaymentMethodConfig,
): CustomBundlePaymentRecoveryUiMethod {
  const detailLabels = METHOD_DETAIL_LABELS[method.slug] ?? {}
  const details = method.details ?? {}
  const detailEntries = Object.entries(method.details ?? {})
    .filter(([, value]) => shouldExposeDetailValue(value))
    .map(([key, value]) => ({
      key,
      label: detailLabels[key] ?? key,
      value: normalizeText(value),
    }))

  const requiredKeys = Object.keys(detailLabels)
  const configurationReady =
    method.enabled &&
    (method.slug === 'efectivo'
      ? true
      : requiredKeys.every((key) => shouldExposeDetailValue(details[key as keyof typeof details])))

  return {
    slug: method.slug,
    name: method.name,
    referenceHint: method.referenceHint,
    customerMessage: method.customerMessage,
    proofRequired: isCustomBundlePaymentProofRequired(method.slug),
    configurationReady,
    details: detailEntries,
  }
}
