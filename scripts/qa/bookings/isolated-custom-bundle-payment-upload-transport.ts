import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  createCustomBundlePaymentUploadIntent,
  uploadCustomBundlePaymentProofWithIntent,
  type CustomBundlePaymentUploadTransportDependencies,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import {
  buildCustomBundlePaymentUploadIntent,
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadIntent,
} from '@/lib/bookings/custom-bundle-payment-upload-token'
import { buildCustomBundlePaymentProofPrivatePathname } from '@/lib/bookings/custom-bundle-payment-proof-boundary'

function fail(message: string, error?: unknown): never {
  console.error('booking_isolated_custom_bundle_payment_upload_transport FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}

function makeBytes(kind: 'png' | 'jpeg' | 'webp' | 'avif'): Uint8Array {
  switch (kind) {
    case 'jpeg':
      return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    case 'webp':
      return new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
        0x38, 0x20,
      ])
    case 'avif':
      return new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00,
        0x00, 0x00, 0x61, 0x76, 0x69, 0x66,
      ])
    case 'png':
    default:
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
  }
}

function makeRecoveryToken(publicCode: string, now: Date): string {
  const token = buildPaymentRecoveryToken({
    bookingPublicCode: publicCode,
    now,
    expiresAt: new Date(now.getTime() + 15 * 60_000),
  })
  if (!token) {
    fail('Unable to build a valid payment recovery token.')
  }

  return token
}

function makeFileLike(name: string, type: string, bytes: Uint8Array) {
  const calls = { count: 0 }
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBufferCalls: calls,
    async arrayBuffer(): Promise<ArrayBuffer> {
      calls.count += 1
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    },
  }
}

function makeStore() {
  const objects = new Map<
    string,
    { pathname: string; contentType: string; sizeBytes: number; uploadedAt: Date; access: 'private' }
  >()
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{ pathname: string; bodyBytes: number }>,
    delete: [] as Array<{ pathname: string }>,
  }

  return {
    calls,
    objects,
    seed(object: {
      pathname: string
      contentType: string
      sizeBytes: number
      uploadedAt: Date
      access: 'private'
    }) {
      objects.set(object.pathname, deepClone(object))
    },
    async headPrivate(pathname: string) {
      calls.head.push({ pathname })
      const value = objects.get(pathname)
      return value ? deepClone(value) : null
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
      access: 'private'
      addRandomSuffix: false
    }) {
      calls.put.push({ pathname: input.pathname, bodyBytes: input.body.byteLength })
      if (objects.has(input.pathname)) {
        const error = new Error('object already exists') as Error & { code: string }
        error.code = 'OBJECT_ALREADY_EXISTS'
        throw error
      }

      const value = {
        pathname: input.pathname,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        uploadedAt: new Date('2026-06-24T18:00:00.000Z'),
        access: 'private' as const,
      }
      objects.set(input.pathname, deepClone(value))
      return deepClone(value)
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
      objects.delete(pathname)
    },
  }
}

function makeDependencies(
  overrides: Partial<CustomBundlePaymentUploadTransportDependencies> = {},
): CustomBundlePaymentUploadTransportDependencies {
  const now = new Date('2026-06-24T18:00:00.000Z')
  return {
    runtime: overrides.runtime ?? 'isolated_test',
    clock: overrides.clock ?? {
      now(): Date {
        return new Date(now.getTime())
      },
    },
    validateRecoveryAccess:
      overrides.validateRecoveryAccess ??
      (async ({ token, expectedPublicCode, now: clockNow }) => {
        const expected = makeRecoveryToken(expectedPublicCode, clockNow)
        return token === expected
          ? {
              ok: true,
              payload: {
                bookingPublicCode: expectedPublicCode,
                exp: Math.floor((clockNow.getTime() + 15 * 60_000) / 1000),
                iat: Math.floor(clockNow.getTime() / 1000),
              },
            }
          : { ok: false, reason: 'invalid_token' }
      }),
    validateUploadIntent:
      overrides.validateUploadIntent ??
      ((token, expectedPublicCode, clockNow) =>
        validateCustomBundlePaymentUploadIntent(token, expectedPublicCode, clockNow)),
    buildUploadIntent:
      overrides.buildUploadIntent ??
      ((input) => buildCustomBundlePaymentUploadIntent(input)),
    buildUploadReceipt:
      overrides.buildUploadReceipt ??
      ((input) => buildCustomBundlePaymentUploadReceipt(input)),
    privateBlobStore:
      overrides.privateBlobStore ?? {
        async headPrivate() {
          return null
        },
        async putPrivate() {
          throw new Error('store not configured')
        },
        async deletePrivate() {
          return undefined
        },
      },
  }
}

function assertUploadIntentResult(
  result: Awaited<ReturnType<typeof createCustomBundlePaymentUploadIntent>>,
  message: string,
): asserts result is { ok: true; stage: 'intent'; uploadIntent: string } {
  if (!result.ok || result.stage !== 'intent') {
    fail(message)
  }
}

