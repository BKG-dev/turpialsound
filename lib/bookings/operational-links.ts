function normalizeBaseUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '')
  }

  return `https://${raw.replace(/\/+$/, '')}`
}

export function getBookingsAppBaseUrl(): string | null {
  return (
    normalizeBaseUrl(process.env.BOOKINGS_APP_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL)
  )
}

export function buildAdminPaymentProofUrl(publicCode: string): string | null {
  const baseUrl = getBookingsAppBaseUrl()
  if (!baseUrl) return null

  const normalizedCode = publicCode.trim().toUpperCase()
  if (!normalizedCode) return null

  return `${baseUrl}/admin/bookings/${encodeURIComponent(normalizedCode)}/payment-proof`
}
