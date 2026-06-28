import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
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

function toBase64Url(value: Buffer | string): string {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function signPayload(payload: unknown, secret: string): string {
  const payloadBase64Url = toBase64Url(JSON.stringify(payload))
  const signatureBase64Url = toBase64Url(
    createHmac('sha256', secret).update(payloadBase64Url).digest(),
  )
  return `${payloadBase64Url}.${signatureBase64Url}`
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
      assert.equal(valid.payload.iat, Math.floor(now.getTime() / 1000))
      assert.equal(valid.payload.exp, Math.floor(expiresAt.getTime() / 1000))

      const halfHourExpiresAt = new Date('2026-06-24T18:30:00.000Z')
      const fullHoldShorterExpiresAt = new Date('2026-06-24T18:30:00.000Z')
      const shorterPayload = makePayload()
      const shorterToken = buildCustomBundlePreviewHandoffToken({
        payload: shorterPayload,
        expiresAt: fullHoldShorterExpiresAt,
        now,
      })
      assert.ok(shorterToken)
      if (!shorterToken) {
        fail('Expected a shorter-lived preview handoff token.')
      }
      const shorterValid = validateCustomBundlePreviewHandoffToken(shorterToken, 'TUR-2026-001', now)
      assert.equal(shorterValid.ok, true)
      if (!shorterValid.ok) {
        fail('Expected a shorter-lived preview handoff token to validate.')
      }
      assert.equal(shorterValid.payload.holdExpiresAt - shorterValid.payload.iat, 3600)
      assert.equal(shorterValid.payload.exp - shorterValid.payload.iat, 1800)

      const halfHourPayload = makePayload({
        holdExpiresAt: Math.floor(halfHourExpiresAt.getTime() / 1000),
      })
      const equalHoldToken = buildCustomBundlePreviewHandoffToken({
        payload: halfHourPayload,
        expiresAt: halfHourExpiresAt,
        now,
      })
      assert.ok(equalHoldToken)
      if (!equalHoldToken) {
        fail('Expected a token expiring exactly at the hold boundary.')
      }
      const equalHoldValid = validateCustomBundlePreviewHandoffToken(equalHoldToken, 'TUR-2026-001', now)
      assert.equal(equalHoldValid.ok, true)
      if (!equalHoldValid.ok) {
        fail('Expected a token expiring exactly at the hold boundary to validate.')
      }
      assert.equal(equalHoldValid.payload.exp, equalHoldValid.payload.holdExpiresAt)

      const basePayload = {
        v: 1,
        purpose: 'custom_bundle_preview_recovery_session',
        publicCode: 'TUR-2026-001',
        requestFingerprint: 'a'.repeat(64),
        eventDate: '2026-06-24',
        startTime: '10:00',
        durationMinutes: 120,
        estimatedTotalUsdCents: 28000,
        holdAcquiredAt: Math.floor(now.getTime() / 1000),
        holdExpiresAt: Math.floor(expiresAt.getTime() / 1000),
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
      } as const

      const validTtl3600 = validateCustomBundlePreviewHandoffToken(
        signPayload(basePayload, 'preview-handoff-token-secret'),
        'TUR-2026-001',
        now,
      )
      assert.equal(validTtl3600.ok, true)
      if (validTtl3600.ok) {
        assert.equal(validTtl3600.payload.exp - validTtl3600.payload.iat, 3600)
      }

      const hold1800Payload = makePayload({
        holdAcquiredAt: Math.floor(now.getTime() / 1000),
        holdExpiresAt: Math.floor(halfHourExpiresAt.getTime() / 1000),
      })

      const invalidTokens = [
        {
          payload: {
            ...hold1800Payload,
            exp: hold1800Payload.holdExpiresAt + 1,
          },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, exp: basePayload.iat },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, exp: basePayload.iat - 1 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, exp: basePayload.holdExpiresAt + 1 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, iat: basePayload.iat + 1 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, iat: basePayload.iat + 0.5 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, exp: basePayload.exp + 0.5 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, holdAcquiredAt: basePayload.holdAcquiredAt + 0.5 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, holdExpiresAt: basePayload.holdExpiresAt + 0.5 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, holdExpiresAt: basePayload.holdAcquiredAt + 3601 },
          expected: 'invalid_token',
        },
        {
          payload: {
            ...basePayload,
            exp: basePayload.holdExpiresAt + 1,
          },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, iat: Math.floor(now.getTime() / 1000) + 1 },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, purpose: 'wrong_purpose' },
          expected: 'invalid_token',
        },
        {
          payload: { ...basePayload, v: 2 },
          expected: 'invalid_token',
        },
        {
          token: `${signPayload(basePayload, 'preview-handoff-token-secret')}.tampered`,
          expected: 'invalid_token',
        },
      ] as const

      for (const candidate of invalidTokens) {
        const token = 'token' in candidate ? candidate.token : signPayload(candidate.payload, 'preview-handoff-token-secret')
        const result = validateCustomBundlePreviewHandoffToken(token, 'TUR-2026-001', now)
        assert.equal(result.ok, false)
        if (result.ok) {
          fail('Expected a malformed preview handoff token to fail.')
        }
        assert.equal(result.error, candidate.expected)
      }

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
  console.log('shorter token lifetime: verified')
  console.log('equal hold expiry: verified')
  console.log('expiry after hold: rejected')
  console.log('builder temporal invariant: verified')
  console.log('validator temporal invariant: verified')
  console.log('exact expiry boundary: verified')
}

main().catch((error) => fail('Unexpected failure while validating the preview handoff token contract.', error))
