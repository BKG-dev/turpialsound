import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import { CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME } from '@/lib/bookings/custom-bundle-payment-recovery-cookie'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  readCustomBundlePaymentRawUploadBody,
} from '@/lib/bookings/custom-bundle-payment-raw-upload-reader'
import {
  type CustomBundlePaymentUploadTransportDependencies,
  type CustomBundlePaymentUploadTransportResult,
  uploadCustomBundlePaymentProofWithIntent,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import {
  buildCustomBundlePaymentUploadIntent,
  buildCustomBundlePaymentUploadReceipt,
  CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES,
  CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES,
  type CustomBundlePaymentUploadIntentPayload,
  validateCustomBundlePaymentUploadIntent,
} from '@/lib/bookings/custom-bundle-payment-upload-token'

const CUSTOM_BUNDLE_PAYMENT_UPLOAD_ENABLED_ENV =
  'BOOKINGS_CUSTOM_BUNDLE_PAYMENT_UPLOAD_ENABLED' as const
const CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_HEADER =
  'x-turpial-payment-upload-intent' as const

function withNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  return response
}

function readRuntime(): 'preview' | 'production' | 'environment_not_allowed' {
  if (isPreviewDeployment()) {
    return 'preview'
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'production'
  }

  if (process.env.VERCEL_ENV) {
    return 'environment_not_allowed'
  }

  return 'environment_not_allowed'
}

function makeNoopStore() {
  return {
    async headPrivate() {
      return null
    },
    async putPrivate() {
      throw new Error('Preview upload route must not write private blobs.')
    },
    async deletePrivate() {
      return undefined
    },
  }
}

function mapFailure(
  result:
    | Extract<CustomBundlePaymentUploadTransportResult, { ok: false }>
    | {
        ok: false
        stage: 'contract'
        code: string
        message: string
      },
): NextResponse {
  return withNoStoreHeaders(
    NextResponse.json(result, {
      status:
        result.stage === 'contract'
          ? 400
          : result.stage === 'authorization'
            ? 401
            : result.stage === 'boundary'
              ? 400
              : result.stage === 'store'
                ? 409
                : result.stage === 'cleanup'
                  ? 500
                  : 503,
    }),
  )
}

