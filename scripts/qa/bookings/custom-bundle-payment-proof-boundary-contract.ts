import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCustomBundlePaymentProofPrivatePathname,
  CUSTOM_BUNDLE_PAYMENT_PROOF_BOUNDARY_VERSION,
  CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX,
  deleteCustomBundlePaymentProofFromPrivateStore,
  prepareCustomBundlePaymentProofUpload,
  uploadCustomBundlePaymentProofToPrivateStore,
  type CustomBundlePaymentProofBoundaryContext,
  type CustomBundlePaymentProofFileLike,
  type CustomBundlePrivateBlobObject,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_proof_boundary_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function deepClone<T>(value: T): T {
  return structuredClone(value)
}

function makeBytes(kind: 'jpeg' | 'png' | 'webp' | 'avif' | 'plain' | 'spoof'): Uint8Array {
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
    case 'spoof':
      return new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x61, 0x62, 0x63, 0x64,
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
}): CustomBundlePaymentProofFileLike & {
  readonly arrayBufferCalls: { count: number }
} {
  const calls = { count: 0 }
  return {
    name: input.name,
    type: input.type,
    size: input.bytes.byteLength,
    arrayBuffer(): Promise<ArrayBuffer> {
      calls.count += 1
      if (input.throws) {
        throw new Error('arrayBuffer failure')
      }

      return Promise.resolve(
        input.bytes.buffer.slice(
          input.bytes.byteOffset,
          input.bytes.byteOffset + input.bytes.byteLength,
        ) as ArrayBuffer,
      )
    },
    arrayBufferCalls: calls,
  }
}

function makeContext(overrides: Partial<CustomBundlePaymentProofBoundaryContext> = {}): CustomBundlePaymentProofBoundaryContext {
  return {
    publicCode: 'TUR-2026-001',
    paymentReportIdempotencyKey: 'PAYMENT_2026:06:24-BOUNDARY',
    now: new Date('2026-06-24T18:00:00.000Z'),
    ...overrides,
  }
}

type MemoryStoreControls = CustomBundlePrivateBlobStore & {
  calls: {
    head: Array<{ pathname: string }>
    put: Array<{
      pathname: string
      contentType: string
      access: 'private'
      addRandomSuffix: false
      bodyBytes: number
    }>
    delete: Array<{ pathname: string }>
  }
  seedObject(object: CustomBundlePrivateBlobObject): void
  setNextHeadError(error: Error & { code?: string }): void
  queueHeadResponse(object: CustomBundlePrivateBlobObject | null): void
  setNextPutError(error: Error & { code?: string }): void
  setNextPutResponse(object: CustomBundlePrivateBlobObject): void
  setNextDeleteError(error: Error & { code?: string }): void
  readObject(pathname: string): CustomBundlePrivateBlobObject | null
}

