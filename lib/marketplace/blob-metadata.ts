import { getDb } from '@/lib/marketplace/db'

export type MarketplaceBlobEntityType = 'listing_image' | 'payment_proof' | 'avatar'

type RecordMarketplaceBlobMetadataInput = {
  url: string
  pathname?: string | null
  sizeBytes?: number | null
  contentType?: string | null
  entityType: MarketplaceBlobEntityType
  entityId?: string | null
  uploadedAt?: Date | null
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean ? clean.slice(0, maxLength) : null
}

function cleanBlobPathname(value: unknown): string | null {
  const clean = cleanString(value, 500)
  if (!clean) return null

  try {
    const parsed = new URL(clean, 'https://local.invalid')
    return parsed.pathname.replace(/^\/+/, '') || null
  } catch {
    return clean.split(/[?#]/, 1)[0]?.replace(/^\/+/, '').slice(0, 500) || null
  }
}

function cleanBlobMetadataUrl(value: unknown, entityType: MarketplaceBlobEntityType): string | null {
  const pathname = cleanBlobPathname(value)
  if (!pathname) return null

  if (entityType === 'payment_proof') return pathname

  const clean = cleanString(value, 600)
  if (!clean) return pathname

  try {
    const parsed = new URL(clean, 'https://local.invalid')
    return parsed.origin === 'https://local.invalid'
      ? pathname
      : `${parsed.origin}${parsed.pathname}`.slice(0, 600)
  } catch {
    return pathname
  }
}

export async function recordMarketplaceBlobMetadata(input: RecordMarketplaceBlobMetadataInput): Promise<void> {
  const url = cleanBlobMetadataUrl(input.url, input.entityType)
  if (!url) return
  const pathname = cleanBlobPathname(input.pathname) ?? cleanBlobPathname(url)

  const db = await getDb()
  if (!db) return

  try {
    const sizeBytes = typeof input.sizeBytes === 'number' && Number.isFinite(input.sizeBytes)
      ? Math.max(0, Math.trunc(input.sizeBytes))
      : null
    const now = new Date()

    await db.mpBlobObjectMetadata.upsert({
      where: { url },
      update: {
        pathname,
        sizeBytes: sizeBytes == null ? undefined : BigInt(sizeBytes),
        contentType: cleanString(input.contentType, 120),
        entityType: input.entityType,
        entityId: cleanString(input.entityId, 100),
        uploadedAt: input.uploadedAt ?? now,
      },
      create: {
        url,
        pathname,
        sizeBytes: sizeBytes == null ? null : BigInt(sizeBytes),
        contentType: cleanString(input.contentType, 120),
        entityType: input.entityType,
        entityId: cleanString(input.entityId, 100),
        uploadedAt: input.uploadedAt ?? now,
      },
    })
  } catch {
    // Metadata is observability only; uploads and checkout must not fail because of it.
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function attachMarketplaceBlobMetadataToEntity(
  urls: string[],
  entityType: MarketplaceBlobEntityType,
  entityId: string,
): Promise<void> {
  const cleanUrls = urls.map(url => cleanBlobMetadataUrl(url, entityType)).filter((url): url is string => Boolean(url))
  const cleanEntityId = cleanString(entityId, 100)
  if (cleanUrls.length === 0 || !cleanEntityId) return

  const db = await getDb()
  if (!db) return

  try {
    await db.mpBlobObjectMetadata.updateMany({
      where: { url: { in: cleanUrls } },
      data: { entityType, entityId: cleanEntityId },
    })
  } catch {
    // Non-critical metadata linking only.
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