async function main(): Promise<void> {
  const now = new Date('2026-06-24T18:00:00.000Z')
  const publicCode = 'TUR-2026-201'
  const recoveryToken = makeRecoveryToken(publicCode, now)
  const bytes = makeBytes('png')
  const store = makeStore()

  const intent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-201',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: bytes.byteLength,
    },
  )
  assertUploadIntentResult(intent, 'Expected a valid upload intent.')

  const uploaded = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      uploadIntent: intent.uploadIntent,
      contentType: 'image/png',
      contentLength: bytes.byteLength,
      async readBody() {
        return bytes
      },
    },
  )
  assert.equal(uploaded.ok, true)
  assert.equal(uploaded.stage, 'uploaded')
  if (!uploaded.ok) {
    fail('Expected a private upload to succeed.')
  }
  assert.equal(store.calls.put.length, 1)
  assert.equal(store.calls.delete.length, 0)

  const replay = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      uploadIntent: intent.uploadIntent,
      contentType: 'image/png',
      contentLength: bytes.byteLength,
      async readBody() {
        return bytes
      },
    },
  )
  assert.equal(replay.ok, true)
  assert.equal(replay.stage, 'reused')

  const seededStore = makeStore()
  const seededIntent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({
      privateBlobStore: seededStore,
    }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-201',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: bytes.byteLength,
    },
  )
  assertUploadIntentResult(seededIntent, 'Expected a valid upload intent.')

  const validatedIntent = validateCustomBundlePaymentUploadIntent(
    seededIntent.uploadIntent,
    publicCode,
    now,
  )
  assert.equal(validatedIntent.ok, true)
  if (!validatedIntent.ok) {
    fail('Expected a valid upload intent token.')
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const expectedPath = buildCustomBundlePaymentProofPrivatePathname({
    publicCode,
    paymentReportIdempotencyKey: validatedIntent.payload.paymentReportIdempotencyKey,
    sha256,
    mimeType: 'image/png',
  })
  seededStore.seed({
    pathname: expectedPath,
    contentType: 'image/png',
    sizeBytes: bytes.byteLength,
    uploadedAt: new Date('2026-06-24T18:00:00.000Z'),
    access: 'private',
  })

  const reused = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      privateBlobStore: seededStore,
    }),
    {
      recoveryToken,
      uploadIntent: seededIntent.uploadIntent,
      contentType: 'image/png',
      contentLength: bytes.byteLength,
      async readBody() {
        return bytes
      },
    },
  )
  assert.equal(reused.ok, true)
  assert.equal(reused.stage, 'reused')

  const invalidClockCalls = { count: 0 }
  const invalidToken = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      privateBlobStore: makeStore(),
      validateRecoveryAccess: async () => ({ ok: false, reason: 'invalid_token' }),
    }),
    {
      recoveryToken: 'bad-token',
      uploadIntent: intent.uploadIntent,
      contentType: 'image/png',
      contentLength: bytes.byteLength,
      async readBody() {
        invalidClockCalls.count += 1
        fail('readBody should not run for invalid tokens.')
      },
    },
  )
  assert.equal(invalidToken.ok, false)
  assert.equal(invalidClockCalls.count, 0)

  const mismatchStore = makeStore()
  const mismatchIntent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({ privateBlobStore: mismatchStore }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-201',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: bytes.byteLength,
    },
  )
  assertUploadIntentResult(mismatchIntent, 'Expected a valid upload intent.')

  const mismatchValidated = validateCustomBundlePaymentUploadIntent(
    mismatchIntent.uploadIntent,
    publicCode,
    now,
  )
  assert.equal(mismatchValidated.ok, true)
  if (!mismatchValidated.ok) {
    fail('Expected a valid upload intent token.')
  }

  const mismatchPath = buildCustomBundlePaymentProofPrivatePathname({
    publicCode,
    paymentReportIdempotencyKey: mismatchValidated.payload.paymentReportIdempotencyKey,
    sha256,
    mimeType: 'image/png',
  })

  mismatchStore.seed({
    pathname: mismatchPath,
    contentType: 'image/png',
    sizeBytes: bytes.byteLength + 1,
    uploadedAt: new Date('2026-06-24T18:00:00.000Z'),
    access: 'private',
  })
  const conflict = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({ privateBlobStore: mismatchStore }),
    {
      recoveryToken,
      uploadIntent: mismatchIntent.uploadIntent,
      contentType: 'image/png',
      contentLength: bytes.byteLength,
      async readBody() {
        return bytes
      },
    },
  )
  assert.equal(conflict.ok, false)
  assert.equal(conflict.stage, 'store')

  console.log('booking_isolated_custom_bundle_payment_upload_transport OK')
  console.log('preview isolation: verified')
  console.log('private upload transport: verified')
  console.log('exact replay: verified')
  console.log('conflict cleanup: verified')
  console.log('secret-free result: verified')
  console.log('database cleanup: verified')
  console.log('storage cleanup: verified')
}

main().catch((error) => fail('Unexpected failure while validating the isolated upload transport.', error))
