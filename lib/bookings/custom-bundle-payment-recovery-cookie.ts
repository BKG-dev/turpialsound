export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_NAME =
  '__Host-turpial_payment_recovery' as const

export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PATH = '/' as const
export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_HTTP_ONLY = true as const
export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SECURE = true as const
export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SAME_SITE = 'strict' as const
export const CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PRIORITY = 'high' as const

export interface CustomBundlePaymentRecoveryCookieSetOptions {
  httpOnly: true
  secure: true
  sameSite: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SAME_SITE
  path: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PATH
  maxAge: number
  priority?: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PRIORITY
}

export interface CustomBundlePaymentRecoveryCookieClearOptions {
  httpOnly: true
  secure: true
  sameSite: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SAME_SITE
  path: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PATH
  maxAge: 0
  expires: Date
  priority?: typeof CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PRIORITY
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

export function isValidCustomBundlePaymentRecoveryTokenValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 4096
}

export function calculateCustomBundlePaymentRecoveryCookieMaxAge(input: {
  expiresAt: Date
  now: Date
}): number | null {
  if (!isValidDate(input.expiresAt) || !isValidDate(input.now)) {
    return null
  }

  const seconds = Math.floor((input.expiresAt.getTime() - input.now.getTime()) / 1000)
  if (!Number.isInteger(seconds) || seconds <= 0) {
    return null
  }

  return seconds
}

export function buildCustomBundlePaymentRecoveryCookieSetOptions(input: {
  expiresAt: Date
  now: Date
}): CustomBundlePaymentRecoveryCookieSetOptions | null {
  const maxAge = calculateCustomBundlePaymentRecoveryCookieMaxAge(input)
  if (maxAge === null) {
    return null
  }

  return {
    httpOnly: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_HTTP_ONLY,
    secure: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SECURE,
    sameSite: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SAME_SITE,
    path: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PATH,
    maxAge,
    priority: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PRIORITY,
  }
}

export function buildCustomBundlePaymentRecoveryCookieClearOptions(): CustomBundlePaymentRecoveryCookieClearOptions {
  return {
    httpOnly: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_HTTP_ONLY,
    secure: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SECURE,
    sameSite: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_SAME_SITE,
    path: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PATH,
    maxAge: 0,
    expires: new Date(0),
    priority: CUSTOM_BUNDLE_PAYMENT_RECOVERY_COOKIE_PRIORITY,
  }
}
