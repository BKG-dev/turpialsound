import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.turpialsound.com'

  const staticRoutes = [
    { url: base, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${base}/reservas`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/salas-de-ensayo`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/estudio-de-grabacion`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/contacto`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/recursos`, priority: 0.6, changeFrequency: 'weekly' as const },
    { url: `${base}/recursos/preguntas-frecuentes`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${base}/marketplace`, priority: 0.9, changeFrequency: 'daily' as const },
  ]

  const staticSitemapEntries = staticRoutes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  return staticSitemapEntries
}
