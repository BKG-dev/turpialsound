export const CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES = 3_900_000 as const

export const CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

export type CustomBundlePaymentProofAllowedMimeType =
  (typeof CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES)[number]
