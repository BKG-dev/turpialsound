import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/marketplace/auth'
import {
  isMarketplaceAnalyticsEventType,
  trackMarketplaceEvent,
  type MarketplaceAnalyticsEventType,
} from '@/lib/marketplace/analytics'

export const runtime = 'nodejs'

const MAX_BODY_CHARS = 1800
const MAX_EVENTS_PER_MINUTE = 60
const rateWindow = new Map<string, { count: number; resetAt: number }>()
const ALLOWED_METADATA_KEYS = new Set([
  'source',
  'component',
  'action',
  'category',
  'listingId',
  'transactionId',
  'entityType',
  'entityId',
  'position',
  'device',
  'variant',
  'status',
  'reason',
  'valueBucket',
  'currency',
  'method',
  'count',
  'total',
  'label',
])

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean ? clean.slice(0, maxLength) : null
}

function cleanUrlWithoutQuery(value: unknown, maxLength: number, fallbackBase = 'https://local.invalid'): string | null {
  const clean = cleanString(value, maxLength)
  if (!clean) return null

  try {
    const parsed = new URL(clean, fallbackBase)
    const pathname = parsed.pathname || '/'
    return parsed.origin === fallbackBase ? pathname.slice(0, maxLength) : `${parsed.origin}${pathname}`.slice(0, maxLength)
  } catch {
    return clean.split(/[?#]/, 1)[0]?.slice(0, maxLength) || null
  }
}

function clientKey(request: NextRequest, sessionId: string | null) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown'
  return `${ip}:${sessionId ?? 'anon'}`
}

function isRateLimited(key: string) {
  const now = Date.now()
  const current = rateWindow.get(key)
  if (!current || current.resetAt <= now) {
    rateWindow.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }

  current.count += 1
  return current.count > MAX_EVENTS_PER_MINUTE
}

function cleanMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const safeEntries = Object.entries(value as Record<string, unknown>)
    .slice(0, 10)
    .map(([key, raw]) => {
      const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40)
      if (!ALLOWED_METADATA_KEYS.has(safeKey)) return null
      if (typeof raw === 'string') {
        const safeValue = raw.trim().slice(0, 120)
        if (!safeValue) return null
        return [safeKey, safeValue] as const
      }
      if (typeof raw === 'number' && Number.isFinite(raw)) return [safeKey, raw] as const
      if (typeof raw === 'boolean') return [safeKey, raw] as const
      if (raw === null) return [safeKey, null] as const
      return null
    })
    .filter((entry): entry is readonly [string, string | number | boolean | null] => Boolean(entry))

  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : null
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text().catch(() => '')
  if (!rawBody || rawBody.length > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, message: 'Payload invalido' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, message: 'JSON invalido' }, { status: 400 })
  }

  const eventType = cleanString(payload.eventType, 80)
  if (!eventType || !isMarketplaceAnalyticsEventType(eventType)) {
    return NextResponse.json({ ok: false, message: 'Evento no permitido' }, { status: 400 })
  }

  const sessionId = cleanString(payload.sessionId, 120)
  if (isRateLimited(clientKey(request, sessionId))) {
    return NextResponse.json({ ok: false, message: 'Rate limit' }, { status: 429 })
  }

  const session = await getSession().catch(() => null)

  await trackMarketplaceEvent({
    eventType: eventType as MarketplaceAnalyticsEventType,
    listingId: cleanString(payload.listingId, 80),
    transactionId: cleanString(payload.transactionId, 80),
    userId: session?.userId ?? null,
    sessionId,
    path: cleanUrlWithoutQuery(payload.path, 240) ?? '/marketplace',
    referrer: cleanUrlWithoutQuery(payload.referrer, 240),
    device: cleanString(payload.device, 80),
    metadataJson: cleanMetadata(payload.metadataJson),
  })

  return NextResponse.json({ ok: true })
}