function createMemoryStore(): MemoryStoreControls {
  const objects = new Map<string, CustomBundlePrivateBlobObject>()
  const calls = {
    head: [] as Array<{ pathname: string }>,
    put: [] as Array<{
      pathname: string
      contentType: string
      access: 'private'
      addRandomSuffix: false
      bodyBytes: number
    }>,
    delete: [] as Array<{ pathname: string }>,
  }
  let nextHeadError: (Error & { code?: string }) | null = null
  const headQueue: Array<CustomBundlePrivateBlobObject | null> = []
  let nextPutError: (Error & { code?: string }) | null = null
  let nextPutResponse: CustomBundlePrivateBlobObject | null = null
  let nextDeleteError: (Error & { code?: string }) | null = null

  return {
    calls,
    seedObject(object: CustomBundlePrivateBlobObject): void {
      objects.set(object.pathname, deepClone(object))
    },
    setNextHeadError(error: Error & { code?: string }): void {
      nextHeadError = error
    },
    queueHeadResponse(object: CustomBundlePrivateBlobObject | null): void {
      headQueue.push(object ? deepClone(object) : null)
    },
    setNextPutError(error: Error & { code?: string }): void {
      nextPutError = error
    },
    setNextPutResponse(object: CustomBundlePrivateBlobObject): void {
      nextPutResponse = deepClone(object)
    },
    setNextDeleteError(error: Error & { code?: string }): void {
      nextDeleteError = error
    },
    readObject(pathname: string): CustomBundlePrivateBlobObject | null {
      const value = objects.get(pathname)
      return value ? deepClone(value) : null
    },
    async headPrivate(pathname: string): Promise<CustomBundlePrivateBlobObject | null> {
      calls.head.push({ pathname })
      if (nextHeadError) {
        const error = nextHeadError
        nextHeadError = null
        throw error
      }

      if (headQueue.length > 0) {
        const value = headQueue.shift()!
        return value ? deepClone(value) : null
      }

      const value = objects.get(pathname)
      return value ? deepClone(value) : null
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
      access: 'private'
      addRandomSuffix: false
    }): Promise<CustomBundlePrivateBlobObject> {
      calls.put.push({
        pathname: input.pathname,
        contentType: input.contentType,
        access: input.access,
        addRandomSuffix: input.addRandomSuffix,
        bodyBytes: input.body.byteLength,
      })

      if (nextPutError) {
        const error = nextPutError
        nextPutError = null
        throw error
      }

      const stored =
        nextPutResponse ??
        ({
          pathname: input.pathname,
          contentType: input.contentType,
          sizeBytes: input.body.byteLength,
          uploadedAt: new Date('2026-06-24T17:59:59.000Z'),
          access: 'private',
        } as CustomBundlePrivateBlobObject)
      nextPutResponse = null
      objects.set(input.pathname, deepClone(stored))
      return deepClone(stored)
    },
    async deletePrivate(pathname: string): Promise<void> {
      calls.delete.push({ pathname })
      if (nextDeleteError) {
        const error = nextDeleteError
        nextDeleteError = null
        throw error
      }
      objects.delete(pathname)
    },
  }
}

function makeError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

