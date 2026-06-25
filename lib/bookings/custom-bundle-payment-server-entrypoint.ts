import 'server-only'

import { isPreviewDeployment } from '@/lib/bookings/environment'
import {
  runCustomBundlePaymentServerEntrypointCore,
  type CustomBundlePaymentServerEntrypointInput,
  type CustomBundlePaymentServerEntrypointResult,
  type CustomBundlePaymentServerRuntime,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'

export {
  CUSTOM_BUNDLE_PAYMENT_SERVER_ENTRYPOINT_VERSION,
  buildCustomBundlePaymentServerIdempotencyKey,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'

function getServerRuntime(): CustomBundlePaymentServerRuntime | null {
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

export async function runCustomBundlePaymentServerEntrypoint(
  input: CustomBundlePaymentServerEntrypointInput,
): Promise<CustomBundlePaymentServerEntrypointResult> {
  const runtime = getServerRuntime()
  if (!runtime) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'ENVIRONMENT_NOT_ALLOWED',
      message: 'El entorno actual no permite ejecutar el reporte de pago consolidado.',
    }
  }

  if (runtime === 'preview') {
    return runCustomBundlePaymentServerEntrypointCore(
      {
        runtime,
        clock: {
          now(): Date {
            return new Date()
          },
        },
        async openSqlSession() {
          throw new Error('Preview must not open SQL sessions.')
        },
        async createPrivateBlobStore() {
          throw new Error('Preview must not create private blob stores.')
        },
      },
      input,
    )
  }

  const databaseUrl = readEnv('DATABASE_URL')
  if (!databaseUrl) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'MISSING_DATABASE_URL',
      message: 'La configuracion de base de datos no esta disponible.',
    }
  }

  const blobToken = readEnv('BLOB_READ_WRITE_TOKEN')
  if (!blobToken) {
    return {
      ok: false,
      stage: 'infrastructure',
      code: 'MISSING_BLOB_READ_WRITE_TOKEN',
      message: 'La configuracion de almacenamiento privado no esta disponible.',
    }
  }

  const [{ openCustomBundlePaymentPgSession }, { createCustomBundlePrivateBlobStoreVercel }] =
    await Promise.all([
      import('@/lib/bookings/custom-bundle-payment-sql-session-pg'),
      import('@/lib/bookings/custom-bundle-private-blob-store-vercel'),
    ])

  return runCustomBundlePaymentServerEntrypointCore(
    {
      runtime,
      clock: {
        now(): Date {
          return new Date()
        },
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
  )
}
