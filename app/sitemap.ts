import type { MetadataRoute } from 'next'
import {
  salaEnsayoHubPath,
  salaEnsayoModalities,
} from '@/content/sala-de-ensayo-en-caracas'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.turpialsound.com'

  const staticRoutes = [
    { url: `${base}/`, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${base}/reservas`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${base}/salas-de-ensayo`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/estudio-de-grabacion`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${base}/servicios`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/contacto`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${base}/recursos`, priority: 0.6, changeFrequency: 'weekly' as const },
    { url: `${base}/recursos/preguntas-frecuentes`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${base}/marketplace`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${base}/recursos/donde-reservar-sala-de-ensayo-en-caracas`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${base}${salaEnsayoHubPath}`, priority: 0.95, changeFrequency: 'weekly' as const },
    ...salaEnsayoModalities.map((item) => ({
      url: `${base}${salaEnsayoHubPath}/${item.slug}`,
      priority: 0.85,
      changeFrequency: 'weekly' as const,
    })),
  ]

  return staticRoutes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
