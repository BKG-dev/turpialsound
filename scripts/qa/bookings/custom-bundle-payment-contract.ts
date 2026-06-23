import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCustomBundlePaymentReportFingerprint,
  classifyCustomBundlePaymentReplay,
  CUSTOM_BUNDLE_PAYMENT_CONTRACT_VERSION,
  CUSTOM_BUNDLE_PAYMENT_METHODS,
  CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES,
  CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS,
  evaluateCustomBundlePaymentEligibility,
  normalizeCustomBundlePaymentReference,
  prepareCustomBundlePaymentReport,
  validateCustomBundlePaymentReportSubmission,
  validateCustomBundlePaymentServerContext,
  validateCustomBundleTrustedPaymentProofMetadata,
  type CustomBundlePaymentBookingSnapshot,
  type CustomBundlePaymentReportSubmission,
  type CustomBundlePaymentServerContext,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'

function fail(message: string): never {
  console.error('booking_custom_bundle_payment_contract FAILED')
  console.error(message)
  process.exit(1)
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function makeSubmission(
  overrides: Partial<CustomBundlePaymentReportSubmission> = {},
): CustomBundlePaymentReportSubmission {
  return {
    publicCode: 'TUR-2026-001',
    paymentMethod: 'pago_movil',
    paymentReference: ' ref-001 ',
    ...overrides,
  }
}

function makeProofMetadata(
  overrides: Partial<CustomBundleTrustedPaymentProofMetadata> = {},
): CustomBundleTrustedPaymentProofMetadata {
  return {
    blobPathname: 'payment-proofs/TUR-2026-001/20260623T140000000Z-abc123.webp',
    sha256: 'a'.repeat(64),
    mimeType: 'image/png',
    sizeBytes: 2048,
    originalFilename: 'proof.png',
    uploadedAt: new Date('2026-06-23T14:00:00.000Z'),
    ...overrides,
  }
}

function makeServerContext(
  overrides: Partial<CustomBundlePaymentServerContext> = {},
): CustomBundlePaymentServerContext {
  return {
    now: new Date('2026-06-23T14:30:00.000Z'),
    paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0001',
    proofMetadata: null,
    ...overrides,
  }
}

function makeBookingSnapshot(
  overrides: Partial<CustomBundlePaymentBookingSnapshot> = {},
): CustomBundlePaymentBookingSnapshot {
  return {
    id: 'booking-payment-001',
    publicCode: 'TUR-2026-001',
    status: 'under_review',
    internalNotes: '[ops_status:pending_payment]',
    bookingMode: 'custom_bundle',
    pricingSource: 'server_catalog_v1',
    holdAcquiredAt: new Date('2026-06-23T14:00:00.000Z'),
    holdExpiresAt: new Date('2026-06-23T15:00:00.000Z'),
    estimatedTotalUsd: 280,
    currency: 'USD',
    existingPaymentReport: null,
    ...overrides,
  }
}

function assertParseFailure(
  input: unknown,
  expectedCode: string,
  expectedPath: Array<string | number>,
): void {
  const result = validateCustomBundlePaymentReportSubmission(input)
  assert.equal(result.ok, false)
  if (result.ok) {
    throw new Error('Expected submission parsing to fail.')
  }

  assert.ok(result.issues.some((issue) => issue.code === expectedCode))
  assert.deepStrictEqual(result.issues[0]?.path, expectedPath)
}

function assertServerContextFailure(
  context: CustomBundlePaymentServerContext,
  expectedCode: string,
): void {
  const issues = validateCustomBundlePaymentServerContext(context)
  assert.ok(issues.some((issue) => issue.code === expectedCode))
}

function assertProofIssue(
  metadata: unknown,
  now: Date,
  expectedCode: string,
): void {
  const issues = validateCustomBundleTrustedPaymentProofMetadata(metadata, now)
  assert.ok(issues.some((issue) => issue.code === expectedCode))
}

function assertEligibilityCodes(
  booking: CustomBundlePaymentBookingSnapshot,
  expectedCodes: readonly string[],
): void {
  const issues = evaluateCustomBundlePaymentEligibility({
    booking,
    now: new Date('2026-06-23T14:30:00.000Z'),
  })
  assert.deepStrictEqual(
    issues.map((issue) => issue.code).sort(),
    [...expectedCodes].sort(),
  )
}

function assertPreparedStage(
  result: Awaited<ReturnType<typeof prepareCustomBundlePaymentReport>>,
  expectedStage: 'ready' | 'replay' | 'contract' | 'server_context' | 'proof_policy' | 'booking_eligibility',
): void {
  assert.equal(result.stage, expectedStage)
}

function assertNoForbiddenSourcePatterns(source: string): void {
  for (const [pattern, label] of [
    [/from\s+['"]prisma['"]/, 'Prisma import'],
    [/from\s+['"]@\/lib\/db['"]/, 'lib/db import'],
    [/process\.env/, 'process.env'],
    [/fetch\s*\(/, 'fetch'],
    [/['"]use server['"]/, 'use server'],
    [/payment-settings\.ts/, 'payment-settings.ts import'],
    [/payment-proof-upload\.ts/, 'payment-proof-upload.ts import'],
    [/@vercel\/blob/, 'Blob import'],
  ] as const) {
    assert.equal(pattern.test(source), false, label)
  }
}

function main(): void {
  assert.equal(CUSTOM_BUNDLE_PAYMENT_CONTRACT_VERSION, 'custom_bundle_payment_v1')
  assert.deepStrictEqual(CUSTOM_BUNDLE_PAYMENT_METHODS, [
    'pago_movil',
    'transferencia',
    'binance',
    'efectivo',
  ])
  assert.deepStrictEqual(CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES, [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ])
  assert.deepStrictEqual(CUSTOM_BUNDLE_PAYMENT_PROOF_REQUIRED_METHODS, [
    'pago_movil',
    'transferencia',
    'binance',
  ])
  assert.equal(CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES, 4_718_592)
  assert.equal(normalizeCustomBundlePaymentReference(' ref-001 '), 'REF001')
  assert.equal(normalizeCustomBundlePaymentReference('REF 001'), 'REF001')
  assert.equal(normalizeCustomBundlePaymentReference('ref_001'), 'REF001')

  const contractSource = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-payment-contract.ts'),
    'utf8',
  )
  assertNoForbiddenSourcePatterns(contractSource)
  assert.match(contractSource, /CUSTOM_BUNDLE_PAYMENT_CONTRACT_VERSION/)
  assert.match(contractSource, /validateCustomBundlePaymentReportSubmission/)
  assert.match(contractSource, /validateCustomBundleTrustedPaymentProofMetadata/)
  assert.match(contractSource, /evaluateCustomBundlePaymentEligibility/)
  assert.match(contractSource, /classifyCustomBundlePaymentReplay/)

  assertParseFailure(null, 'INVALID_SUBMISSION', [])
  assertParseFailure(
    {
      publicCode: 'BAD',
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-001',
    },
    'INVALID_PUBLIC_CODE',
    ['publicCode'],
  )
  assertParseFailure(
    {
      publicCode: 'TUR-2026-001',
      paymentMethod: 'cash',
      paymentReference: 'REF-001',
    },
    'INVALID_PAYMENT_METHOD',
    ['paymentMethod'],
  )
  assertParseFailure(
    {
      publicCode: 'TUR-2026-001',
      paymentMethod: 'pago_movil',
      paymentReference: 'REF-001',
      extraField: true,
    },
    'UNEXPECTED_FIELD',
    ['extraField'],
  )
  assertParseFailure(
    {
      publicCode: 'TUR-2026-001',
      paymentMethod: 'pago_movil',
      paymentReference: 'ref\n001',
    },
    'INVALID_PAYMENT_REFERENCE',
    ['paymentReference'],
  )
  assertParseFailure(
    {
      publicCode: 'TUR-2026-001',
      paymentMethod: 'pago_movil',
      paymentReference: '   ',
    },
    'INVALID_PAYMENT_REFERENCE',
    ['paymentReference'],
  )

  assertServerContextFailure(
    {
      now: new Date('invalid'),
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0001',
      proofMetadata: null,
    },
    'INVALID_NOW',
  )
  assertServerContextFailure(
    {
      now: new Date('2026-06-23T14:30:00.000Z'),
      paymentReportIdempotencyKey: 'short',
      proofMetadata: null,
    },
    'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY',
  )

  const proofMetadata = makeProofMetadata()
  assert.deepStrictEqual(
    validateCustomBundleTrustedPaymentProofMetadata(proofMetadata, makeServerContext().now),
    [],
  )
  assertProofIssue(
    { ...proofMetadata, mimeType: 'image/gif' },
    makeServerContext().now,
    'INVALID_PROOF_MIME_TYPE',
  )
  assertProofIssue({ ...proofMetadata, sizeBytes: 0 }, makeServerContext().now, 'INVALID_PROOF_SIZE')
  assertProofIssue(
    { ...proofMetadata, sizeBytes: CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES + 1 },
    makeServerContext().now,
    'INVALID_PROOF_SIZE',
  )
  assertProofIssue({ ...proofMetadata, sha256: 'abc' }, makeServerContext().now, 'INVALID_PROOF_SHA256')
  assertProofIssue(
    { ...proofMetadata, uploadedAt: new Date('2026-06-23T14:31:00.000Z') },
    makeServerContext().now,
    'INVALID_PROOF_UPLOADED_AT',
  )

  const validBooking = makeBookingSnapshot()
  assert.deepStrictEqual(
    evaluateCustomBundlePaymentEligibility({ booking: validBooking, now: makeServerContext().now }),
    [],
  )

  const paymentReportedBooking = makeBookingSnapshot({
    internalNotes: '[ops_status:payment_reported]',
  })
  assertEligibilityCodes(paymentReportedBooking, ['INVALID_OPERATIONAL_STATUS'])

  const zeroTagBooking = makeBookingSnapshot({ internalNotes: '' })
  assertEligibilityCodes(zeroTagBooking, ['INVALID_OPERATIONAL_STATUS'])

  const duplicateTagBooking = makeBookingSnapshot({
    internalNotes: '[ops_status:pending_payment]\n[ops_status:pending_payment]',
  })
  assertEligibilityCodes(duplicateTagBooking, ['INVALID_OPERATIONAL_STATUS'])

  const expiredBooking = makeBookingSnapshot({
    holdExpiresAt: new Date('2026-06-23T14:30:00.000Z'),
  })
  assertEligibilityCodes(expiredBooking, ['HOLD_EXPIRED'])

  const alreadyExpiredBooking = makeBookingSnapshot({
    holdExpiresAt: new Date('2026-06-23T14:29:59.000Z'),
  })
  assertEligibilityCodes(alreadyExpiredBooking, ['HOLD_EXPIRED'])

  const zeroTotalBooking = makeBookingSnapshot({
    estimatedTotalUsd: 0,
  })
  assertEligibilityCodes(zeroTotalBooking, ['INVALID_EXPECTED_TOTAL'])

  const wrongCurrencyBooking = makeBookingSnapshot({
    currency: 'VES',
  })
  assertEligibilityCodes(wrongCurrencyBooking, ['INVALID_CURRENCY'])

  const missingHoldBooking = makeBookingSnapshot({
    holdAcquiredAt: null,
    holdExpiresAt: null,
  })
  assert.ok(
    evaluateCustomBundlePaymentEligibility({ booking: missingHoldBooking, now: makeServerContext().now }).some(
      (issue) => issue.code === 'BOOKING_RECORD_INVALID',
    ),
  )

  const validProofContext = makeServerContext({ proofMetadata })
  const effectiveReady = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'efectivo' }),
    serverContext: makeServerContext(),
    booking: validBooking,
  })
  assert.equal(effectiveReady.ok, true)
  assertPreparedStage(effectiveReady, 'ready')

  const proofRequiredContext = makeServerContext({ proofMetadata })
  for (const method of CUSTOM_BUNDLE_PAYMENT_METHODS.filter((method) => method !== 'efectivo')) {
    const result = prepareCustomBundlePaymentReport({
      submission: makeSubmission({ paymentMethod: method }),
      serverContext: proofRequiredContext,
      booking: validBooking,
    })
    assert.equal(result.ok, true)
    assertPreparedStage(result, 'ready')
  }

  const requiredProofResult = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'pago_movil' }),
    serverContext: makeServerContext(),
    booking: validBooking,
  })
  assert.equal(requiredProofResult.ok, false)
  assertPreparedStage(requiredProofResult, 'proof_policy')
  if (!requiredProofResult.ok && requiredProofResult.stage === 'proof_policy') {
    assert.ok(requiredProofResult.proofPolicyIssues.some((issue) => issue.code === 'PROOF_REQUIRED'))
  }

  const canonicalPaymentFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: validBooking.id,
    publicCode: validBooking.publicCode,
    expectedTotalUsd: validBooking.estimatedTotalUsd ?? 0,
    currency: 'USD',
    paymentMethod: 'pago_movil',
    normalizedReference: 'REF001',
    proofMetadata,
  })

  const bookingWithPayment = makeBookingSnapshot({
    existingPaymentReport: {
      paymentMethod: 'pago_movil',
      paymentReference: 'REF001',
      paymentNormalizedReference: 'REF001',
      paymentReportedAt: new Date('2026-06-23T14:30:00.000Z'),
      paymentExpectedTotalUsdSnapshot: 280,
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
      paymentReportFingerprint: canonicalPaymentFingerprint,
    },
  })
  assert.deepStrictEqual(
    classifyCustomBundlePaymentReplay({
      requestedIdempotencyKey: 'PAYMENT_2026:06:23-0002',
      requestedFingerprint: canonicalPaymentFingerprint,
      existingReport: bookingWithPayment.existingPaymentReport,
    }),
    'exact_replay',
  )
  assert.deepStrictEqual(
    classifyCustomBundlePaymentReplay({
      requestedIdempotencyKey: 'PAYMENT_2026:06:23-0002',
      requestedFingerprint: 'c'.repeat(64),
      existingReport: bookingWithPayment.existingPaymentReport,
    }),
    'idempotency_key_conflict',
  )
  assert.deepStrictEqual(
    classifyCustomBundlePaymentReplay({
      requestedIdempotencyKey: 'PAYMENT_2026:06:23-0003',
      requestedFingerprint: canonicalPaymentFingerprint,
      existingReport: bookingWithPayment.existingPaymentReport,
    }),
    'already_reported_by_other_attempt',
  )
  assert.deepStrictEqual(
    classifyCustomBundlePaymentReplay({
      requestedIdempotencyKey: 'PAYMENT_2026:06:23-0003',
      requestedFingerprint: 'd'.repeat(64),
      existingReport: {
        paymentMethod: null,
        paymentReference: null,
        paymentNormalizedReference: null,
        paymentReportedAt: null,
        paymentExpectedTotalUsdSnapshot: null,
        paymentReportIdempotencyKey: null,
        paymentReportFingerprint: null,
      },
    }),
    'malformed_existing_report',
  )

  const exactReplayResult = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'pago_movil' }),
    serverContext: makeServerContext({
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
      proofMetadata,
    }),
    booking: bookingWithPayment,
  })
  assert.equal(exactReplayResult.ok, true)
  assertPreparedStage(exactReplayResult, 'replay')
  if (exactReplayResult.ok && exactReplayResult.stage === 'replay') {
    assert.equal(exactReplayResult.replayClassification, 'exact_replay')
  }

  const replayConflictResult = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'pago_movil' }),
    serverContext: makeServerContext({
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
      proofMetadata,
    }),
    booking: makeBookingSnapshot({
      existingPaymentReport: {
        paymentMethod: 'pago_movil',
        paymentReference: 'REF001',
        paymentNormalizedReference: 'REF001',
        paymentReportedAt: new Date('2026-06-23T14:30:00.000Z'),
        paymentExpectedTotalUsdSnapshot: 280,
        paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0002',
        paymentReportFingerprint: 'c'.repeat(64),
      },
    }),
  })
  assert.equal(replayConflictResult.ok, false)
  assertPreparedStage(replayConflictResult, 'replay')
  if (!replayConflictResult.ok && replayConflictResult.stage === 'replay') {
    assert.equal(replayConflictResult.replayClassification, 'idempotency_key_conflict')
  }

  const alreadyReportedResult = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'pago_movil' }),
    serverContext: makeServerContext({
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0003',
      proofMetadata,
    }),
    booking: bookingWithPayment,
  })
  assert.equal(alreadyReportedResult.ok, false)
  assertPreparedStage(alreadyReportedResult, 'replay')
  if (!alreadyReportedResult.ok && alreadyReportedResult.stage === 'replay') {
    assert.equal(alreadyReportedResult.replayClassification, 'already_reported_by_other_attempt')
  }

  const malformedReplayResult = prepareCustomBundlePaymentReport({
    submission: makeSubmission({ paymentMethod: 'pago_movil' }),
    serverContext: makeServerContext({
      paymentReportIdempotencyKey: 'PAYMENT_2026:06:23-0004',
      proofMetadata,
    }),
    booking: makeBookingSnapshot({
      existingPaymentReport: {
        paymentMethod: null,
        paymentReference: null,
        paymentNormalizedReference: null,
        paymentReportedAt: null,
        paymentExpectedTotalUsdSnapshot: null,
        paymentReportIdempotencyKey: null,
        paymentReportFingerprint: null,
      },
    }),
  })
  assert.equal(malformedReplayResult.ok, false)
  assertPreparedStage(malformedReplayResult, 'booking_eligibility')
  if (!malformedReplayResult.ok && malformedReplayResult.stage === 'booking_eligibility') {
    assert.ok(malformedReplayResult.bookingEligibilityIssues.some((issue) => issue.code === 'PAYMENT_REPORT_RECORD_INCOMPLETE'))
  }

  const sameFingerprint = canonicalPaymentFingerprint
  const sameFingerprintAgain = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: validBooking.id,
    publicCode: validBooking.publicCode,
    expectedTotalUsd: validBooking.estimatedTotalUsd ?? 0,
    currency: 'USD',
    paymentMethod: 'pago_movil',
    normalizedReference: 'REF001',
    proofMetadata,
  })
  const differentMethodFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: validBooking.id,
    publicCode: validBooking.publicCode,
    expectedTotalUsd: validBooking.estimatedTotalUsd ?? 0,
    currency: 'USD',
    paymentMethod: 'transferencia',
    normalizedReference: 'REF001',
    proofMetadata,
  })
  const differentReferenceFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: validBooking.id,
    publicCode: validBooking.publicCode,
    expectedTotalUsd: validBooking.estimatedTotalUsd ?? 0,
    currency: 'USD',
    paymentMethod: 'pago_movil',
    normalizedReference: 'REF002',
    proofMetadata,
  })
  const differentProofFingerprint = buildCustomBundlePaymentReportFingerprint({
    bookingRequestId: validBooking.id,
    publicCode: validBooking.publicCode,
    expectedTotalUsd: validBooking.estimatedTotalUsd ?? 0,
    currency: 'USD',
    paymentMethod: 'pago_movil',
    normalizedReference: 'REF001',
    proofMetadata: { ...proofMetadata, sha256: 'f'.repeat(64) },
  })

  assert.match(sameFingerprint, /^[a-f0-9]{64}$/)
  assert.equal(sameFingerprint, sameFingerprintAgain)
  assert.notEqual(sameFingerprint, differentMethodFingerprint)
  assert.notEqual(sameFingerprint, differentReferenceFingerprint)
  assert.notEqual(sameFingerprint, differentProofFingerprint)

  const mutatedSubmission = clone(makeSubmission({ paymentMethod: 'transferencia' }))
  const submissionSnapshot = clone(mutatedSubmission)
  const mutatedBooking = clone(validBooking)
  const bookingSnapshot = clone(mutatedBooking)
  const mutatedProof = clone(proofMetadata)
  const proofSnapshot = clone(mutatedProof)
  const mutatedContext = clone(makeServerContext({ proofMetadata: mutatedProof }))
  const contextSnapshot = clone(mutatedContext)

  void validateCustomBundlePaymentReportSubmission(mutatedSubmission)
  void validateCustomBundleTrustedPaymentProofMetadata(mutatedProof, mutatedContext.now)
  void validateCustomBundlePaymentServerContext(mutatedContext)
  void evaluateCustomBundlePaymentEligibility({ booking: mutatedBooking, now: mutatedContext.now })
  void classifyCustomBundlePaymentReplay({
    requestedIdempotencyKey: mutatedContext.paymentReportIdempotencyKey,
    requestedFingerprint: sameFingerprint,
    existingReport: mutatedBooking.existingPaymentReport,
  })
  void prepareCustomBundlePaymentReport({
    submission: mutatedSubmission,
    serverContext: mutatedContext,
    booking: mutatedBooking,
  })

  assert.deepStrictEqual(mutatedSubmission, submissionSnapshot)
  assert.deepStrictEqual(mutatedBooking, bookingSnapshot)
  assert.deepStrictEqual(mutatedProof, proofSnapshot)
  assert.deepStrictEqual(mutatedContext, contextSnapshot)

  console.log('booking_custom_bundle_payment_contract OK')
  console.log('payment methods: verified')
  console.log('proof policy: verified')
  console.log('active hold eligibility: verified')
  console.log('exact expiration boundary: verified')
  console.log('canonical payment fingerprint: verified')
  console.log('exact replay: verified')
  console.log('idempotency conflict: verified')
  console.log('already reported protection: verified')
  console.log('invalid server context: verified')
  console.log('immutability: verified')
}

main()
