export const VENEZUELAN_MOBILE_PREFIXES = ['0412', '0414', '0416', '0422', '0424', '0426'] as const

export function normalizeVenezuelanMobilePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  let normalized = digits

  if (normalized.startsWith('0058')) {
    normalized = `0${normalized.slice(4)}`
  } else if (normalized.startsWith('58')) {
    normalized = `0${normalized.slice(2)}`
  } else if (normalized.length === 10 && normalized.startsWith('4')) {
    normalized = `0${normalized}`
  }

  if (!/^04\d{9}$/.test(normalized)) return null

  return VENEZUELAN_MOBILE_PREFIXES.some(prefix => normalized.startsWith(prefix))
    ? normalized
    : null
}
