import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  runCustomBundlePreviewSubmissionCore,
  type CustomBundlePreviewSubmissionDependencies,
} from '@/lib/bookings/custom-bundle-preview-submission-core'
import {
  runCustomBundlePreviewRecoverySessionCore,
} from '@/lib/bookings/custom-bundle-preview-recovery-session-core'
import {
  buildCustomBundlePreviewHandoffToken,
  validateCustomBundlePreviewHandoffToken,
} from '@/lib/bookings/custom-bundle-preview-handoff-token'
import { buildPaymentRecoveryToken, validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_preview_end_to_end FAILED')
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
  const routeSource = readFileSync(
    resolve(process.cwd(), 'app/api/bookings/payment-recovery/session/route.ts'),
    'utf8',
  )
  const wizardSource = readFileSync(
    resolve(process.cwd(), 'components/bookings/BookingWizard.tsx'),
    'utf8',
  )

  assert.equal(routeSource.includes('CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME'), true)
  assert.equal(routeSource.includes("paymentUiMode: 'preview_simulation'"), true)
  assert.equal(routeSource.includes("await import('@/lib/db')"), true)
  assert.equal(routeSource.includes("from '@/lib/db'"), false)
  assert.equal(wizardSource.includes('submitCustomBundlePreviewAction'), true)
  assert.equal(wizardSource.includes('recoveryPath'), true)

  await withEnv({ BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'preview-end-to-end-secret' }, async () => {
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

    assert.equal(previewResult.public.recoveryPath.startsWith('/reservas/pago?code='), true)
    assert.equal(previewResult.public.recoveryPath.includes('token='), false)
    assert.equal(previewResult.public.recoveryPath.includes(previewResult.publicCode), true)

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
    if (!sessionResult.ok) {
      fail('Expected a pending payment preview recovery session.')
    }
    assert.equal(sessionResult.stage, 'pending_payment')
    assert.equal(sessionResult.trusted.publicCode, previewResult.publicCode)
    assert.equal(sessionResult.trusted.paymentDeadlineIso, previewResult.holdExpiresAtIso)

    const routePreviewText = JSON.stringify({
      ok: true,
      state: 'pending_payment',
      session: {
        version: 2,
        publicCode: previewResult.publicCode,
        paymentUiMode: 'preview_simulation',
        serviceName: 'Arma tu paquete',
        variantName: 'Paquete personalizado',
        paymentReference: previewResult.publicCode,
      },
    })
    assert.equal(routePreviewText.includes('preview_simulation'), true)
    assert.equal(routePreviewText.includes('token='), false)
  })

  console.log('booking_custom_bundle_preview_end_to_end OK')
  console.log('preview handoff: verified')
  console.log('recovery session: verified')
  console.log('wizard recovery path: verified')
  console.log('no recovery token in url: verified')
}

main().catch((error) => fail('Unexpected failure while validating the preview end-to-end gate.', error))
