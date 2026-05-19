export type WhatsappVerifyMode = 'manual_code' | 'secure_link'
export type BookingsBaseUrlSource =
  | 'BOOKINGS_PUBLIC_BASE_URL'
  | 'BOOKINGS_APP_BASE_URL'
  | 'NEXT_PUBLIC_APP_URL'
  | 'VERCEL_URL'
  | 'LOCALHOST_DEV'
  | 'DEFAULT_FALLBACK'

export interface WhatsappVerificationConfig {
  mode: WhatsappVerifyMode
  secureLinkEnabled: boolean
  secureLinkTtlMinutes: number
}

export interface BookingsPublicBaseUrlResolution {
  baseUrl: string
  source: BookingsBaseUrlSource
  host: string
}

const DEFAULT_SECURE_LINK_TTL_MINUTES = 30
const MIN_SECURE_LINK_TTL_MINUTES = 5
const MAX_SECURE_LINK_TTL_MINUTES = 120

function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function clampTtlMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SECURE_LINK_TTL_MINUTES
  if (value < MIN_SECURE_LINK_TTL_MINUTES) return MIN_SECURE_LINK_TTL_MINUTES
  if (value > MAX_SECURE_LINK_TTL_MINUTES) return MAX_SECURE_LINK_TTL_MINUTES
  return Math.floor(value)
}

function normalizeBaseUrl(rawValue: string | null | undefined): string | null {
  const raw = rawValue?.trim()
  if (!raw) return null

  const normalizedRaw = raw.replace(/^[A-Z0-9_]+=/i, '').trim()
  if (!normalizedRaw) return null

  if (normalizedRaw.startsWith('http://') || normalizedRaw.startsWith('https://')) {
    return normalizedRaw.replace(/\/+$/, '')
  }

  return `https://${normalizedRaw.replace(/\/+$/, '')}`
}

function safeHostFromUrl(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return 'invalid-host'
  }
}

export function normalizeWhatsappVeForPolicy(value: string): string {
  const compact = value.replace(/[^\d+]/g, '')
  if (!compact) return ''
  if (compact.startsWith('+58')) return compact
  if (compact.startsWith('58')) return `+${compact}`
  if (compact.startsWith('0')) return `+58${compact.slice(1)}`
  return compact
}

export function getWhatsappVerifyModeFromEnv(): WhatsappVerifyMode {
  const raw = process.env.BOOKINGS_WHATSAPP_VERIFY_MODE?.trim().toLowerCase() ?? ''
  return raw === 'secure_link' ? 'secure_link' : 'manual_code'
}

export function getWhatsappSecureLinkTtlMinutesFromEnv(): number {
  const raw = process.env.BOOKINGS_WHATSAPP_SECURE_LINK_TTL_MINUTES?.trim() ?? ''
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return DEFAULT_SECURE_LINK_TTL_MINUTES
  return clampTtlMinutes(parsed)
}

export function isWhatsappSecureLinkEnabledFromEnv(): boolean {
  return parseBoolean(process.env.BOOKINGS_WHATSAPP_SECURE_LINK_ENABLED)
}

export function getWhatsappSecureLinkAllowedPhonesFromEnv(): Set<string> {
  const raw = process.env.BOOKINGS_WHATSAPP_SECURE_LINK_ALLOWED_PHONES?.trim() ?? ''
  if (!raw) return new Set()

  const values = raw
    .split(',')
    .map((value) => normalizeWhatsappVeForPolicy(value))
    .filter(Boolean)

  return new Set(values)
}

export function getWhatsappVerificationConfigFromEnv(): WhatsappVerificationConfig {
  const mode = getWhatsappVerifyModeFromEnv()
  const secureLinkEnabled = isWhatsappSecureLinkEnabledFromEnv()
  const secureLinkTtlMinutes = getWhatsappSecureLinkTtlMinutesFromEnv()

  return {
    mode,
    secureLinkEnabled,
    secureLinkTtlMinutes,
  }
}

export function isSecureLinkPhoneAllowedByEnv(phone: string): boolean {
  const allowedPhones = getWhatsappSecureLinkAllowedPhonesFromEnv()
  if (allowedPhones.size === 0) return true
  return allowedPhones.has(normalizeWhatsappVeForPolicy(phone))
}

export function resolveBookingsPublicBaseUrl(): BookingsPublicBaseUrlResolution {
  const fromPublic = normalizeBaseUrl(process.env.BOOKINGS_PUBLIC_BASE_URL)
  if (fromPublic) {
    return {
      baseUrl: fromPublic,
      source: 'BOOKINGS_PUBLIC_BASE_URL',
      host: safeHostFromUrl(fromPublic),
    }
  }

  const fromApp = normalizeBaseUrl(process.env.BOOKINGS_APP_BASE_URL)
  if (fromApp) {
    return {
      baseUrl: fromApp,
      source: 'BOOKINGS_APP_BASE_URL',
      host: safeHostFromUrl(fromApp),
    }
  }

  const fromNextPublic = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (fromNextPublic) {
    return {
      baseUrl: fromNextPublic,
      source: 'NEXT_PUBLIC_APP_URL',
      host: safeHostFromUrl(fromNextPublic),
    }
  }

  const fromVercel = normalizeBaseUrl(process.env.VERCEL_URL)
  if (fromVercel) {
    return {
      baseUrl: fromVercel,
      source: 'VERCEL_URL',
      host: safeHostFromUrl(fromVercel),
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const localhost = 'http://localhost:3000'
    return {
      baseUrl: localhost,
      source: 'LOCALHOST_DEV',
      host: safeHostFromUrl(localhost),
    }
  }

  const fallback = 'https://www.turpialsound.com'
  return {
    baseUrl: fallback,
    source: 'DEFAULT_FALLBACK',
    host: safeHostFromUrl(fallback),
  }
}

export function getBookingsPublicBaseUrl(): string {
  return resolveBookingsPublicBaseUrl().baseUrl
}
