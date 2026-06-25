import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'
import {
  reportCustomBundlePaymentProtectedAction,
  runCustomBundlePaymentProtectedActionWithDependencies,
  parseCustomBundlePaymentActionFormData,
  type CustomBundlePaymentActionParseResult,
  type CustomBundlePaymentActionDependencies,
} from '@/lib/bookings/custom-bundle-payment-action'
import { runCustomBundleProtectedPaymentActionCore } from '@/lib/bookings/custom-bundle-payment-action-core'
import {
  runCustomBundlePaymentServerEntrypoint,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint'
import { runCustomBundlePaymentServerEntrypointCore } from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import type {
  CustomBundlePaymentServerEntrypointInput,
  CustomBundlePaymentServerEntrypointResult,
} from '@/lib/bookings/custom-bundle-payment-server-entrypoint-core'
import type { CustomBundlePaymentProofFileLike } from '@/lib/bookings/custom-bundle-payment-proof-boundary'
import type { CustomBundleProtectedPaymentActionResult } from '@/lib/bookings/custom-bundle-payment-action-core'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_action_contract FAILED')
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function makeFileLike(input: {
  name: string
  type: string
  bytes: Uint8Array
  throws?: boolean
}): CustomBundlePaymentProofFileLike & { arrayBufferCalls: { count: number } } {
  const calls = { count: 0 }
  return {
    name: input.name,
    type: input.type,
    size: input.bytes.byteLength,
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
    arrayBufferCalls: calls,
  }
}

function makeFormData(input: {
  publicCode?: FormDataEntryValue
  paymentMethod?: FormDataEntryValue
  paymentReference?: FormDataEntryValue
  paymentRecoveryToken?: FormDataEntryValue
  paymentProofFile?: FormDataEntryValue | null
  extra?: Array<[string, FormDataEntryValue]>
} = {}): FormData {
  const form = new FormData()
  if (input.publicCode !== undefined) form.append('publicCode', input.publicCode)
  if (input.paymentMethod !== undefined) form.append('paymentMethod', input.paymentMethod)
  if (input.paymentReference !== undefined) form.append('paymentReference', input.paymentReference)
  if (input.paymentRecoveryToken !== undefined) {
    form.append('paymentRecoveryToken', input.paymentRecoveryToken)
  }
  if (input.paymentProofFile !== undefined && input.paymentProofFile !== null) {
    form.append('paymentProofFile', input.paymentProofFile)
  }

  for (const [key, value] of input.extra ?? []) {
    form.append(key, value)
  }

  return form
}

function makeClock(now: Date): { now(): Date } {
  return {
    now(): Date {
      return new Date(now.getTime())
    },
  }
}

function makeThrowingClock(error: Error): { now(): Date } {
  return {
    now(): Date {
      throw error
    },
  }
}

function makeAuthorizeAdapter(): CustomBundlePaymentActionDependencies['authorizePaymentAccess'] {
  return async ({ token, expectedPublicCode, now }) => {
    const result = validatePaymentRecoveryToken(token, expectedPublicCode, now)
    return result.ok ? { ok: true } : { ok: false, reason: result.error }
  }
}

function makeEntryPointSpy(result: CustomBundlePaymentServerEntrypointResult) {
  const calls = {
    count: 0,
    inputs: [] as CustomBundlePaymentServerEntrypointInput[],
  }

  return {
    calls,
    fn: async (input: CustomBundlePaymentServerEntrypointInput): Promise<CustomBundlePaymentServerEntrypointResult> => {
      calls.count += 1
      calls.inputs.push(deepClone(input))
      return deepClone(result)
    },
  }
}

function assertNoLeak(result: unknown): void {
  const text = JSON.stringify(result)
  assert.equal(text.includes('paymentReportFingerprint'), false)
  assert.equal(text.includes('blobPathname'), false)
  assert.equal(text.includes('DATABASE_URL'), false)
  assert.equal(text.includes('BLOB_READ_WRITE_TOKEN'), false)
  assert.equal(text.includes('https://'), false)
}

function assertRequestCode(
  result: CustomBundlePaymentActionParseResult,
  code:
    | 'INVALID_ACTION_PAYLOAD'
    | 'DUPLICATE_ACTION_FIELD'
    | 'UNSUPPORTED_ACTION_FIELD',
): void {
  assert.equal(result.ok, false)
  if (result.ok) {
    fail('Expected a request failure.')
  }

  assert.equal(result.result.stage, 'request')
  assert.equal(result.result.code, code)
}

async function withEnv<T>(
  env: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    return await run()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function makeValidToken(publicCode: string, now: Date): string {
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

async function main(): Promise<void> {
  const wrapperSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-action.ts'),
    'utf8',
  )
  const coreSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-action-core.ts'),
    'utf8',
  )
  const legacyActionSource = readFileSync(resolve(process.cwd(), 'lib/bookings/actions.ts'), 'utf8')

  assert.equal(wrapperSource.startsWith("'use server'"), true)
  assert.equal(wrapperSource.includes('validatePaymentRecoveryToken'), true)
  assert.equal(wrapperSource.includes('runCustomBundlePaymentServerEntrypoint'), true)
  assert.equal(wrapperSource.includes('app/'), false)
  assert.equal(wrapperSource.includes('components/'), false)

  for (const [pattern, label] of [
    [/from\s+['"]@vercel\/blob['"]/, '@vercel/blob import'],
    [/from\s+['"]pg['"]/, 'pg import'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db import'],
    [/process\.env/, 'process.env'],
    [/['"]use server['"]/, 'use server'],
    [/Next/, 'Next'],
    [/React/, 'React'],
    [/headers|cookies/, 'headers/cookies'],
  ] as const) {
    assert.equal(pattern.test(coreSource), false, label)
  }

  assert.equal(legacyActionSource.includes('custom-bundle-payment-action'), false)
  assert.equal(legacyActionSource.includes('reportBookingPayment'), true)

  process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET ??= 'action-contract-secret'

  try {
    execFileSync(
      'rg',
      ['-n', 'custom-bundle-payment-action', 'app', 'components'],
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    fail('UI imports should not reference the protected payment action.')
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 1) {
      // Expected: no matches.
    } else if (error instanceof Error && 'status' in error) {
      throw error
    } else {
      throw error
    }
  }

  // 1-2. Invalid input / missing FormData.
  {
    const result = parseCustomBundlePaymentActionFormData(null)
    assert.equal(result.ok, false)
    assertRequestCode(result, 'INVALID_ACTION_PAYLOAD')

    const missing = parseCustomBundlePaymentActionFormData(undefined)
    assert.equal(missing.ok, false)
    assertRequestCode(missing, 'INVALID_ACTION_PAYLOAD')
  }

  // 3-7. FormData shape validation.
  {
    const duplicatePublicCode = makeFormData({
      publicCode: 'TUR-2026-001',
      paymentMethod: 'efectivo',
      paymentReference: 'REF-100',
      paymentRecoveryToken: 'token',
      extra: [['publicCode', 'TUR-2026-002']],
    })
    const duplicateToken = makeFormData({
      publicCode: 'TUR-2026-001',
      paymentMethod: 'efectivo',
      paymentReference: 'REF-100',
      paymentRecoveryToken: 'token',
      extra: [['paymentRecoveryToken', 'token-2']],
    })
    const duplicateProof = makeFormData({
      publicCode: 'TUR-2026-001',
      paymentMethod: 'efectivo',
      paymentReference: 'REF-100',
      paymentRecoveryToken: 'token',
      paymentProofFile: new File([toArrayBuffer(makeBytes('png'))], 'proof.png', {
        type: 'image/png',
      }),
      extra: [
        [
          'paymentProofFile',
          new File([toArrayBuffer(makeBytes('png'))], 'proof-2.png', {
            type: 'image/png',
          }),
        ],
      ],
    })
    const unknownField = makeFormData({
      publicCode: 'TUR-2026-001',
      paymentMethod: 'efectivo',
      paymentReference: 'REF-100',
      paymentRecoveryToken: 'token',
      extra: [['unexpectedField', 'boom']],
    })
    const ignoredActionField = makeFormData({
      publicCode: 'TUR-2026-001',
      paymentMethod: 'efectivo',
      paymentReference: 'REF-100',
      paymentRecoveryToken: 'token',
      extra: [['$ACTION_foo', 'ignored']],
    })

    const duplicatePublicCodeResult = parseCustomBundlePaymentActionFormData(duplicatePublicCode)
    assert.equal(duplicatePublicCodeResult.ok, false)
    assertRequestCode(duplicatePublicCodeResult, 'DUPLICATE_ACTION_FIELD')

    const duplicateTokenResult = parseCustomBundlePaymentActionFormData(duplicateToken)
    assert.equal(duplicateTokenResult.ok, false)
    assertRequestCode(duplicateTokenResult, 'DUPLICATE_ACTION_FIELD')

    const duplicateProofResult = parseCustomBundlePaymentActionFormData(duplicateProof)
    assert.equal(duplicateProofResult.ok, false)
    assertRequestCode(duplicateProofResult, 'DUPLICATE_ACTION_FIELD')

    const unknownFieldResult = parseCustomBundlePaymentActionFormData(unknownField)
    assert.equal(unknownFieldResult.ok, false)
    assertRequestCode(unknownFieldResult, 'UNSUPPORTED_ACTION_FIELD')

    const ignoredActionResult = parseCustomBundlePaymentActionFormData(ignoredActionField)
    assert.equal(ignoredActionResult.ok, true)
    if (ignoredActionResult.ok) {
      assert.equal(ignoredActionResult.value.publicCode, 'TUR-2026-001')
      assert.equal(ignoredActionResult.value.paymentProofFile, null)
    }
  }

  // 8-10. Token length and early security gating.
  {
    const longToken = 'a'.repeat(4097)
    const dependencies = {
      runtime: 'isolated_test' as const,
      killSwitchEnabled: true,
      clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
      authorizePaymentAccess: makeAuthorizeAdapter(),
      runServerEntrypoint: async (): Promise<CustomBundlePaymentServerEntrypointResult> => {
        fail('Entry point must not run for an oversized token.')
      },
    }

    const oversized = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: longToken,
      }),
      dependencies,
    )
    assert.equal(oversized.ok, false)
    assert.equal(oversized.stage, 'request')
    if (!oversized.ok) {
      assert.equal(oversized.code, 'INVALID_ACTION_PAYLOAD')
    }
    assertNoLeak(oversized)

    const invalid = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'not-a-token',
      }),
      {
        ...dependencies,
        runServerEntrypoint: async () => {
          fail('Entry point must not run for an invalid token.')
        },
      },
    )
    assert.equal(invalid.ok, false)
    assert.equal(invalid.stage, 'authorization')
    if (!invalid.ok) {
      assert.equal(invalid.code, 'PAYMENT_ACCESS_DENIED')
    }
    assertNoLeak(invalid)

    const token = makeValidToken('TUR-2026-001', new Date('2026-06-24T18:00:00.000Z'))
    const expired = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: token,
      }),
      {
        ...dependencies,
        clock: makeClock(new Date('2026-06-24T18:16:00.000Z')),
        runServerEntrypoint: async () => {
          fail('Entry point must not run for an expired token.')
        },
      },
    )
    assert.equal(expired.ok, false)
    assert.equal(expired.stage, 'authorization')
    assertNoLeak(expired)

    const boundary = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: token,
      }),
      {
        ...dependencies,
        clock: makeClock(new Date('2026-06-24T18:15:00.000Z')),
        runServerEntrypoint: async () => {
          fail('Entry point must not run on the exact expiry boundary.')
        },
      },
    )
    assert.equal(boundary.ok, false)
    assert.equal(boundary.stage, 'authorization')
    assertNoLeak(boundary)

    const mismatch = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: makeValidToken('TUR-2026-999', new Date('2026-06-24T18:00:00.000Z')),
      }),
      {
        ...dependencies,
        runServerEntrypoint: async () => {
          fail('Entry point must not run for a code mismatch.')
        },
      },
    )
    assert.equal(mismatch.ok, false)
    assert.equal(mismatch.stage, 'authorization')
    assertNoLeak(mismatch)
  }

  // 14-17. Authorizer and clock failure mapping.
  {
    const baseDependencies: CustomBundlePaymentActionDependencies = {
      runtime: 'isolated_test',
      killSwitchEnabled: true,
      clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
      authorizePaymentAccess: makeAuthorizeAdapter(),
      runServerEntrypoint: async () => {
        fail('Entry point must not run for authorizer or clock failures.')
      },
    }

    await withEnv(
      { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: undefined },
      async () => {
        const result = await runCustomBundlePaymentProtectedActionWithDependencies(
          makeFormData({
            publicCode: 'TUR-2026-001',
            paymentMethod: 'efectivo',
            paymentReference: 'REF-100',
            paymentRecoveryToken: 'token',
          }),
          baseDependencies,
        )
        assert.equal(result.ok, false)
        assert.equal(result.stage, 'authorization')
        if (!result.ok) {
          assert.equal(result.code, 'PAYMENT_ACCESS_UNAVAILABLE')
        }
        assertNoLeak(result)
      },
    )

    const authorizerThrows = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'token',
      }),
      {
        ...baseDependencies,
        authorizePaymentAccess: async () => {
          throw new Error('authorizer failed')
        },
      },
    )
    assert.equal(authorizerThrows.ok, false)
    assert.equal(authorizerThrows.stage, 'authorization')
    assertNoLeak(authorizerThrows)

    const invalidClock = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'token',
      }),
      {
        ...baseDependencies,
        clock: makeClock(new Date('invalid')),
      },
    )
    assert.equal(invalidClock.ok, false)
    assert.equal(invalidClock.stage, 'authorization')
    assertNoLeak(invalidClock)

    const throwingClock = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'token',
      }),
      {
        ...baseDependencies,
        clock: makeThrowingClock(new Error('clock failure')),
      },
    )
    assert.equal(throwingClock.ok, false)
    assert.equal(throwingClock.stage, 'authorization')
    assertNoLeak(throwingClock)
  }

  // 11-13, 18-22. Authorization ordering and call-order guarantees.
  {
    const clock = makeClock(new Date('2026-06-24T18:00:00.000Z'))
    const { calls, fn } = makeEntryPointSpy({
      ok: true,
      stage: 'simulated',
      simulated: true,
      message: 'ok',
    })
    const proofFile = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('png'),
      throws: true,
    })
    const authBeforeMethod = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'bad-method',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'invalid-token',
      }),
      {
        runtime: 'isolated_test',
        killSwitchEnabled: true,
        clock,
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: fn,
      },
    )
    assert.equal(authBeforeMethod.ok, false)
    assert.equal(authBeforeMethod.stage, 'authorization')
    assert.equal(calls.count, 0)

    const authBeforeFileRead = await runCustomBundleProtectedPaymentActionCore(
      {
        clock,
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: fn,
      },
      {
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'invalid-token',
        paymentProofFile: proofFile,
      },
    )
    assert.equal(authBeforeFileRead.ok, false)
    assert.equal(authBeforeFileRead.stage, 'authorization')
    assert.equal(calls.count, 0)
    assert.equal(proofFile.arrayBufferCalls.count, 0)

    const authBeforeInfrastructure = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'invalid-token',
      }),
      {
        runtime: 'isolated_test',
        killSwitchEnabled: true,
        clock,
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: fn,
      },
    )
    assert.equal(authBeforeInfrastructure.ok, false)
    assert.equal(authBeforeInfrastructure.stage, 'authorization')
    assert.equal(calls.count, 0)

    const validToken = makeValidToken('TUR-2026-001', new Date('2026-06-24T18:00:00.000Z'))
    const validResult = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: validToken,
      }),
      {
        runtime: 'isolated_test',
        killSwitchEnabled: true,
        clock,
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: fn,
      },
    )
    assert.equal(validResult.ok, true)
    assert.equal(calls.count, 1)
    if (calls.inputs[0]) {
      assert.deepEqual(Object.keys(calls.inputs[0]).sort(), ['paymentProofFile', 'submission'])
      assert.equal('paymentRecoveryToken' in calls.inputs[0], false)
      assert.equal('paymentReportIdempotencyKey' in calls.inputs[0], false)
      assert.equal('bookingRequestId' in calls.inputs[0], false)
    }
  }

  // 18-25. Requested request-field rejections and placeholder normalization.
  {
    for (const [field, label] of [
      ['paymentReportIdempotencyKey', 'client idempotency key'],
      ['bookingRequestId', 'bookingRequestId'],
      ['amount', 'amount'],
    ] as const) {
      const result = parseCustomBundlePaymentActionFormData(
        makeFormData({
          publicCode: 'TUR-2026-001',
          paymentMethod: 'efectivo',
          paymentReference: 'REF-100',
          paymentRecoveryToken: 'token',
          extra: [[field, 'reject-me']],
        }),
      )
      assert.equal(result.ok, false, label)
      assertRequestCode(result, 'UNSUPPORTED_ACTION_FIELD')
    }

    const placeholder = new File([], '', { type: '' })
    const parsedPlaceholder = parseCustomBundlePaymentActionFormData(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: 'token',
        paymentProofFile: placeholder,
      }),
    )
    assert.equal(parsedPlaceholder.ok, true)
    if (parsedPlaceholder.ok) {
      assert.equal(parsedPlaceholder.value.paymentProofFile, null)
    }

    const preservedFile = makeFileLike({
      name: 'proof.png',
      type: 'image/png',
      bytes: makeBytes('png'),
    })
    const preservedResult = await runCustomBundleProtectedPaymentActionCore(
      {
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: async (input) => {
          assert.equal(input.paymentProofFile, preservedFile)
          assert.equal(preservedFile.arrayBufferCalls.count, 0)
          return {
            ok: true,
            stage: 'simulated',
            simulated: true,
            message: 'ok',
          }
        },
      },
      {
        publicCode: 'TUR-2026-001',
        paymentMethod: 'pago_movil',
        paymentReference: 'REF-100',
        paymentRecoveryToken: makeValidToken('TUR-2026-001', new Date('2026-06-24T18:00:00.000Z')),
        paymentProofFile: preservedFile,
      },
    )
    assert.equal(preservedResult.ok, true)
  }

  // 26-28. Preview simulation through the real server action.
  {
    await withEnv(
      {
        VERCEL_ENV: 'preview',
        BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'action-contract-secret',
      },
      async () => {
        const previewNow = new Date()
        const token = makeValidToken('TUR-2026-001', previewNow)
        const proofFile = makeFileLike({
          name: 'proof.png',
          type: 'image/png',
          bytes: makeBytes('png'),
        })

        const result = await reportCustomBundlePaymentProtectedAction(
          makeFormData({
            publicCode: 'TUR-2026-001',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
            paymentRecoveryToken: token,
            paymentProofFile: new File([toArrayBuffer(makeBytes('png'))], 'proof.png', {
              type: 'image/png',
            }),
          }),
        )
        assert.equal(result.ok, true)
        assert.equal(result.stage, 'simulated')
        assertNoLeak(result)

        const wrapperResult = await runCustomBundlePaymentServerEntrypoint({
          submission: {
            publicCode: 'TUR-2026-001',
            paymentMethod: 'pago_movil',
            paymentReference: 'REF-100',
          },
          paymentProofFile: proofFile,
        })
        assert.equal(wrapperResult.ok, true)
        assert.equal(wrapperResult.stage, 'simulated')
        assertNoLeak(wrapperResult)

        const previewInfra = {
          sql: 0,
          blob: 0,
        }
        const coreResult = await runCustomBundlePaymentServerEntrypointCore(
          {
            runtime: 'preview',
            clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
            async openSqlSession() {
              previewInfra.sql += 1
              fail('Preview must not open SQL sessions.')
            },
            async createPrivateBlobStore() {
              previewInfra.blob += 1
              fail('Preview must not create private blob stores.')
            },
          },
          {
            submission: {
              publicCode: 'TUR-2026-001',
              paymentMethod: 'pago_movil',
              paymentReference: 'REF-100',
            },
            paymentProofFile: proofFile,
          },
        )
        assert.equal(coreResult.ok, true)
        assert.equal(coreResult.stage, 'simulated')
        assert.equal(previewInfra.sql, 0)
        assert.equal(previewInfra.blob, 0)
      },
    )
  }

  // 29-34. Sanitization and production kill switch.
  {
    const token = makeValidToken('TUR-2026-001', new Date('2026-06-24T18:00:00.000Z'))
    const simulated = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: token,
      }),
      {
        runtime: 'isolated_test',
        killSwitchEnabled: true,
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: async () => ({
          ok: true,
          stage: 'simulated',
          simulated: true,
          message: 'Simulated',
        }),
      },
    )
    assert.equal(simulated.ok, true)
    assertNoLeak(simulated)

    const blockedSpy = makeEntryPointSpy({
      ok: true,
      stage: 'simulated',
      simulated: true,
      message: 'blocked',
    })
    const blocked = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: token,
      }),
      {
        runtime: 'production',
        killSwitchEnabled: false,
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: blockedSpy.fn,
      },
    )
    assert.equal(blocked.ok, false)
    assert.equal(blocked.stage, 'infrastructure')
    if (!blocked.ok) {
      assert.equal(blocked.code, 'PAYMENT_ACTION_DISABLED')
    }
    assert.equal(blockedSpy.calls.count, 0)

    const enabledSpy = makeEntryPointSpy({
      ok: true,
      stage: 'simulated',
      simulated: true,
      message: 'enabled',
    })
    const enabled = await runCustomBundlePaymentProtectedActionWithDependencies(
      makeFormData({
        publicCode: 'TUR-2026-001',
        paymentMethod: 'efectivo',
        paymentReference: 'REF-100',
        paymentRecoveryToken: token,
      }),
      {
        runtime: 'production',
        killSwitchEnabled: true,
        clock: makeClock(new Date('2026-06-24T18:00:00.000Z')),
        authorizePaymentAccess: makeAuthorizeAdapter(),
        runServerEntrypoint: enabledSpy.fn,
      },
    )
    assert.equal(enabled.ok, true)
    assert.equal(enabledSpy.calls.count, 1)
  }

  // 35-38. Source hygiene and legacy separation.
  {
    assert.equal(wrapperSource.startsWith("'use server'"), true)
    assert.equal(wrapperSource.includes('notifications'), false)
    assert.equal(wrapperSource.includes('use server'), true)
    assert.equal(coreSource.includes('notifications'), false)
    assert.equal(legacyActionSource.includes('custom-bundle-payment-action'), false)
    assert.equal(legacyActionSource.includes('reportBookingPayment'), true)
    assert.equal(coreSource.includes('custom-bundle-payment-action'), false)
  }

  console.log('booking_custom_bundle_payment_action_contract OK')
  console.log('signed capability authorization: verified')
  console.log('exact token expiry boundary: verified')
  console.log('authorization before file read: verified')
  console.log('authorization before infrastructure: verified')
  console.log('server-only action: verified')
  console.log('production kill switch: verified')
  console.log('sanitized action result: verified')
  console.log('no client idempotency: verified')
  console.log('legacy separation: verified')
  console.log('no UI wiring: verified')
}

main().catch((error) => fail('Unexpected failure while validating the protected payment action contract.', error))
