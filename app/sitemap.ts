import type { MetadataRoute } from 'next'
import { siteConfig } from '@/content/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url

  const routes = [
    { url: base, priority: 1.0, changeFrequency: 'weekly' as const },
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

  return routes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
