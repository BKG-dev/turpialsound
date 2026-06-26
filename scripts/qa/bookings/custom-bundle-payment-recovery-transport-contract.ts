import assert from 'node:assert/strict'

import {
  buildPaymentRecoveryPath,
  buildPaymentRecoveryToken,
  validatePaymentRecoveryToken,
} from '@/lib/bookings/payment-recovery-token'
import {
  buildCustomBundlePaymentRecoveryCookieClearOptions,
  buildCustomBundlePaymentRecoveryCookieSetOptions,
  calculateCustomBundlePaymentRecoveryCookieMaxAge,
  isValidCustomBundlePaymentRecoveryTokenValue,
} from '@/lib/bookings/custom-bundle-payment-recovery-cookie'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_payment_recovery_transport_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

async function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
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

function assertNoLeak(value: unknown): void {
  const text = JSON.stringify(value)
  assert.equal(text.includes('DATABASE_URL'), false)
  assert.equal(text.includes('BLOB_READ_WRITE_TOKEN'), false)
  assert.equal(text.includes('https://'), false)
}

async function main(): Promise<void> {
  await withEnv(
    {
      BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'recovery-transport-secret',
    },
    async () => {
      const now = new Date('2026-06-24T18:00:00.000Z')
      const expiresAt = new Date('2026-06-24T18:15:00.000Z')
      const token = buildPaymentRecoveryToken({
        bookingPublicCode: 'TUR-2026-100',
        expiresAt,
        now,
      })
      assert.ok(token)

      const valid = validatePaymentRecoveryToken(token, 'TUR-2026-100', new Date('2026-06-24T18:14:59.000Z'))
      assert.equal(valid.ok, true)
      if (!valid.ok) {
        fail('Expected a valid payment recovery token.')
      }

      const exactBoundary = validatePaymentRecoveryToken(token, 'TUR-2026-100', new Date('2026-06-24T18:15:00.000Z'))
      assert.equal(exactBoundary.ok, false)
      if (exactBoundary.ok) {
        fail('Expected the exact expiry boundary to be rejected.')
      }
      assert.equal(exactBoundary.error, 'expired_token')

      const mismatch = validatePaymentRecoveryToken(token, 'TUR-2026-999', new Date('2026-06-24T18:00:01.000Z'))
      assert.equal(mismatch.ok, false)
      if (mismatch.ok) {
        fail('Expected a code mismatch to be rejected.')
      }
      assert.equal(mismatch.error, 'code_mismatch')

      const cookieOptions = buildCustomBundlePaymentRecoveryCookieSetOptions({
        now,
        expiresAt,
      })
      assert.ok(cookieOptions)
      if (!cookieOptions) {
        fail('Expected recovery cookie options.')
      }
      assert.equal(cookieOptions.httpOnly, true)
      assert.equal(cookieOptions.sameSite, 'strict')
      assert.equal(cookieOptions.path, '/')
      assert.equal(cookieOptions.maxAge, 900)

      const clearOptions = buildCustomBundlePaymentRecoveryCookieClearOptions()
      assert.equal(clearOptions.maxAge, 0)
      assert.equal(clearOptions.path, '/')

      const maxAge = calculateCustomBundlePaymentRecoveryCookieMaxAge({
        now,
        expiresAt,
      })
      assert.equal(maxAge, 900)

      const boundaryMaxAge = calculateCustomBundlePaymentRecoveryCookieMaxAge({
        now: expiresAt,
        expiresAt,
      })
      assert.equal(boundaryMaxAge, null)

      assert.equal(isValidCustomBundlePaymentRecoveryTokenValue(token), true)
      assert.equal(isValidCustomBundlePaymentRecoveryTokenValue(''), false)
      assert.equal(isValidCustomBundlePaymentRecoveryTokenValue(' '.repeat(2)), false)

      const path = buildPaymentRecoveryPath({
        publicCode: ' tur-2026-100 ',
        token,
      })
      assert.equal(path.startsWith('/reservas/pago?code=TUR-2026-100&token='), true)

      assertNoLeak({
        token,
        path,
        cookieOptions,
        clearOptions,
      })
    },
  )

  console.log('booking_custom_bundle_payment_recovery_transport_contract OK')
  console.log('recovery session boundary: verified')
  console.log('cookie handoff: verified')
  console.log('path derivation: verified')
  console.log('sanitized recovery contract: verified')
}

main().catch((error) => fail('Unexpected failure while validating the recovery transport contract.', error))
