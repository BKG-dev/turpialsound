import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildPaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  createCustomBundlePaymentUploadIntent,
  uploadCustomBundlePaymentProofWithIntent,
  type CustomBundlePaymentUploadTransportDependencies,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import { readCustomBundlePaymentRawUploadBody } from '@/lib/bookings/custom-bundle-payment-raw-upload-reader'
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

type MockRawReaderStep =
  | { kind: 'chunk'; value: unknown }
  | { kind: 'done' }
  | { kind: 'throw' }

function makeMockRawBody(steps: readonly MockRawReaderStep[]) {
  const calls = {
    getReader: 0,
    read: 0,
    cancel: 0,
    releaseLock: 0,
  }
  let index = 0
  const reader = {
    async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
      calls.read += 1
      const step = steps[index++]
      if (!step || step.kind === 'done') {
        return { done: true, value: undefined }
      }

      if (step.kind === 'throw') {
        throw new Error('raw body read failure')
      }

      return { done: false, value: step.value as Uint8Array }
    },
    async cancel(): Promise<void> {
      calls.cancel += 1
    },
    releaseLock(): void {
      calls.releaseLock += 1
    },
  }

  return {
    calls,
    body: {
      getReader(): typeof reader {
        calls.getReader += 1
        return reader
      },
    } as ReadableStream<Uint8Array>,
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
  const previousSecret = process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET
  process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET = previousSecret?.trim() || 'upload-transport-secret'

  try {
    const now = new Date('2026-06-24T18:00:00.000Z')
    const publicCode = 'TUR-2026-201'
    const recoveryToken = makeRecoveryToken(publicCode, now)
    const bytes = makeBytes('png')
    const store = makeStore()

    const chunkedMock = makeMockRawBody([
      { kind: 'chunk', value: bytes.subarray(0, 3) },
      { kind: 'chunk', value: bytes.subarray(3) },
      { kind: 'done' },
    ])
    const chunked = await readCustomBundlePaymentRawUploadBody({
      body: chunkedMock.body,
      declaredContentLength: bytes.byteLength,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(chunked.ok, true)
    if (!chunked.ok) {
      fail('Expected chunked raw body reading to succeed.')
    }
    assert.equal(chunkedMock.calls.getReader, 1)
    assert.equal(chunkedMock.calls.cancel, 0)
    assert.equal(chunkedMock.calls.releaseLock, 1)

    const exactLimitBytes = new Uint8Array(3_900_000)
    exactLimitBytes[0] = 9
    exactLimitBytes[3_899_999] = 8
    const exactLimitMock = makeMockRawBody([{ kind: 'chunk', value: exactLimitBytes }, { kind: 'done' }])
    const exactLimit = await readCustomBundlePaymentRawUploadBody({
      body: exactLimitMock.body,
      declaredContentLength: exactLimitBytes.byteLength,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(exactLimit.ok, true)
    if (!exactLimit.ok) {
      fail('Expected the exact upload limit to be accepted.')
    }
    assert.equal(exactLimit.bytesRead, 3_900_000)
    assert.equal(exactLimitMock.calls.cancel, 0)
    assert.equal(exactLimitMock.calls.releaseLock, 1)

    const oversizeMock = makeMockRawBody([{ kind: 'chunk', value: new Uint8Array(3_900_001) }])
    const oversize = await readCustomBundlePaymentRawUploadBody({
      body: oversizeMock.body,
      declaredContentLength: 3_900_000,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(oversize.ok, false)
    assert.equal(oversize.code, 'BODY_TOO_LARGE')
    assert.equal(oversizeMock.calls.cancel, 1)
    assert.equal(oversizeMock.calls.read, 1)
    assert.equal(oversizeMock.calls.releaseLock, 1)

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
          return chunked.ok ? chunked.bytes : bytes
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

    const routeSource = readFileSync(
      resolve(process.cwd(), 'app/api/bookings/custom-bundle-payment-proof/upload/route.ts'),
      'utf8',
    )
    assert.equal(routeSource.includes('request.arrayBuffer'), false)
    assert.equal(routeSource.includes('createdByThisCall'), false)
    assert.equal(routeSource.includes('simulated: true'), true)

    const unknownRuntimeSource = readFileSync(
      resolve(process.cwd(), 'app/api/bookings/custom-bundle-payment-proof/intent/route.ts'),
      'utf8',
    )
    assert.equal(unknownRuntimeSource.includes("isolated_test"), false)

    console.log('booking_isolated_custom_bundle_payment_upload_transport OK')
    console.log('bounded binary stream: verified')
    console.log('early oversize rejection: verified')
    console.log('authorization before body: verified')
    console.log('private upload: verified')
    console.log('opaque receipt: verified')
    console.log('public response minimization: verified')
    console.log('storage cleanup: verified')
  } finally {
    if (previousSecret === undefined) {
      delete process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET
    } else {
      process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET = previousSecret
    }
  }
}

main().catch((error) => fail('Unexpected failure while validating the isolated upload transport.', error))
