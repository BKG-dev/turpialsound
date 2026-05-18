import { getDb } from '@/lib/marketplace/db'

export const MARKETPLACE_ANALYTICS_EVENT_TYPES = [
  'listing_view',
  'listing_click',
  'buy_click',
  'favorite_click',
  'checkout_start',
  'assistant_admin_db_status_view',
  'cart_checkout',
  'share_click',
  'referral_link_created',
  'referral_copy',
  'referral_whatsapp',
] as const

export type MarketplaceAnalyticsEventType = (typeof MARKETPLACE_ANALYTICS_EVENT_TYPES)[number]

export type TrackMarketplaceEventInput = {
  eventType: MarketplaceAnalyticsEventType
  listingId?: string | null
  transactionId?: string | null
  userId?: string | null
  sessionId?: string | null
  path: string
  referrer?: string | null
  device?: string | null
  metadataJson?: Record<string, unknown> | null
}

const EVENT_TYPE_SET = new Set<string>(MARKETPLACE_ANALYTICS_EVENT_TYPES)
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

function cleanMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value)
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

  return entries.length > 0 ? Object.fromEntries(entries) : null
}

export function isMarketplaceAnalyticsEventType(value: string): value is MarketplaceAnalyticsEventType {
  return EVENT_TYPE_SET.has(value)
}

export async function trackMarketplaceEvent(input: TrackMarketplaceEventInput): Promise<void> {
  const db = await getDb()
  if (!db) return

  try {
    await db.mpAnalyticsEvent.create({
      data: {
        eventType: input.eventType,
        listingId: cleanString(input.listingId, 80),
        transactionId: cleanString(input.transactionId, 80),
        userId: cleanString(input.userId, 80),
        sessionId: cleanString(input.sessionId, 120),
        path: cleanUrlWithoutQuery(input.path, 240) ?? '/marketplace',
        referrer: cleanUrlWithoutQuery(input.referrer, 240),
        device: cleanString(input.device, 80),
        metadataJson: cleanMetadata(input.metadataJson),
      },
    })
  } catch {
    // Tracking must never block marketplace UX.
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
