import 'server-only'

import {
  buildCustomBundlePreviewHandoffTokenCore,
  validateCustomBundlePreviewHandoffTokenCore,
  type CustomBundlePreviewHandoffTokenPayloadInput,
  type CustomBundlePreviewHandoffTokenValidationResult,
} from '@/lib/bookings/custom-bundle-preview-handoff-token-core'

function getPreviewHandoffSecret(): string | null {
  const secret = process.env.BOOKINGS_PAYMENT_RECOVERY_TOKEN_SECRET?.trim() ?? ''
  return secret.length > 0 ? secret : null
}

export function buildCustomBundlePreviewHandoffToken(input: {
  payload: CustomBundlePreviewHandoffTokenPayloadInput
  expiresAt: Date
  now: Date
}): string | null {
  return buildCustomBundlePreviewHandoffTokenCore({
    secret: getPreviewHandoffSecret(),
    payload: input.payload,
    expiresAt: input.expiresAt,
    now: input.now,
  })
}

export function validateCustomBundlePreviewHandoffToken(
  token: string,
  expectedPublicCode: string,
  now: Date,
): CustomBundlePreviewHandoffTokenValidationResult {
  return validateCustomBundlePreviewHandoffTokenCore({
    secret: getPreviewHandoffSecret(),
    token,
    expectedPublicCode,
    now,
  })
}

export type {
  CustomBundlePreviewHandoffTokenPayload,
  CustomBundlePreviewHandoffTokenPayloadInput,
  CustomBundlePreviewHandoffTokenValidationResult,
} from '@/lib/bookings/custom-bundle-preview-handoff-token-core'
