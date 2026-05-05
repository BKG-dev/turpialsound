import type { MetadataRoute } from 'next'
import { siteConfig } from '@/content/site'
import { getDb } from '@/lib/marketplace/db'

async function getPublicListingEntries() {
  const db = await getDb()
  if (!db) return []

  try {
    const listings = await db.mpListing.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    await db.$disconnect()
    return listings
  } catch {
    await db.$disconnect().catch(() => {})
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url

  const staticRoutes = [
    { url: base, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${base}/marketplace`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${base}/salas-de-ensayo`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/estudio-de-grabacion`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/produccion-musical`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios/podcast-locucion`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios/video-session`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios/mezcla-masterizacion`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios/arreglos-musicales`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}/artistas`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/nosotros`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}/recursos`, priority: 0.6, changeFrequency: 'weekly' as const },
    { url: `${base}/recursos/preguntas-frecuentes`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${base}/contacto`, priority: 0.8, changeFrequency: 'monthly' as const },
  ]

  const listingEntries = await getPublicListingEntries()

  const listingRoutes = listingEntries.map((entry: { slug: string; updatedAt: Date | string }) => ({
    url: `${base}/marketplace/${entry.slug}`,
    lastModified: entry.updatedAt instanceof Date ? entry.updatedAt : new Date(entry.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }))

  const staticSitemapEntries = staticRoutes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  return [...staticSitemapEntries, ...listingRoutes]
}
