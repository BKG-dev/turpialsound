export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_NAME =
  '__Host-turpial_custom_bundle_preview_handoff' as const

export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PATH = '/' as const
export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_HTTP_ONLY = true as const
export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SECURE = true as const
export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SAME_SITE = 'strict' as const
export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PRIORITY = 'high' as const
export const CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_MAX_AGE_SECONDS = 3600 as const

export interface CustomBundlePreviewHandoffCookieSetOptions {
  httpOnly: true
  secure: true
  sameSite: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SAME_SITE
  path: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PATH
  maxAge: number
  priority?: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PRIORITY
}

export interface CustomBundlePreviewHandoffCookieClearOptions {
  httpOnly: true
  secure: true
  sameSite: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SAME_SITE
  path: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PATH
  maxAge: 0
  expires: Date
  priority?: typeof CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PRIORITY
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

export function calculateCustomBundlePreviewHandoffCookieMaxAge(input: {
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

  return Math.min(seconds, CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_MAX_AGE_SECONDS)
}

export function buildCustomBundlePreviewHandoffCookieSetOptions(input: {
  expiresAt: Date
  now: Date
}): CustomBundlePreviewHandoffCookieSetOptions | null {
  const maxAge = calculateCustomBundlePreviewHandoffCookieMaxAge(input)
  if (maxAge === null) {
    return null
  }

  return {
    httpOnly: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_HTTP_ONLY,
    secure: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SECURE,
    sameSite: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SAME_SITE,
    path: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PATH,
    maxAge,
    priority: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PRIORITY,
  }
}

export function buildCustomBundlePreviewHandoffCookieClearOptions(): CustomBundlePreviewHandoffCookieClearOptions {
  return {
    httpOnly: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_HTTP_ONLY,
    secure: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SECURE,
    sameSite: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_SAME_SITE,
    path: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PATH,
    maxAge: 0,
    expires: new Date(0),
    priority: CUSTOM_BUNDLE_PREVIEW_HANDOFF_COOKIE_PRIORITY,
  }
}
