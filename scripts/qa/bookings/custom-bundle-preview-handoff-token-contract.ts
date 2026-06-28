import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCustomBundlePreviewHandoffToken,
  validateCustomBundlePreviewHandoffToken,
} from '@/lib/bookings/custom-bundle-preview-handoff-token'

function fail(message: string, error?: unknown): never {
  console.error('booking_custom_bundle_preview_handoff_token_contract FAILED')
  console.error(message)
  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
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

function makePayload(overrides: Partial<{
  publicCode: string
  requestFingerprint: string
  eventDate: string
  startTime: string
  durationMinutes: number
  estimatedTotalUsdCents: number
  holdAcquiredAt: number
  holdExpiresAt: number
}> = {}) {
  return {
    publicCode: 'TUR-2026-001',
    requestFingerprint: 'a'.repeat(64),
    eventDate: '2026-06-24',
    startTime: '10:00',
    durationMinutes: 120,
    estimatedTotalUsdCents: 28000,
    holdAcquiredAt: Math.floor(new Date('2026-06-24T18:00:00.000Z').getTime() / 1000),
    holdExpiresAt: Math.floor(new Date('2026-06-24T19:00:00.000Z').getTime() / 1000),
    ...overrides,
  }
}

async function main(): Promise<void> {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/bookings/custom-bundle-preview-handoff-token.ts'),
    'utf8',
  )
  assert.equal(source.includes("import 'server-only'"), true)

  await withEnv(
    { BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET: 'preview-handoff-token-secret' },
    async () => {
      const now = new Date('2026-06-24T18:00:00.000Z')
      const expiresAt = new Date('2026-06-24T19:00:00.000Z')
      const token = buildCustomBundlePreviewHandoffToken({
        payload: makePayload(),
        expiresAt,
        now,
      })
      assert.ok(token)
      if (!token) {
        fail('Expected a preview handoff token.')
      }

      const valid = validateCustomBundlePreviewHandoffToken(token, 'TUR-2026-001', now)
      assert.equal(valid.ok, true)
      if (!valid.ok) {
        fail('Expected a valid preview handoff token.')
      }
      assert.equal(valid.payload.publicCode, 'TUR-2026-001')
      assert.equal(valid.payload.requestFingerprint, 'a'.repeat(64))
      assert.equal(valid.payload.purpose, 'custom_bundle_preview_recovery_session')

      const codeMismatch = validateCustomBundlePreviewHandoffToken(token, 'TUR-2026-999', now)
      assert.equal(codeMismatch.ok, false)
      if (codeMismatch.ok) {
        fail('Expected a code mismatch to fail.')
      }
      assert.equal(codeMismatch.error, 'code_mismatch')

      const expired = validateCustomBundlePreviewHandoffToken(token, 'TUR-2026-001', new Date('2026-06-24T19:00:00.000Z'))
      assert.equal(expired.ok, false)
      if (expired.ok) {
        fail('Expected an expired preview handoff token to fail.')
      }
      assert.equal(expired.error, 'expired_token')

      const invalid = validateCustomBundlePreviewHandoffToken('not-a-token', 'TUR-2026-001', now)
      assert.equal(invalid.ok, false)
      if (invalid.ok) {
        fail('Expected an invalid token to fail.')
      }
      assert.equal(invalid.error, 'invalid_token')

      delete process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET
      const misconfigured = validateCustomBundlePreviewHandoffToken(token, 'TUR-2026-001', now)
      assert.equal(misconfigured.ok, false)
      if (misconfigured.ok) {
        fail('Expected a misconfigured secret to fail.')
      }
      assert.equal(misconfigured.error, 'misconfigured_secret')
    },
  )

  console.log('booking_custom_bundle_preview_handoff_token_contract OK')
  console.log('preview handoff token: verified')
  console.log('signed preview binding: verified')
  console.log('exact preview expiry boundary: verified')
  console.log('secret configuration guard: verified')
}

main().catch((error) => fail('Unexpected failure while validating the preview handoff token contract.', error))
