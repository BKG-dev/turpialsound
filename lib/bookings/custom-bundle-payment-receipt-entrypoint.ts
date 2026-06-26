import 'server-only'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import {
  runCustomBundlePaymentReceiptEntrypointCore,
  type CustomBundlePaymentReceiptEntrypointInput,
  type CustomBundlePaymentReceiptEntrypointResult,
  type CustomBundlePaymentReceiptEntrypointRuntime,
} from '@/lib/bookings/custom-bundle-payment-receipt-entrypoint-core'
import { validateCustomBundlePaymentUploadReceipt } from '@/lib/bookings/custom-bundle-payment-upload-token'

export function sanitizeReceiptResult(
  result: CustomBundlePaymentReceiptEntrypointResult,
): CustomBundlePaymentReceiptEntrypointResult {
  if (result.ok) {
    return result
  }

  const { originalFailure, ...rest } = result as CustomBundlePaymentReceiptEntrypointResult & {
    originalFailure?: unknown
  }
  void originalFailure
  return rest
}

function getRuntime(): CustomBundlePaymentReceiptEntrypointRuntime | null {
  if (isPreviewDeployment()) {
    return 'preview'
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'production'
  }

  return null
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim() ?? ''
  return value.length > 0 ? value : null
}

export async function runCustomBundlePaymentReceiptEntrypoint(
  input: CustomBundlePaymentReceiptEntrypointInput,
): Promise<CustomBundlePaymentReceiptEntrypointResult> {
  const runtime = getRuntime()
  if (!runtime) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'ENVIRONMENT_NOT_ALLOWED',
      message: 'El entorno actual no permite ejecutar el reporte de pago consolidado.',
    }
  }

  if (runtime === 'preview') {
    return runCustomBundlePaymentReceiptEntrypointCore({
      runtime,
      clock: {
        now(): Date {
          return new Date()
        },
      },
      validateUploadReceipt(receipt, expectedPublicCode, now) {
        return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, now)
      },
      async openSqlSession() {
        throw new Error('Preview must not open SQL sessions.')
      },
      async createPrivateBlobStore() {
        throw new Error('Preview must not create private blob stores.')
      },
    }, input)
  }

  const databaseUrl = readEnv('DATABASE_URL')
  if (!databaseUrl) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'SERVER_DATABASE_UNAVAILABLE',
      message: 'La configuracion de base de datos no esta disponible.',
    }
  }

  const blobToken = readEnv('BLOB_READ_WRITE_TOKEN')
  if (!blobToken) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'PRIVATE_STORAGE_UNAVAILABLE',
      message: 'La configuracion de almacenamiento privado no esta disponible.',
    }
  }

  const [{ openCustomBundlePaymentPgSession }, { createCustomBundlePrivateBlobStoreVercel }] =
    await Promise.all([
      import('@/lib/bookings/custom-bundle-payment-sql-session-pg'),
      import('@/lib/bookings/custom-bundle-private-blob-store-vercel'),
    ])

  return runCustomBundlePaymentReceiptEntrypointCore(
    {
      runtime,
      clock: {
        now(): Date {
          return new Date()
        },
      },
      validateUploadReceipt(receipt, expectedPublicCode, now) {
        return validateCustomBundlePaymentUploadReceipt(receipt, expectedPublicCode, now)
      },
      openSqlSession() {
        return openCustomBundlePaymentPgSession({
          connectionString: databaseUrl,
        })
      },
      createPrivateBlobStore() {
        return Promise.resolve(
          createCustomBundlePrivateBlobStoreVercel({
            token: blobToken,
          }),
        )
      },
    },
    input,
  ).then((result) => sanitizeReceiptResult(result))
}
