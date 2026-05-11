const NON_DIGITS_REGEX = /\D+/g

export function normalizeWhatsappText(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function normalizePhoneDigits(input: string): string {
  return input.replace(NON_DIGITS_REGEX, '')
}

export function normalizeVePhoneCandidates(input: string): string[] {
  const digits = normalizePhoneDigits(input)
  if (!digits) return []

  const candidates = new Set<string>()
  candidates.add(digits)

  if (digits.startsWith('58')) {
    candidates.add(digits.slice(2))
  } else if (digits.length === 10 && digits.startsWith('4')) {
    candidates.add(`58${digits}`)
  }

  if (digits.startsWith('0') && digits.length === 11 && digits[1] === '4') {
    const localNoZero = digits.slice(1)
    candidates.add(localNoZero)
    candidates.add(`58${localNoZero}`)
  }

  return Array.from(candidates).filter(Boolean)
}

export function phonesMatchVe(a: string, b: string): boolean {
  const setA = new Set(normalizeVePhoneCandidates(a))
  const setB = new Set(normalizeVePhoneCandidates(b))

  for (const candidate of setA) {
    if (setB.has(candidate)) return true
  }

  return false
}
