import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  runCustomBundlePreviewSubmissionCore,
  type CustomBundlePreviewSubmissionDependencies,
} from '@/lib/bookings/custom-bundle-preview-submission-core'
import {
  buildCustomBundlePreviewHandoffToken,
  validateCustomBundlePreviewHandoffToken,
} from '@/lib/bookings/custom-bundle-preview-handoff-token'
import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_preview_submission_contract FAILED')
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

function reverseSubmissionItems<T extends { items: Array<unknown> }>(submission: T): T {
  return {
    ...submission,
    items: [...submission.items].reverse(),
  }
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
    resolve(process.cwd(), 'lib/bookings/custom-bundle-preview-submission-core.ts'),
    'utf8',
  )
  assert.equal(source.includes('buildPreviewPublicCode'), true)
  assert.equal(source.includes('process.env'), false)

  const clockNow = new Date('2026-06-24T18:00:00.000Z')
  const dependencies: CustomBundlePreviewSubmissionDependencies = {
    runtime: 'preview',
    clock: {
      now(): Date {
        return new Date(clockNow.getTime())
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

  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'preview-submission-secret' },
    async () => {
      const result = runCustomBundlePreviewSubmissionCore(dependencies, {
        submission: createSubmission(),
      })
      assert.equal(result.ok, true)
      if (!result.ok) {
        fail('Expected a valid preview submission.')
      }
      assert.equal(result.stage, 'simulated_hold')
      assert.equal(result.public.ok, true)
      assert.match(result.public.publicCode, /^TUR-\d{4}-\d{12}$/)
      assert.equal(result.public.recoveryPath.startsWith('/reservas/pago?code='), true)
      assert.equal(result.public.recoveryPath.includes('&token='), false)
      assert.equal(result.public.recoveryPath.includes('token='), false)
      assert.equal(result.recoveryTokenExpiresAtIso, result.holdExpiresAtIso)
      assert.equal(result.previewHandoffTokenExpiresAtIso, result.holdExpiresAtIso)
      assert.equal(result.recoveryToken.length > 0, true)
      assert.equal(result.previewHandoffToken.length > 0, true)

      const reversed = runCustomBundlePreviewSubmissionCore(dependencies, {
        submission: reverseSubmissionItems(createSubmission()),
      })
      assert.equal(reversed.ok, true)
      if (!reversed.ok) {
        fail('Expected the reversed submission to remain valid.')
      }
      assert.equal(reversed.publicCode, result.publicCode)
      assert.equal(reversed.requestFingerprint, result.requestFingerprint)
      assert.equal(reversed.public.recoveryPath, result.public.recoveryPath)

      const recoveryToken = validatePaymentRecoveryToken(result.recoveryToken, result.publicCode, clockNow)
      assert.equal(recoveryToken.ok, true)
      const previewHandoffToken = validateCustomBundlePreviewHandoffToken(
        result.previewHandoffToken,
        result.publicCode,
        clockNow,
      )
      assert.equal(previewHandoffToken.ok, true)

      const disabled = runCustomBundlePreviewSubmissionCore(
        {
          ...dependencies,
          runtime: 'environment_not_allowed',
        },
        { submission: createSubmission() },
      )
      assert.equal(disabled.ok, false)
      if (disabled.ok) {
        fail('Expected environment_not_allowed to fail.')
      }
      assert.equal(disabled.code, 'ENVIRONMENT_NOT_ALLOWED')
    },
  )

  console.log('booking_custom_bundle_preview_submission_contract OK')
  console.log('preview hold simulation: verified')
  console.log('preview recovery path: verified')
  console.log('stable preview submission ordering: verified')
  console.log('preview handoff token creation: verified')
}

main().catch((error) => fail('Unexpected failure while validating the preview submission contract.', error))
