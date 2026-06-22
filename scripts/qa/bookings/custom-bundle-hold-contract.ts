import assert from 'node:assert/strict'

import {
  buildCustomBundleHoldFingerprint,
  buildCustomBundleHoldWindow,
  classifyCustomBundleIdempotencyReplay,
  CUSTOM_BUNDLE_HOLD_CONTRACT_VERSION,
  CUSTOM_BUNDLE_HOLD_TEST_WINDOW_MINUTES,
  isCustomBundleHoldActive,
  prepareCustomBundleHoldContract,
  validateCustomBundleHoldServerContext,
} from '@/lib/bookings/custom-bundle-hold-contract'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'

function fail(message: string): never {
  console.error('booking_custom_bundle_hold_contract FAILED')
  console.error(message)
  process.exit(1)
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildSubmission(overrides: Partial<CustomBundleSubmissionInputV1> = {}): CustomBundleSubmissionInputV1 {
  const base: CustomBundleSubmissionInputV1 = {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observacion canonical de hold  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items: [
      { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
      { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
    ],
  }

  return {
    ...base,
    ...overrides,
    requester: {
      ...base.requester,
      ...(overrides.requester ?? {}),
    },
    items: overrides.items ?? base.items,
  }
}

function makeServerContext(overrides: Partial<{ idempotencyKey: string; now: Date; holdDurationMinutes: number }> = {}) {
  return {
    idempotencyKey: '  HOLD_2026:06:22-0001  ',
    now: new Date('2026-06-22T16:00:00.000Z'),
    holdDurationMinutes: CUSTOM_BUNDLE_HOLD_TEST_WINDOW_MINUTES,
    ...overrides,
  }
}

function assertHoldContextIssueCodes(
  issues: ReturnType<typeof validateCustomBundleHoldServerContext>,
  expectedCodes: readonly string[],
): void {
  assert.deepStrictEqual(
    issues.map((issue) => issue.code).sort(),
    [...expectedCodes].sort(),
  )
}

function assertFingerprintHex(value: string): void {
  assert.match(value, /^[0-9a-f]{64}$/)
}

function main(): void {
  assert.equal(CUSTOM_BUNDLE_HOLD_CONTRACT_VERSION, 'custom_bundle_hold_v1')
  assert.equal(CUSTOM_BUNDLE_HOLD_TEST_WINDOW_MINUTES, 60)

  const canonicalSubmission = buildSubmission()
  const canonicalServerContext = makeServerContext()

  const canonicalSnapshot = cloneDeep(canonicalSubmission)
  const canonicalResult = prepareCustomBundleHoldContract({
    submission: canonicalSubmission,
    serverContext: canonicalServerContext,
  })

  assert.equal(canonicalResult.ok, true)
  assert.equal(canonicalResult.stage, 'ready')
  if (!canonicalResult.ok) {
    throw new Error('Expected ready hold contract result.')
  }

  assert.equal(canonicalResult.value.idempotencyKey, 'HOLD_2026:06:22-0001')
  assert.equal(canonicalResult.value.holdDurationMinutes, 60)
  assertFingerprintHex(canonicalResult.value.requestFingerprint)
  assert.deepStrictEqual(canonicalSubmission, canonicalSnapshot)

  const windowResult = buildCustomBundleHoldWindow(
    canonicalServerContext.now,
    canonicalServerContext.holdDurationMinutes,
  )
  assert.equal(windowResult.ok, true)
  if (!windowResult.ok) {
    throw new Error('Expected a valid hold window.')
  }

  assert.equal(
    windowResult.expiresAt.getTime() - windowResult.acquiredAt.getTime(),
    CUSTOM_BUNDLE_HOLD_TEST_WINDOW_MINUTES * 60_000,
  )
  assert.equal(canonicalResult.value.holdAcquiredAtIso, windowResult.acquiredAtIso)
  assert.equal(canonicalResult.value.holdExpiresAtIso, windowResult.expiresAtIso)

  const ready = canonicalResult.value
  const requirementMap = new Map(ready.requirements.map((requirement) => [requirement.itemSlug, requirement]))
  const studioSessionRequirement = requirementMap.get('studio-session')
  const consultoriaRequirement = requirementMap.get('consultoria-produccion')
  assert.ok(studioSessionRequirement)
  assert.ok(consultoriaRequirement)
  assert.equal(studioSessionRequirement?.mode, 'no_physical_resource')
  assert.deepStrictEqual(studioSessionRequirement?.candidateResourceSlugs, [])
  assert.equal(consultoriaRequirement?.mode, 'no_physical_resource')
  assert.deepStrictEqual(consultoriaRequirement?.candidateResourceSlugs, [])

  const fingerprintWithoutNoPhysicalRequirements = buildCustomBundleHoldFingerprint({
    quote: ready.quote,
    schedule: ready.schedule,
    requirements: ready.requirements.filter(
      (requirement) =>
        requirement.itemSlug !== 'studio-session' && requirement.itemSlug !== 'consultoria-produccion',
    ),
  })
  assert.notEqual(fingerprintWithoutNoPhysicalRequirements, ready.requestFingerprint)

  const reversedSubmission = buildSubmission({
    items: [...buildSubmission().items].reverse(),
  })
  const reversedResult = prepareCustomBundleHoldContract({
    submission: reversedSubmission,
    serverContext: makeServerContext(),
  })
  assert.equal(reversedResult.ok, true)
  assert.equal(reversedResult.stage, 'ready')
  if (!reversedResult.ok) {
    throw new Error('Expected ready hold contract result for reversed submission.')
  }
  assert.equal(reversedResult.value.requestFingerprint, ready.requestFingerprint)

  const normalizedRequesterResult = prepareCustomBundleHoldContract({
    submission: buildSubmission({
      requester: {
        name: '  Ana Perez  ',
        email: 'ANA@example.com ',
        phone: '  +58 412-123-4567  ',
        whatsappConsentAccepted: true,
      },
    }),
    serverContext: makeServerContext(),
  })
  assert.equal(normalizedRequesterResult.ok, true)
  assert.equal(normalizedRequesterResult.stage, 'ready')
  if (!normalizedRequesterResult.ok) {
    throw new Error('Expected ready hold contract result for normalized requester.')
  }
  assert.equal(normalizedRequesterResult.value.requestFingerprint, ready.requestFingerprint)

  const quantityChangedResult = prepareCustomBundleHoldContract({
    submission: buildSubmission({
      items: buildSubmission().items.map((item) =>
        item.itemSlug === 'sala-premium' ? { ...item, quantity: 3 } : item,
      ),
    }),
    serverContext: makeServerContext(),
  })
  assert.equal(quantityChangedResult.ok, true)
  assert.equal(quantityChangedResult.stage, 'ready')
  if (!quantityChangedResult.ok) {
    throw new Error('Expected ready hold contract result for quantity change.')
  }
  assert.notEqual(quantityChangedResult.value.requestFingerprint, ready.requestFingerprint)

  const dateChangedResult = prepareCustomBundleHoldContract({
    submission: buildSubmission({ eventDate: '2026-06-25' }),
    serverContext: makeServerContext(),
  })
  assert.equal(dateChangedResult.ok, true)
  assert.equal(dateChangedResult.stage, 'ready')
  if (!dateChangedResult.ok) {
    throw new Error('Expected ready hold contract result for date change.')
  }
  assert.notEqual(dateChangedResult.value.requestFingerprint, ready.requestFingerprint)

  const timeChangedResult = prepareCustomBundleHoldContract({
    submission: buildSubmission({ startTime: '11:00' }),
    serverContext: makeServerContext(),
  })
  assert.equal(timeChangedResult.ok, true)
  assert.equal(timeChangedResult.stage, 'ready')
  if (!timeChangedResult.ok) {
    throw new Error('Expected ready hold contract result for time change.')
  }
  assert.notEqual(timeChangedResult.value.requestFingerprint, ready.requestFingerprint)

  const requesterChangedResult = prepareCustomBundleHoldContract({
    submission: buildSubmission({
      requester: {
        name: 'Ana Different',
        email: 'ana.different@example.com',
        phone: '+58 414 123 4567',
        whatsappConsentAccepted: true,
      },
    }),
    serverContext: makeServerContext(),
  })
  assert.equal(requesterChangedResult.ok, true)
  assert.equal(requesterChangedResult.stage, 'ready')
  if (!requesterChangedResult.ok) {
    throw new Error('Expected ready hold contract result for requester change.')
  }
  assert.notEqual(requesterChangedResult.value.requestFingerprint, ready.requestFingerprint)

  const invalidContextCodes = (key: string) =>
    validateCustomBundleHoldServerContext(makeServerContext({ idempotencyKey: key }))
  assertHoldContextIssueCodes(invalidContextCodes('short'), ['INVALID_IDEMPOTENCY_KEY'])
  assertHoldContextIssueCodes(invalidContextCodes('x'.repeat(129)), ['INVALID_IDEMPOTENCY_KEY'])
  assertHoldContextIssueCodes(
    invalidContextCodes('invalid key with spaces'),
    ['INVALID_IDEMPOTENCY_KEY'],
  )
  assertHoldContextIssueCodes(
    invalidContextCodes('invalid*characters*value'),
    ['INVALID_IDEMPOTENCY_KEY'],
  )
  assertHoldContextIssueCodes(
    validateCustomBundleHoldServerContext({
      idempotencyKey: 'HOLD_2026:06:22-0001',
      now: new Date('not-a-date'),
      holdDurationMinutes: 60,
    }),
    ['INVALID_NOW'],
  )
  assertHoldContextIssueCodes(
    validateCustomBundleHoldServerContext({
      idempotencyKey: 'HOLD_2026:06:22-0001',
      now: new Date('2026-06-22T16:00:00.000Z'),
      holdDurationMinutes: 0,
    }),
    ['INVALID_HOLD_DURATION'],
  )
  assertHoldContextIssueCodes(
    validateCustomBundleHoldServerContext({
      idempotencyKey: 'HOLD_2026:06:22-0001',
      now: new Date('2026-06-22T16:00:00.000Z'),
      holdDurationMinutes: -1,
    }),
    ['INVALID_HOLD_DURATION'],
  )
  assertHoldContextIssueCodes(
    validateCustomBundleHoldServerContext({
      idempotencyKey: 'HOLD_2026:06:22-0001',
      now: new Date('2026-06-22T16:00:00.000Z'),
      holdDurationMinutes: 60.5,
    }),
    ['INVALID_HOLD_DURATION'],
  )
  assertHoldContextIssueCodes(
    validateCustomBundleHoldServerContext({
      idempotencyKey: 'HOLD_2026:06:22-0001',
      now: new Date('2026-06-22T16:00:00.000Z'),
      holdDurationMinutes: 181,
    }),
    ['INVALID_HOLD_DURATION'],
  )

  const activeReplay = classifyCustomBundleIdempotencyReplay({
    requestedIdempotencyKey: ready.idempotencyKey,
    requestedFingerprint: ready.requestFingerprint,
    existing: {
      idempotencyKey: ready.idempotencyKey,
      requestFingerprint: ready.requestFingerprint,
      holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
    },
    now: new Date('2026-06-22T16:30:00.000Z'),
  })
  assert.equal(activeReplay, 'active_replay')

  const expiredReplay = classifyCustomBundleIdempotencyReplay({
    requestedIdempotencyKey: ready.idempotencyKey,
    requestedFingerprint: ready.requestFingerprint,
    existing: {
      idempotencyKey: ready.idempotencyKey,
      requestFingerprint: ready.requestFingerprint,
      holdExpiresAt: new Date('2026-06-22T15:59:59.000Z'),
    },
    now: new Date('2026-06-22T16:00:00.000Z'),
  })
  assert.equal(expiredReplay, 'expired_replay')

  const replayAtExpiration = classifyCustomBundleIdempotencyReplay({
    requestedIdempotencyKey: ready.idempotencyKey,
    requestedFingerprint: ready.requestFingerprint,
    existing: {
      idempotencyKey: ready.idempotencyKey,
      requestFingerprint: ready.requestFingerprint,
      holdExpiresAt: new Date('2026-06-22T16:00:00.000Z'),
    },
    now: new Date('2026-06-22T16:00:00.000Z'),
  })
  assert.equal(replayAtExpiration, 'expired_replay')

  assert.equal(
    isCustomBundleHoldActive(
      new Date('2026-06-22T16:00:01.000Z'),
      new Date('2026-06-22T16:00:00.000Z'),
    ),
    true,
  )
  assert.equal(
    isCustomBundleHoldActive(
      new Date('2026-06-22T16:00:00.000Z'),
      new Date('2026-06-22T16:00:00.000Z'),
    ),
    false,
  )

  const conflictingReplay = classifyCustomBundleIdempotencyReplay({
    requestedIdempotencyKey: ready.idempotencyKey,
    requestedFingerprint: ready.requestFingerprint,
    existing: {
      idempotencyKey: ready.idempotencyKey,
      requestFingerprint: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      holdExpiresAt: new Date('2026-06-22T17:00:00.000Z'),
    },
    now: new Date('2026-06-22T16:00:00.000Z'),
  })
  assert.equal(conflictingReplay, 'key_reused_for_different_request')

  const noExistingRecord = classifyCustomBundleIdempotencyReplay({
    requestedIdempotencyKey: ready.idempotencyKey,
    requestedFingerprint: ready.requestFingerprint,
    existing: null,
    now: new Date('2026-06-22T16:00:00.000Z'),
  })
  assert.equal(noExistingRecord, 'no_existing_record')

  const submissionSnapshot = cloneDeep(ready.quote.submission)
  const quoteSnapshot = cloneDeep(ready.quote)
  const scheduleSnapshot = cloneDeep(ready.schedule)
  const requirementsSnapshot = cloneDeep(ready.requirements)
  const fingerprintAfterRebuild = buildCustomBundleHoldFingerprint({
    quote: ready.quote,
    schedule: ready.schedule,
    requirements: ready.requirements,
  })

  assert.equal(fingerprintAfterRebuild, ready.requestFingerprint)
  assert.deepStrictEqual(ready.quote.submission, submissionSnapshot)
  assert.deepStrictEqual(ready.quote, quoteSnapshot)
  assert.deepStrictEqual(ready.schedule, scheduleSnapshot)
  assert.deepStrictEqual(ready.requirements, requirementsSnapshot)

  console.log('booking_custom_bundle_hold_contract OK')
  console.log('hold window: verified')
  console.log('canonical fingerprint: verified')
  console.log('input order independence: verified')
  console.log('active replay: verified')
  console.log('expired replay: verified')
  console.log('idempotency conflict: verified')
  console.log('immutability: verified')
}

try {
  main()
} catch (error) {
  if (error instanceof assert.AssertionError) {
    fail(error.message)
  }

  if (error instanceof Error) {
    fail(error.message)
  }

  fail('Unexpected failure while validating the hold contract.')
}
