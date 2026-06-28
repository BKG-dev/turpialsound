import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  runCustomBundlePreviewSubmissionCore,
  type CustomBundlePreviewSubmissionDependencies,
} from '@/lib/bookings/custom-bundle-preview-submission-core'
import {
  runCustomBundlePreviewRecoverySessionCore,
  type CustomBundlePreviewRecoverySessionResult,
} from '@/lib/bookings/custom-bundle-preview-recovery-session-core'
import {
  buildCustomBundlePreviewHandoffToken,
  validateCustomBundlePreviewHandoffToken,
} from '@/lib/bookings/custom-bundle-preview-handoff-token'
import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_preview_recovery_session_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

function createSubmission() {
  return {
    contractVersion: 1 as const,
    bookingMode: 'custom_bundle' as const,
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observaciones del cliente  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412 123 4567',
      whatsappConsentAccepted: true,
    },
    items: [
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'grabaciones-voces', quantity: 2, sessionDurationMinutes: null },
    ],
  }
}

function isPendingPayment(
  result: CustomBundlePreviewRecoverySessionResult,
): result is Extract<CustomBundlePreviewRecoverySessionResult, { ok: true }> {
  return result.ok
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

async function main(): Promise<void> {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-preview-recovery-session-core.ts'),
    'utf8',
  )
  assert.equal(source.includes('pending_payment'), true)
  assert.equal(source.includes('previewHandoffToken'), true)

  const envSecret = 'preview-recovery-session-secret'
  await withEnv({ BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: envSecret }, async () => {
    const dependencies: CustomBundlePreviewSubmissionDependencies = {
      runtime: 'preview',
      clock: {
        now(): Date {
          return new Date('2026-06-24T18:00:00.000Z')
        },
      },
      buildRecoveryToken(input) {
        return buildPaymentRecoveryToken({
          bookingPublicCode: input.bookingPublicCode,
          expiresAt: input.expiresAt,
          now: input.now,
        })
      },
      buildPreviewHandoffToken(input) {
        return buildCustomBundlePreviewHandoffToken({
          payload: input.payload,
          expiresAt: input.expiresAt,
          now: input.now,
        })
      },
    }

    const previewResult = runCustomBundlePreviewSubmissionCore(dependencies, {
      submission: createSubmission(),
    })
    assert.equal(previewResult.ok, true)
    if (!previewResult.ok) {
      fail('Expected preview submission to succeed.')
    }

    const sessionResult = runCustomBundlePreviewRecoverySessionCore({
      publicCode: previewResult.publicCode,
      recoveryToken: previewResult.recoveryToken,
      previewHandoffToken: previewResult.previewHandoffToken,
      now: new Date('2026-06-24T18:00:00.000Z'),
      validateRecoveryToken(token, expectedPublicCode, now) {
        return validatePaymentRecoveryToken(token, expectedPublicCode, now)
      },
      validatePreviewHandoffToken(token, expectedPublicCode, now) {
        return validateCustomBundlePreviewHandoffToken(token, expectedPublicCode, now)
      },
    })
    assert.equal(sessionResult.ok, true)
    if (!isPendingPayment(sessionResult)) {
      fail('Expected a pending payment preview recovery session.')
    }
    assert.equal(sessionResult.stage, 'pending_payment')
    assert.equal(sessionResult.trusted.publicCode, previewResult.publicCode)
    assert.equal(sessionResult.trusted.eventDate, '2026-06-24')
    assert.equal(sessionResult.trusted.startTime, '10:00')
    assert.equal(sessionResult.trusted.durationMinutes > 0, true)
    assert.equal(sessionResult.trusted.paymentDeadlineIso, previewResult.holdExpiresAtIso)
    assert.equal(sessionResult.trusted.amountUsd > 0, true)

    const missingHandoff = runCustomBundlePreviewRecoverySessionCore({
      publicCode: previewResult.publicCode,
      recoveryToken: previewResult.recoveryToken,
      previewHandoffToken: null,
      now: new Date('2026-06-24T18:00:00.000Z'),
      validateRecoveryToken(token, expectedPublicCode, now) {
        return validatePaymentRecoveryToken(token, expectedPublicCode, now)
      },
      validatePreviewHandoffToken(token, expectedPublicCode, now) {
        return validateCustomBundlePreviewHandoffToken(token, expectedPublicCode, now)
      },
    })
    assert.equal(missingHandoff.ok, false)
    if (missingHandoff.ok) {
      fail('Expected a missing preview handoff token failure.')
    }
    assert.equal(missingHandoff.code, 'PREVIEW_HANDOFF_TOKEN_MISSING')

    const expiredBoundary = runCustomBundlePreviewRecoverySessionCore({
      publicCode: previewResult.publicCode,
      recoveryToken: previewResult.recoveryToken,
      previewHandoffToken: previewResult.previewHandoffToken,
      now: new Date(previewResult.holdExpiresAtIso),
      validateRecoveryToken(token, expectedPublicCode, now) {
        return validatePaymentRecoveryToken(token, expectedPublicCode, now)
      },
      validatePreviewHandoffToken(token, expectedPublicCode, now) {
        return validateCustomBundlePreviewHandoffToken(token, expectedPublicCode, now)
      },
    })
  assert.equal(expiredBoundary.ok, false)
  if (expiredBoundary.ok) {
    fail('Expected the exact hold boundary to expire the preview session.')
  }
  assert.equal(expiredBoundary.code, 'RECOVERY_TOKEN_INVALID')

    const codeMismatch = runCustomBundlePreviewRecoverySessionCore({
      publicCode: 'not-a-public-code',
      recoveryToken: previewResult.recoveryToken,
      previewHandoffToken: previewResult.previewHandoffToken,
      now: new Date('2026-06-24T18:00:00.000Z'),
      validateRecoveryToken(token, expectedPublicCode, now) {
        return validatePaymentRecoveryToken(token, expectedPublicCode, now)
      },
      validatePreviewHandoffToken(token, expectedPublicCode, now) {
        return validateCustomBundlePreviewHandoffToken(token, expectedPublicCode, now)
      },
    })
    assert.equal(codeMismatch.ok, false)
    if (codeMismatch.ok) {
      fail('Expected a code mismatch to fail.')
    }
    assert.equal(codeMismatch.code, 'INVALID_PUBLIC_CODE')
  })

  console.log('booking_custom_bundle_preview_recovery_session_contract OK')
  console.log('preview recovery session: verified')
  console.log('trusted preview session data: verified')
  console.log('exact hold boundary: verified')
  console.log('public code binding: verified')
}

main().catch((error) => fail('Unexpected failure while validating the preview recovery session contract.', error))