function assertNoForbiddenSource(source: string): void {
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/@vercel\/blob/, '@vercel/blob'],
    [/payment-proof-upload/, 'payment-proof-upload'],
    [/process\.env/, 'process.env'],
    [/from\s+['"]pg['"]/, 'pg'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db'],
    [/fetch\s*\(/, 'fetch'],
    [/['"]use server['"]/, 'use server'],
  ]

  for (const [pattern, label] of forbiddenPatterns) {
    assert.equal(pattern.test(source), false, label)
  }
}

async function expectPreparedResult(file: CustomBundlePaymentProofFileLike, context: CustomBundlePaymentProofBoundaryContext) {
  const result = await prepareCustomBundlePaymentProofUpload({ file, context })
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) {
    return fail('expected prepared value')
  }
  return result.value
}

function assertHex(value: string, length = 64): void {
  assert.match(value, new RegExp(`^[a-f0-9]{${length}}$`))
}

function assertNoLeak(result: unknown): void {
  const text = JSON.stringify(result)
  assert.equal(text.includes('https://'), false)
  assert.equal(text.toLowerCase().includes('token'), false)
}

async function main(): Promise<void> {
  assert.equal(
    CUSTOM_BUNDLE_PAYMENT_PROOF_BOUNDARY_VERSION,
    'custom_bundle_payment_proof_boundary_v1',
  )
  assert.equal(CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX, 'payment-proofs')

  const source = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-proof-boundary.ts'),
    'utf8',
  )
  assertNoForbiddenSource(source)

  const validContext = makeContext()

  // 1-4: valid binary signatures.
  {
    const jpeg = makeFileLike({ name: 'proof.jpg', type: 'image/jpeg', bytes: makeBytes('jpeg') })
    const png = makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') })
    const webp = makeFileLike({ name: 'proof.webp', type: 'image/webp', bytes: makeBytes('webp') })
    const avif = makeFileLike({ name: 'proof.avif', type: 'image/avif', bytes: makeBytes('avif') })

    for (const file of [jpeg, png, webp, avif]) {
      const prepared = await expectPreparedResult(file, validContext)
      assert.equal(prepared.publicCode, 'TUR-2026-001')
      assert.equal(prepared.paymentReportIdempotencyKey, validContext.paymentReportIdempotencyKey)
      assert.equal(prepared.originalFilename, file.name)
      assertHex(prepared.sha256)
      assert.equal(prepared.bytes.byteLength, file.size)
      assert.equal(prepared.pathname.startsWith('payment-proofs/TUR-2026-001/'), true)
      assert.equal(prepared.pathname.includes(validContext.paymentReportIdempotencyKey), false)
      assert.equal(prepared.pathname.includes(file.name), false)
      assert.equal(prepared.pathname.includes('..'), false)
    }
  }

  // 5-7: invalid declared mime, bad signature, mismatch.
  {
    const invalidMime = makeFileLike({ name: 'proof.gif', type: 'image/gif', bytes: makeBytes('png') })
    const invalidSignature = makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('plain') })
    const mismatch = makeFileLike({ name: 'proof.jpg', type: 'image/jpeg', bytes: makeBytes('png') })

    const invalidMimeResult = await prepareCustomBundlePaymentProofUpload({
      file: invalidMime,
      context: validContext,
    })
    assert.equal(invalidMimeResult.ok, false)
    assert.ok(!invalidMimeResult.ok && invalidMimeResult.issues.some((issue) => issue.code === 'INVALID_DECLARED_MIME_TYPE'))

    const invalidSignatureResult = await prepareCustomBundlePaymentProofUpload({
      file: invalidSignature,
      context: validContext,
    })
    assert.equal(invalidSignatureResult.ok, false)
    assert.ok(
      !invalidSignatureResult.ok &&
        invalidSignatureResult.issues.some((issue) => issue.code === 'UNSUPPORTED_BINARY_SIGNATURE'),
    )

    const mismatchResult = await prepareCustomBundlePaymentProofUpload({
      file: mismatch,
      context: validContext,
    })
    assert.equal(mismatchResult.ok, false)
    assert.ok(!mismatchResult.ok && mismatchResult.issues.some((issue) => issue.code === 'MIME_SIGNATURE_MISMATCH'))
  }

  // 8-11: empty, large, mismatch, read failure.
  {
    const empty = makeFileLike({ name: 'proof.png', type: 'image/png', bytes: new Uint8Array([]) })
    const tooLarge = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: new Uint8Array(4_718_592 + 1),
    })
    const mismatchBytes = makeBytes('png')
    const mismatch = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: mismatchBytes,
    })
    ;(mismatch as unknown as { size: number }).size = mismatchBytes.byteLength + 1
    const readFailure = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('png'),
      throws: true,
    })

    const emptyResult = await prepareCustomBundlePaymentProofUpload({ file: empty, context: validContext })
    assert.equal(emptyResult.ok, false)
    assert.ok(!emptyResult.ok && emptyResult.issues.some((issue) => issue.code === 'FILE_EMPTY'))

    const tooLargeResult = await prepareCustomBundlePaymentProofUpload({
      file: tooLarge,
      context: validContext,
    })
    assert.equal(tooLargeResult.ok, false)
    assert.ok(!tooLargeResult.ok && tooLargeResult.issues.some((issue) => issue.code === 'FILE_TOO_LARGE'))

    const mismatchResult = await prepareCustomBundlePaymentProofUpload({
      file: mismatch,
      context: validContext,
    })
    assert.equal(mismatchResult.ok, false)
    assert.ok(!mismatchResult.ok && mismatchResult.issues.some((issue) => issue.code === 'FILE_SIZE_MISMATCH'))

    const readFailureResult = await prepareCustomBundlePaymentProofUpload({
      file: readFailure,
      context: validContext,
    })
    assert.equal(readFailureResult.ok, false)
    assert.ok(!readFailureResult.ok && readFailureResult.issues.some((issue) => issue.code === 'FILE_READ_FAILED'))
  }

  // 12-17: filename/context validation.
  {
    const filenameEmpty = makeFileLike({ name: '   ', type: 'image/png', bytes: makeBytes('png') })
    const filenameSlash = makeFileLike({ name: 'proof/evil.png', type: 'image/png', bytes: makeBytes('png') })
    const filenameControl = makeFileLike({
      name: 'proof\n.png',
      type: 'image/png',
      bytes: makeBytes('png'),
    })
    const invalidPublicCodeContext = makeContext({ publicCode: 'bad' })
    const invalidKeyContext = makeContext({ paymentReportIdempotencyKey: 'short' })
    const invalidNowContext = makeContext({ now: new Date('invalid') })

    for (const [file, label] of [
      [filenameEmpty, 'INVALID_FILENAME'],
      [filenameSlash, 'INVALID_FILENAME'],
      [filenameControl, 'INVALID_FILENAME'],
    ] as const) {
      const result = await prepareCustomBundlePaymentProofUpload({ file, context: validContext })
      assert.equal(result.ok, false, label)
      assert.ok(!result.ok && result.issues.some((issue) => issue.code === 'INVALID_FILENAME'))
    }

    const invalidPublicCode = await prepareCustomBundlePaymentProofUpload({
      file: makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') }),
      context: invalidPublicCodeContext,
    })
    assert.equal(invalidPublicCode.ok, false)
    assert.ok(!invalidPublicCode.ok && invalidPublicCode.issues.some((issue) => issue.code === 'INVALID_PUBLIC_CODE'))

    const invalidKey = await prepareCustomBundlePaymentProofUpload({
      file: makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') }),
      context: invalidKeyContext,
    })
    assert.equal(invalidKey.ok, false)
    assert.ok(
      !invalidKey.ok && invalidKey.issues.some((issue) => issue.code === 'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY'),
    )

    const invalidNow = await prepareCustomBundlePaymentProofUpload({
      file: makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') }),
      context: invalidNowContext,
    })
    assert.equal(invalidNow.ok, false)
    assert.ok(!invalidNow.ok && invalidNow.issues.some((issue) => issue.code === 'INVALID_NOW'))
  }

  // 18-25: sha/path invariants.
  {
    const bytes = makeBytes('png')
    const file = makeFileLike({ name: 'proof.png', type: 'image/png', bytes })
    const prepared = await expectPreparedResult(file, validContext)
    assert.equal(
      prepared.sha256,
      createHash('sha256').update(bytes).digest('hex'),
      'SHA-256 must come from bytes',
    )
    const samePath = buildCustomBundlePaymentProofPrivatePathname({
      publicCode: validContext.publicCode,
      paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
      sha256: prepared.sha256,
      mimeType: prepared.mimeType,
    })
    assert.equal(samePath, prepared.pathname)
    assert.equal(prepared.pathname.includes(validContext.paymentReportIdempotencyKey), false)
    assert.equal(prepared.pathname.includes('proof.png'), false)
    assert.equal(prepared.pathname.includes('..'), false)
    assert.equal(
      buildCustomBundlePaymentProofPrivatePathname({
        publicCode: validContext.publicCode,
        paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
        sha256: 'b'.repeat(64),
        mimeType: prepared.mimeType,
      }),
      prepared.pathname.replace(prepared.sha256, 'b'.repeat(64)),
    )
    assert.notEqual(
      buildCustomBundlePaymentProofPrivatePathname({
        publicCode: validContext.publicCode,
        paymentReportIdempotencyKey: 'PAYMENT_2026:06:24-BOUNDARY-ALT',
        sha256: prepared.sha256,
        mimeType: prepared.mimeType,
      }),
      prepared.pathname,
    )

    const contentDifferent = await expectPreparedResult(
      makeFileLike({
        name: 'proof2.png',
        type: 'image/png',
        bytes: new Uint8Array([...makeBytes('png'), 0x01, 0x02, 0x03, 0x04]),
      }),
      validContext,
    )
    assert.notEqual(contentDifferent.pathname, prepared.pathname)

    const keyDifferent = await expectPreparedResult(
      file,
      makeContext({ paymentReportIdempotencyKey: 'PAYMENT_2026:06:24-BOUNDARY-ALT' }),
    )
    assert.notEqual(keyDifferent.pathname, prepared.pathname)
  }

  // 26-32: storage semantics.
  {
    const file = makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') })
    const store = createMemoryStore()

    const uploaded = await uploadCustomBundlePaymentProofToPrivateStore({
      store,
      file,
      context: validContext,
    })
    assert.equal(uploaded.ok, true)
    assert.equal(uploaded.stage, 'uploaded')
    if (uploaded.ok && uploaded.stage === 'uploaded') {
      assert.equal(uploaded.createdByThisCall, true)
      assert.equal(uploaded.privateObject.access, 'private')
      assert.equal(uploaded.privateObject.pathname, uploaded.metadata.blobPathname)
      assert.equal(uploaded.privateObject.contentType, uploaded.metadata.mimeType)
      assert.equal(uploaded.privateObject.sizeBytes, uploaded.metadata.sizeBytes)
      assert.equal(uploaded.privateObject.uploadedAt.getTime(), uploaded.metadata.uploadedAt.getTime())
    }
    assert.equal(store.calls.put.length, 1)
    assert.equal(store.calls.put[0].access, 'private')
    assert.equal(store.calls.put[0].addRandomSuffix, false)
    assertNoLeak(uploaded)

    const reusedStore = createMemoryStore()
    reusedStore.seedObject({
      pathname: uploaded.ok && uploaded.stage === 'uploaded' ? uploaded.metadata.blobPathname : 'payment-proofs/TUR-2026-001/seed.webp',
      contentType: 'image/png',
      sizeBytes: file.size,
      uploadedAt: new Date('2026-06-24T17:59:00.000Z'),
      access: 'private',
    })
    const reused = await uploadCustomBundlePaymentProofToPrivateStore({
      store: reusedStore,
      file,
      context: validContext,
    })
    assert.equal(reused.ok, true)
    assert.equal(reused.stage, 'reused')
    if (reused.ok && reused.stage === 'reused') {
      assert.equal(reused.createdByThisCall, false)
      assert.equal(reused.privateObject.access, 'private')
    }
    assert.equal(reusedStore.calls.put.length, 0)
    assert.equal(reusedStore.calls.head.length, 1)
    assertNoLeak(reused)

    const conflictStore = createMemoryStore()
    conflictStore.seedObject({
      pathname: buildCustomBundlePaymentProofPrivatePathname({
        publicCode: validContext.publicCode,
        paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
        sha256: createHash('sha256').update(makeBytes('png')).digest('hex'),
        mimeType: 'image/png',
      }),
      contentType: 'image/png',
      sizeBytes: file.size + 1,
      uploadedAt: new Date('2026-06-24T17:59:00.000Z'),
      access: 'private',
    })
    const conflict = await uploadCustomBundlePaymentProofToPrivateStore({
      store: conflictStore,
      file,
      context: validContext,
    })
    assert.equal(conflict.ok, false)
    assert.equal(conflict.stage, 'store')
    if (!conflict.ok && conflict.stage === 'store') {
      assert.equal(conflict.code, 'BLOB_IDEMPOTENCY_CONFLICT')
    }

    const invalidResponseStore = createMemoryStore()
    invalidResponseStore.setNextPutResponse({
      pathname: buildCustomBundlePaymentProofPrivatePathname({
        publicCode: validContext.publicCode,
        paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
        sha256: createHash('sha256').update(makeBytes('png')).digest('hex'),
        mimeType: 'image/png',
      }),
      contentType: 'image/png',
      sizeBytes: file.size,
      uploadedAt: new Date('2026-06-24T18:00:01.000Z'),
      access: 'private',
    })
    const invalidResponse = await uploadCustomBundlePaymentProofToPrivateStore({
      store: invalidResponseStore,
      file,
      context: validContext,
    })
    assert.equal(invalidResponse.ok, false)
    assert.equal(invalidResponse.stage, 'store')
    if (!invalidResponse.ok && invalidResponse.stage === 'store') {
      assert.equal(invalidResponse.code, 'BLOB_RESPONSE_INVALID')
    }

    const raceStore = createMemoryStore()
    const racePath = buildCustomBundlePaymentProofPrivatePathname({
      publicCode: validContext.publicCode,
      paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
      sha256: createHash('sha256').update(makeBytes('png')).digest('hex'),
      mimeType: 'image/png',
    })
    raceStore.queueHeadResponse(null)
    raceStore.queueHeadResponse({
      pathname: racePath,
      contentType: 'image/png',
      sizeBytes: file.size,
      uploadedAt: new Date('2026-06-24T17:59:30.000Z'),
      access: 'private',
    })
    raceStore.setNextPutError(makeError('OBJECT_ALREADY_EXISTS', 'object already exists'))
    const race = await uploadCustomBundlePaymentProofToPrivateStore({
      store: raceStore,
      file,
      context: validContext,
    })
    assert.equal(race.ok, true)
    assert.equal(race.stage, 'reused')
    assert.equal(raceStore.calls.put.length, 1)
    assert.equal(raceStore.calls.head.length, 2)
    assertNoLeak(race)
  }

  // 33-35: cleanup semantics.
  {
    const store = createMemoryStore()
    const pathname = buildCustomBundlePaymentProofPrivatePathname({
      publicCode: validContext.publicCode,
      paymentReportIdempotencyKey: validContext.paymentReportIdempotencyKey,
      sha256: createHash('sha256').update(makeBytes('png')).digest('hex'),
      mimeType: 'image/png',
    })
    store.seedObject({
      pathname,
      contentType: 'image/png',
      sizeBytes: makeBytes('png').byteLength,
      uploadedAt: new Date('2026-06-24T17:59:30.000Z'),
      access: 'private',
    })
    const cleanup = await deleteCustomBundlePaymentProofFromPrivateStore({
      store,
      pathname,
    })
    assert.equal(cleanup.ok, true)
    assert.equal(store.calls.delete.length, 1)

    const reuseStore = createMemoryStore()
    reuseStore.seedObject({
      pathname,
      contentType: 'image/png',
      sizeBytes: makeBytes('png').byteLength,
      uploadedAt: new Date('2026-06-24T17:59:30.000Z'),
      access: 'private',
    })
    const reused = await uploadCustomBundlePaymentProofToPrivateStore({
      store: reuseStore,
      file: makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') }),
      context: validContext,
    })
    assert.equal(reused.ok, true)
    assert.equal(reuseStore.calls.delete.length, 0)

    const unsafeCleanup = await deleteCustomBundlePaymentProofFromPrivateStore({
      store: reuseStore,
      pathname: '../escape',
    })
    assert.equal(unsafeCleanup.ok, false)
    if (!unsafeCleanup.ok) {
      assert.equal(unsafeCleanup.code, 'BLOB_CLEANUP_FAILED')
    }
  }

  // 36-38: result safety, immutability, and source hygiene.
  {
    const file = makeFileLike({ name: 'proof.png', type: 'image/png', bytes: makeBytes('png') })
    const context = makeContext()
    const beforeFile = deepClone({ name: file.name, type: file.type, size: file.size })
    const beforeContext = deepClone(context)
    const store = createMemoryStore()
    const result = await uploadCustomBundlePaymentProofToPrivateStore({
      store,
      file,
      context,
    })
    assertNoLeak(result)
    assert.deepEqual({ name: file.name, type: file.type, size: file.size }, beforeFile)
    assert.deepEqual(context, beforeContext)
  }

  console.log('booking_custom_bundle_payment_proof_boundary_contract OK')
  console.log('binary signatures: verified')
  console.log('actual byte size: verified')
  console.log('sha256: verified')
  console.log('deterministic private pathname: verified')
  console.log('private access: verified')
  console.log('idempotent object reuse: verified')
  console.log('upload race recovery: verified')
  console.log('owned cleanup: verified')
  console.log('no public url: verified')
  console.log('immutability: verified')
}

main().catch((error) => fail('Unexpected failure while validating payment proof boundary.', error))
