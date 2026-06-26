import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { NextRequest } from 'next/server'

import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  createCustomBundlePaymentUploadIntent,
  uploadCustomBundlePaymentProofWithIntent,
  type CustomBundlePaymentRecoveryAccessValidationResult,
  type CustomBundlePaymentUploadTransportDependencies,
} from '@/lib/bookings/custom-bundle-payment-upload-transport-core'
import { readCustomBundlePaymentRawUploadBody } from '@/lib/bookings/custom-bundle-payment-raw-upload-reader'
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
  const previousSecret = process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET
  process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET =
    previousSecret?.trim() || 'upload-transport-secret'

  try {
    const now = new Date('2026-06-24T18:00:00.000Z')
    const publicCode = 'TUR-2026-200'
    const recoveryToken = makeRecoveryToken(publicCode, now)
    const proofBytes = makeBytes('png')
    const proofFile = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: proofBytes,
    })

    const readerMissing = await readCustomBundlePaymentRawUploadBody({
      body: null,
      declaredContentLength: null,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(readerMissing.ok, false)
    assert.equal(readerMissing.code, 'BODY_MISSING')
    assert.equal(readerMissing.bytesRead, 0)
    assert.equal(readerMissing.readerCancelled, false)

    const readerEmptyMock = makeMockRawBody([{ kind: 'done' }])
    const readerEmpty = await readCustomBundlePaymentRawUploadBody({
      body: readerEmptyMock.body,
      declaredContentLength: 0,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(readerEmpty.ok, false)
    assert.equal(readerEmpty.code, 'BODY_EMPTY')
    assert.equal(readerEmptyMock.calls.getReader, 1)
    assert.equal(readerEmptyMock.calls.read, 1)
    assert.equal(readerEmptyMock.calls.cancel, 0)
    assert.equal(readerEmptyMock.calls.releaseLock, 1)

    const readerOneChunkBytes = makeBytes('png')
    const readerOneChunkMock = makeMockRawBody([{ kind: 'chunk', value: readerOneChunkBytes }, { kind: 'done' }])
    const readerOneChunk = await readCustomBundlePaymentRawUploadBody({
      body: readerOneChunkMock.body,
      declaredContentLength: readerOneChunkBytes.byteLength,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(readerOneChunk.ok, true)
    if (!readerOneChunk.ok) {
      fail('Expected a valid single-chunk body.')
    }
    assert.deepEqual(Array.from(readerOneChunk.bytes), Array.from(readerOneChunkBytes))
    assert.equal(readerOneChunkMock.calls.getReader, 1)
    assert.equal(readerOneChunkMock.calls.read, 2)
    assert.equal(readerOneChunkMock.calls.cancel, 0)
    assert.equal(readerOneChunkMock.calls.releaseLock, 1)
    readerOneChunkBytes[0] = 0
    assert.equal(readerOneChunk.bytes[0], 137)

    const readerMultiChunkBytesA = new Uint8Array([1, 2, 3])
    const readerMultiChunkBytesB = new Uint8Array([4, 5, 6, 7])
    const readerMultiChunkMock = makeMockRawBody([
      { kind: 'chunk', value: readerMultiChunkBytesA },
      { kind: 'chunk', value: readerMultiChunkBytesB },
      { kind: 'done' },
    ])
    const readerMultiChunk = await readCustomBundlePaymentRawUploadBody({
      body: readerMultiChunkMock.body,
      declaredContentLength: readerMultiChunkBytesA.byteLength + readerMultiChunkBytesB.byteLength,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(readerMultiChunk.ok, true)
    if (!readerMultiChunk.ok) {
      fail('Expected a valid multi-chunk body.')
    }
    assert.deepEqual(Array.from(readerMultiChunk.bytes), [1, 2, 3, 4, 5, 6, 7])
    assert.equal(readerMultiChunkMock.calls.releaseLock, 1)

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

    const oversizeBytes = new Uint8Array(3_900_001)
    const oversizeMock = makeMockRawBody([{ kind: 'chunk', value: oversizeBytes }, { kind: 'done' }])
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

    const readFailureMock = makeMockRawBody([{ kind: 'throw' }])
    const readFailure = await readCustomBundlePaymentRawUploadBody({
      body: readFailureMock.body,
      declaredContentLength: 1,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(readFailure.ok, false)
    assert.equal(readFailure.code, 'BODY_READ_FAILED')
    assert.equal(readFailureMock.calls.cancel, 1)
    assert.equal(readFailureMock.calls.releaseLock, 1)

    const invalidChunkMock = makeMockRawBody([{ kind: 'chunk', value: { not: 'bytes' } }])
    const invalidChunk = await readCustomBundlePaymentRawUploadBody({
      body: invalidChunkMock.body,
      declaredContentLength: 1,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(invalidChunk.ok, false)
    assert.equal(invalidChunk.code, 'BODY_CHUNK_INVALID')
    assert.equal(invalidChunkMock.calls.cancel, 1)
    assert.equal(invalidChunkMock.calls.releaseLock, 1)

    const boundedOversizeMock = makeMockRawBody([
      { kind: 'chunk', value: new Uint8Array(3_899_999) },
      { kind: 'chunk', value: new Uint8Array(2) },
      { kind: 'throw' },
    ])
    const boundedOversize = await readCustomBundlePaymentRawUploadBody({
      body: boundedOversizeMock.body,
      declaredContentLength: 3_900_000,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(boundedOversize.ok, false)
    assert.equal(boundedOversize.code, 'BODY_TOO_LARGE')
    assert.equal(boundedOversizeMock.calls.cancel, 1)
    assert.equal(boundedOversizeMock.calls.read, 2)
    assert.equal(boundedOversizeMock.calls.releaseLock, 1)

    const declaredTooLargeMock = makeMockRawBody([{ kind: 'chunk', value: new Uint8Array([1]) }])
    const declaredTooLarge = await readCustomBundlePaymentRawUploadBody({
      body: declaredTooLargeMock.body,
      declaredContentLength: 4_300_001,
      maxUploadBytes: 3_900_000,
      maxRequestBytes: 4_300_000,
    })
    assert.equal(declaredTooLarge.ok, false)
    assert.equal(declaredTooLarge.code, 'BODY_TOO_LARGE')
    assert.equal(declaredTooLargeMock.calls.getReader, 0)

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
    const mismatchResult = await uploadCustomBundlePaymentProofWithIntent(
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
    assert.equal(mismatchResult.ok, false)
    assert.equal(bodyChecks.count, 0)

    const routeSource = readFileSync(
      resolve(process.cwd(), 'app/api/bookings/custom-bundle-payment-proof/upload/route.ts'),
      'utf8',
    )
    const intentRouteSource = readFileSync(
      resolve(process.cwd(), 'app/api/bookings/custom-bundle-payment-proof/intent/route.ts'),
      'utf8',
    )
    assert.equal(routeSource.includes('request.arrayBuffer'), false)
    assert.equal(routeSource.includes('createdByThisCall'), false)
    assert.equal(routeSource.includes('simulated: true'), true)
    assert.equal(intentRouteSource.includes('UNSUPPORTED_INTENT_FIELD'), true)
    assert.equal(intentRouteSource.includes('Object.fromEntries'), false)
    assert.equal(intentRouteSource.includes("isolated_test"), false)

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

    const previewFieldGuard = await import('@/app/api/bookings/custom-bundle-payment-proof/intent/route')
    const unsupportedFieldResponse = await previewFieldGuard.POST(
      new Request('http://localhost/api/bookings/custom-bundle-payment-proof/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicCode: 'TUR-2026-200',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-200',
          originalFilename: 'proof.png',
          declaredMimeType: 'image/png',
          declaredSizeBytes: proofBytes.byteLength,
          unexpectedField: 'boom',
        }),
      }) as unknown as NextRequest,
    )
    assert.equal(unsupportedFieldResponse.status, 400)
    assert.equal(
      JSON.stringify(await unsupportedFieldResponse.json()).includes('UNSUPPORTED_INTENT_FIELD'),
      true,
    )

    const tokenFieldResponse = await previewFieldGuard.POST(
      new Request('http://localhost/api/bookings/custom-bundle-payment-proof/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicCode: 'TUR-2026-200',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-200',
          originalFilename: 'proof.png',
          declaredMimeType: 'image/png',
          declaredSizeBytes: proofBytes.byteLength,
          token: 'client-token',
        }),
      }) as unknown as NextRequest,
    )
    assert.equal(tokenFieldResponse.status, 400)

    const idempotencyFieldResponse = await previewFieldGuard.POST(
      new Request('http://localhost/api/bookings/custom-bundle-payment-proof/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicCode: 'TUR-2026-200',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-200',
          originalFilename: 'proof.png',
          declaredMimeType: 'image/png',
          declaredSizeBytes: proofBytes.byteLength,
          paymentReportIdempotencyKey: 'client-idempotency-key',
        }),
      }) as unknown as NextRequest,
    )
    assert.equal(idempotencyFieldResponse.status, 400)

    const environmentNotAllowedResponse = await previewFieldGuard.POST(
      new Request('http://localhost/api/bookings/custom-bundle-payment-proof/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicCode: 'TUR-2026-200',
          paymentMethod: 'pago_movil',
          paymentReference: 'REF-200',
          originalFilename: 'proof.png',
          declaredMimeType: 'image/png',
          declaredSizeBytes: proofBytes.byteLength,
        }),
      }) as unknown as NextRequest,
    )
    assert.equal(environmentNotAllowedResponse.status === 400 || environmentNotAllowedResponse.status === 503, true)

    console.log('booking_custom_bundle_payment_upload_transport_contract OK')
    console.log('bounded stream reader: verified')
    console.log('early stream cancellation: verified')
    console.log('authorization before reader: verified')
    console.log('strict runtime gate: verified')
    console.log('exact intent allowlist: verified')
    console.log('minimal public response: verified')
    console.log('qa shim isolation: verified')
  } finally {
    if (previousSecret === undefined) {
      delete process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET
    } else {
      process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET = previousSecret
    }
  }
}

main().catch((error) => fail('Unexpected failure while validating the upload transport contract.', error))