function makeReadBody(request: NextRequest, declaredContentLength: number | null) {
  let cachedBytes: Uint8Array | null = null
  return async (): Promise<Uint8Array> => {
    if (cachedBytes) {
      return cachedBytes
    }

    const result = await readCustomBundlePaymentRawUploadBody({
      body: request.body,
      declaredContentLength,
      maxUploadBytes: CUSTOM_BUNDLE_PAYMENT_RAW_UPLOAD_MAX_BYTES,
      maxRequestBytes: CUSTOM_BUNDLE_PAYMENT_RAW_REQUEST_MAX_BYTES,
    })

    if (!result.ok) {
      throw new Error(result.code)
    }

    cachedBytes = result.bytes
    return result.bytes
  }
}

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const runtime = readRuntime()
  const recoveryToken = cookies().get(CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME)?.value?.trim() ?? ''
  const uploadIntent = request.headers.get(CUSTOM_BUNDLE_PAYMENT_UPLOAD_INTENT_HEADER)?.trim() ?? ''
  const contentType = request.headers.get('content-type')?.trim().toLowerCase() ?? ''
  const contentLengthHeader = request.headers.get('content-length')
  const contentLength =
    contentLengthHeader && contentLengthHeader.trim().length > 0
      ? Number(contentLengthHeader)
      : null

  if (!recoveryToken || !uploadIntent || !contentType) {
    return mapFailure({
      ok: false,
      stage: 'contract',
      code: 'INVALID_REQUEST',
      message: 'La solicitud binaria de subida no es valida.',
    })
  }

  if (contentLength !== null && (!Number.isInteger(contentLength) || contentLength < 0)) {
    return mapFailure({
      ok: false,
      stage: 'contract',
      code: 'INVALID_REQUEST',
      message: 'La longitud declarada de la subida no es valida.',
    })
  }

  if (runtime === 'environment_not_allowed') {
    return mapFailure({
      ok: false,
      stage: 'infrastructure',
      code: 'ENVIRONMENT_NOT_ALLOWED',
      message: 'El entorno actual no permite ejecutar la subida protegida del comprobante.',
    })
  }

  if (runtime === 'production' && process.env[CUSTOM_BUNDLE_PAYMENT_UPLOAD_ENABLED_ENV]?.trim() !== 'true') {
    return mapFailure({
      ok: false,
      stage: 'infrastructure',
      code: 'ENVIRONMENT_NOT_ALLOWED',
      message: 'La subida protegida del comprobante no esta habilitada en produccion.',
    })
  }

  const now = new Date()
  const dependencies: CustomBundlePaymentUploadTransportDependencies = {
    runtime,
    clock: {
      now(): Date {
        return new Date(now.getTime())
      },
    },
    validateRecoveryAccess: ({ token, expectedPublicCode, now: clockNow }) => {
      const validation = validatePaymentRecoveryToken(token, expectedPublicCode, clockNow)
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
    validateUploadIntent(token, expectedPublicCode, clockNow) {
      return validateCustomBundlePaymentUploadIntent(token, expectedPublicCode, clockNow)
    },
    buildUploadIntent(input) {
      return buildCustomBundlePaymentUploadIntent(input)
    },
    buildUploadReceipt(input) {
      return buildCustomBundlePaymentUploadReceipt(input)
    },
    privateBlobStore:
      runtime === 'preview'
        ? makeNoopStore()
        : {
            async headPrivate() {
              throw new Error('Blob store not initialized.')
            },
            async putPrivate() {
              throw new Error('Blob store not initialized.')
            },
            async deletePrivate() {
              throw new Error('Blob store not initialized.')
            },
          },
  }

  try {
    if (runtime === 'preview') {
      const result = await uploadCustomBundlePaymentProofWithIntent(dependencies, {
        recoveryToken,
        uploadIntent,
        contentType: contentType as CustomBundlePaymentUploadIntentPayload['declaredMimeType'],
        contentLength,
        readBody: makeReadBody(request, contentLength),
      })

    if (!result.ok) {
        return mapFailure(
          'contractIssues' in result
            ? {
                ok: false,
                stage: 'contract',
                code: 'INVALID_REQUEST',
                message: 'No pudimos preparar la subida protegida.',
              }
            : result,
        )
      }

      if (result.stage === 'intent') {
        return mapFailure({
          ok: false,
          stage: 'infrastructure',
          code: 'PAYMENT_UPLOAD_EXECUTION_FAILED',
          message: 'No pudimos completar la subida protegida del comprobante.',
        })
      }

      return withNoStoreHeaders(NextResponse.json({ ok: true, simulated: true, uploadReceipt: null }))
    }

    const { createCustomBundlePrivateBlobStoreVercel } = await import(
      '@/lib/bookings/custom-bundle-private-blob-store-vercel'
    )
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? ''
    if (!blobToken) {
      return mapFailure({
        ok: false,
        stage: 'infrastructure',
        code: 'ENVIRONMENT_NOT_ALLOWED',
        message: 'El almacenamiento privado no esta disponible temporalmente.',
      })
    }

    dependencies.privateBlobStore = createCustomBundlePrivateBlobStoreVercel({
      token: blobToken,
    })

    const result = await uploadCustomBundlePaymentProofWithIntent(dependencies, {
      recoveryToken,
      uploadIntent,
      contentType: contentType as CustomBundlePaymentUploadIntentPayload['declaredMimeType'],
      contentLength,
      readBody: makeReadBody(request, contentLength),
    })

    if (!result.ok) {
      return mapFailure(
        'contractIssues' in result
          ? {
              ok: false,
              stage: 'contract',
              code: 'INVALID_REQUEST',
              message: 'No pudimos preparar la subida protegida.',
            }
          : result,
      )
    }

    if (result.stage === 'intent') {
      return mapFailure({
        ok: false,
        stage: 'infrastructure',
        code: 'PAYMENT_UPLOAD_EXECUTION_FAILED',
        message: 'No pudimos completar la subida protegida del comprobante.',
      })
    }

    return withNoStoreHeaders(NextResponse.json({ ok: true, simulated: false, uploadReceipt: result.uploadReceipt }))
  } catch {
    return mapFailure({
      ok: false,
      stage: 'infrastructure',
      code: 'PAYMENT_UPLOAD_EXECUTION_FAILED',
      message: 'No pudimos completar la subida protegida del comprobante.',
    })
  }
}

export async function GET() {
  const response = NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'PUT' } },
  )
  return withNoStoreHeaders(response)
}

export async function POST() {
  return GET()
}
