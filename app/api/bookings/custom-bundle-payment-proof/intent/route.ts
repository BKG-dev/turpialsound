import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import {
  CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME,
} from '@/lib/bookings/custom-bundle-payment-recovery-cookie'
import {
  createCustomBundlePaymentUploadIntent,
  type CustomBundlePaymentUploadTransportDependencies,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import {
  buildCustomBundlePaymentUploadIntent,
  validateCustomBundlePaymentUploadIntent,
  CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES,
  type CustomBundlePaymentUploadIntentPayload,
} from '@/lib/bookings/custom-bundle-payment-upload-token'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

const FALLBACK_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

type IntentRequestPayload = {
  publicCode?: unknown
  paymentMethod?: unknown
  paymentReference?: unknown
  originalFilename?: unknown
  declaredMimeType?: unknown
  declaredSizeBytes?: unknown
}

function isPreviewRuntime(): 'preview' | 'production' | 'isolated_test' {
  return isPreviewDeployment() ? 'preview' : process.env.VERCEL_ENV === 'production' ? 'production' : 'isolated_test'
}

function isFileNameSafe(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 255 && !/[\\/\0\r\n]/.test(trimmed)
}

function normalizePublicCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function withNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  return response
}

function makeNoopStore() {
  return {
    async headPrivate() {
      return null
    },
    async putPrivate() {
      throw new Error('intent route should not store files')
    },
    async deletePrivate() {
      return undefined
    },
  }
}

function parseDeclaredSizeBytes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) {
      return parsed
    }
  }

  return null
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as IntentRequestPayload | null
  const publicCode = normalizePublicCode(body?.publicCode)
  const paymentMethod = normalizeString(body?.paymentMethod)
  const paymentReference = normalizeString(body?.paymentReference)
  const originalFilename = isFileNameSafe(body?.originalFilename)
    ? (typeof body?.originalFilename === 'string' ? body?.originalFilename.trim() : null)
    : null
  const declaredMimeType = normalizeString(body?.declaredMimeType).toLowerCase() as
    | CustomBundlePaymentUploadIntentPayload['declaredMimeType']
    | ''
  const declaredSizeBytes = parseDeclaredSizeBytes(body?.declaredSizeBytes)
  const cookieToken = cookies().get(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME)?.value?.trim() ?? ''

  if (
    !publicCode ||
    !paymentMethod ||
    !paymentReference ||
    !originalFilename && body?.originalFilename !== null ||
    !FALLBACK_IMAGE_TYPES.has(declaredMimeType) ||
    declaredSizeBytes === null ||
    declaredSizeBytes <= 0 ||
    declaredSizeBytes > CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES
  ) {
    const response = NextResponse.json(
      { ok: false, stage: 'contract', code: 'INVALID_REQUEST', message: 'La solicitud de intent no es valida.' },
      { status: 400 },
    )
    return withNoStoreHeaders(response)
  }

  const dependencies: CustomBundlePaymentUploadTransportDependencies = {
    runtime: isPreviewRuntime(),
    clock: {
      now(): Date {
        return new Date()
      },
    },
    async validateRecoveryAccess({ token, expectedPublicCode, now }) {
      const validation = validatePaymentRecoveryToken(token, expectedPublicCode, now)
      return validation.ok
        ? {
            ok: true,
            payload: {
              bookingPublicCode: validation.payload.bookingPublicCode,
              exp: validation.payload.exp,
              iat: validation.payload.iat,
            },
          }
        : { ok: false, reason: validation.error }
    },
    validateUploadIntent(token, expectedPublicCode, now) {
      return validateCustomBundlePaymentUploadIntent(token, expectedPublicCode, now)
    },
    buildUploadIntent(input) {
      return buildCustomBundlePaymentUploadIntent(input)
    },
    buildUploadReceipt() {
      return null
    },
    privateBlobStore: makeNoopStore(),
  }

  const result = await createCustomBundlePaymentUploadIntent(dependencies, {
    recoveryToken: cookieToken,
    publicCode,
    paymentMethod,
    paymentReference,
    originalFilename,
    declaredMimeType: declaredMimeType as CustomBundlePaymentUploadIntentPayload['declaredMimeType'],
    declaredSizeBytes,
  })

  if (!result.ok) {
    return withNoStoreHeaders(
      NextResponse.json(
        'contractIssues' in result
          ? {
              ok: false,
              stage: 'contract',
              code: 'INVALID_REQUEST',
              message: 'No pudimos preparar el intento de subida.',
            }
          : {
              ok: false,
              stage: 'authorization',
              code: 'INVALID_UPLOAD_TOKEN',
              message: 'No pudimos preparar el intento de subida.',
            },
        { status: 400 },
      ),
    )
  }

  if (result.stage !== 'intent') {
    return withNoStoreHeaders(
      NextResponse.json(
        {
          ok: false,
          stage: 'infrastructure',
          code: 'PAYMENT_UPLOAD_EXECUTION_FAILED',
          message: 'No pudimos preparar el intento de subida.',
        },
        { status: 503 },
      ),
    )
  }

  const response = NextResponse.json({
    ok: true,
    uploadIntent: result.uploadIntent,
  })
  return withNoStoreHeaders(response)
}

export async function GET() {
  const response = NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  )
  return withNoStoreHeaders(response)
}
