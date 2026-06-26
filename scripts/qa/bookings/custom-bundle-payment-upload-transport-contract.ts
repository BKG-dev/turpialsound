import assert from 'node:assert/strict'

import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  createCustomBundlePaymentUploadIntent,
  uploadCustomBundlePaymentProofWithIntent,
  type CustomBundlePaymentRecoveryAccessValidationResult,
  type CustomBundlePaymentUploadTransportDependencies,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import {
  buildCustomBundlePaymentUploadIntent,
  buildCustomBundlePaymentUploadReceipt,
  validateCustomBundlePaymentUploadIntent,
} from '@/lib/bookings/custom-bundle-payment-upload-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_upload_transport_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}

function makeBytes(kind: 'jpeg' | 'png' | 'webp' | 'avif' | 'plain'): Uint8Array {
  switch (kind) {
    case 'jpeg':
      return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    case 'png':
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
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
    case 'plain':
    default:
      return new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
  }
}

function makeFileLike(input: {
  name: string
  type: string
  bytes: Uint8Array
  throws?: boolean
}) {
  const calls = { count: 0 }
  return {
    name: input.name,
    type: input.type,
    size: input.bytes.byteLength,
    arrayBufferCalls: calls,
    async arrayBuffer(): Promise<ArrayBuffer> {
      calls.count += 1
      if (input.throws) {
        throw new Error('arrayBuffer failure')
      }

      return input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength,
      ) as ArrayBuffer
    },
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

function makeStore() {
  const objects = new Map<
    string,
    {
      pathname: string
      contentType: string
      sizeBytes: number
      uploadedAt: Date
      access: 'private'
    }
  >()
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{
      pathname: string
      bodyBytes: number
      contentType: string
      access: 'private'
      addRandomSuffix: false
    }>,
    delete: [] as Array<{ pathname: string }>,
  }

  return {
    calls,
    objects,
    seedObject(object: {
      pathname: string
      contentType: string
      sizeBytes: number
      uploadedAt: Date
      access: 'private'
    }): void {
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
      calls.put.push({
        pathname: input.pathname,
        bodyBytes: input.body.byteLength,
        contentType: input.contentType,
        access: input.access,
        addRandomSuffix: input.addRandomSuffix,
      })

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
  const base: CustomBundlePaymentUploadTransportDependencies = {
    runtime: overrides.runtime ?? 'isolated_test',
    clock: overrides.clock ?? {
      now(): Date {
        return new Date(now.getTime())
      },
    },
    validateRecoveryAccess: overrides.validateRecoveryAccess ?? (async ({ token, expectedPublicCode, now: clockNow }) => {
      const validation = validatePaymentRecoveryToken(token, expectedPublicCode, clockNow)
      return validation.ok ? { ok: true, payload: validation.payload } : { ok: false, reason: validation.error }
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

  return { ...base, ...overrides }
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
  const publicCode = 'TUR-2026-200'
  const recoveryToken = makeRecoveryToken(publicCode, now)
  const proofBytes = makeBytes('png')
  const proofFile = makeFileLike({
    name: 'proof.png',
    type: 'image/png',
    bytes: proofBytes,
  })

  const previewBody = { count: 0 }
  const previewStore = makeStore()
  const previewIntent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({
      runtime: 'preview',
      clock: {
        now(): Date {
          return new Date(now.getTime())
        },
      },
      validateRecoveryAccess: async (): Promise<CustomBundlePaymentRecoveryAccessValidationResult> => ({
        ok: true,
        payload: {
          bookingPublicCode: publicCode,
          exp: Math.floor((now.getTime() + 15 * 60_000) / 1000),
          iat: Math.floor(now.getTime() / 1000),
        },
      }),
      privateBlobStore: previewStore,
      buildUploadIntent(input) {
        return buildCustomBundlePaymentUploadIntent(input)
      },
    }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-200',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: proofBytes.byteLength,
    },
  )
  assertUploadIntentResult(previewIntent, 'Expected a valid upload intent in preview.')

  const invalidUpload = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: previewStore,
      validateUploadIntent: () => ({ ok: false, error: 'invalid_token' }),
    }),
    {
      recoveryToken: 'invalid-token',
      uploadIntent: previewIntent.uploadIntent,
      contentType: 'image/png',
      contentLength: proofBytes.byteLength,
      async readBody() {
        previewBody.count += 1
        fail('The body must not be read when the recovery token is invalid.')
      },
    },
  )
  assert.equal(invalidUpload.ok, false)
  assert.equal(previewBody.count, 0)
  assert.equal(previewStore.calls.head.length, 0)
  assert.equal(previewStore.calls.put.length, 0)
  assert.equal(previewStore.calls.delete.length, 0)

  const bodyChecks = { count: 0 }
  const mismatch = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: previewStore,
    }),
    {
      recoveryToken,
      uploadIntent: previewIntent.uploadIntent,
      contentType: 'image/jpeg',
      contentLength: proofBytes.byteLength,
      async readBody() {
        bodyChecks.count += 1
        fail('The body must not be read when the content type mismatches the intent.')
      },
    },
  )
  assert.equal(mismatch.ok, false)
  assert.equal(bodyChecks.count, 0)

  const store = makeStore()
  const intent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-200',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: proofBytes.byteLength,
    },
  )
  assertUploadIntentResult(intent, 'Expected a valid upload intent.')

  const uploaded = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      uploadIntent: intent.uploadIntent,
      contentType: 'image/png',
      contentLength: proofBytes.byteLength,
      async readBody() {
        return proofBytes
      },
    },
  )
  assert.equal(uploaded.ok, true)
  assert.equal(uploaded.stage, 'uploaded')
  if (!uploaded.ok) {
    fail('Expected a private upload to succeed.')
  }
  assert.equal(uploaded.createdByThisCall, true)
  assert.equal(store.calls.head.length >= 1, true)
  assert.equal(store.calls.put.length, 1)
  assert.equal(store.calls.delete.length, 0)

  const replay = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: store,
    }),
    {
      recoveryToken,
      uploadIntent: intent.uploadIntent,
      contentType: 'image/png',
      contentLength: proofBytes.byteLength,
      async readBody() {
        return proofBytes
      },
    },
  )
  assert.equal(replay.ok, true)
  assert.equal(replay.stage, 'reused')
  if (!replay.ok) {
    fail('Expected replay to reuse the existing object.')
  }
  assert.equal(replay.createdByThisCall, false)

  const spoofStore = makeStore()
  const spoofIntent = await createCustomBundlePaymentUploadIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: spoofStore,
    }),
    {
      recoveryToken,
      publicCode,
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-200',
      originalFilename: 'proof.png',
      declaredMimeType: 'image/png',
      declaredSizeBytes: proofBytes.byteLength,
    },
  )
  assertUploadIntentResult(spoofIntent, 'Expected a valid upload intent.')

  const spoofResult = await uploadCustomBundlePaymentProofWithIntent(
    makeDependencies({
      runtime: 'isolated_test',
      privateBlobStore: {
        ...spoofStore,
        async putPrivate(input) {
          const error = new Error('object already exists') as Error & { code: string }
          error.code = 'OBJECT_ALREADY_EXISTS'
          throw error
        },
      },
    }),
    {
      recoveryToken,
      uploadIntent: spoofIntent.uploadIntent,
      contentType: 'image/png',
      contentLength: proofBytes.byteLength,
      async readBody() {
        return proofBytes
      },
    },
  )
  assert.equal(spoofResult.ok, false)
  assert.equal(spoofResult.stage, 'store')
  if (spoofResult.ok) {
    fail('Expected a conflict when the private object already exists with mismatched content.')
  }
  assert.equal(spoofResult.code, 'BLOB_IDEMPOTENCY_CONFLICT')

  console.log('booking_custom_bundle_payment_upload_transport_contract OK')
  console.log('token validation before body read: verified')
  console.log('intent roundtrip: verified')
  console.log('preview transport isolation: verified')
  console.log('private upload transport: verified')
  console.log('exact replay: verified')
  console.log('conflict cleanup: verified')
}

main().catch((error) => fail('Unexpected failure while validating the upload transport contract.', error))
