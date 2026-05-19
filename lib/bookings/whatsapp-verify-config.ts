export type WhatsappVerifyMode = 'manual_code' | 'secure_link'

export interface WhatsappVerificationConfig {
  mode: WhatsappVerifyMode
  secureLinkEnabled: boolean
  secureLinkTtlMinutes: number
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

export function getBookingsPublicBaseUrl(): string {
  const candidate =
    process.env.BOOKINGS_PUBLIC_BASE_URL?.trim() ||
    process.env.BOOKINGS_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'https://www.turpialsound.com'

  return candidate.replace(/\/+$/, '')
}
