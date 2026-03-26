import type { Service } from '@/types'

export const coreServices: Service[] = [
  {
    id: 'salas-ensayo',
    slug: 'salas-de-ensayo',
    name: 'Salas de ensayo',
    shortName: 'Ensayo',
    tagline: 'Espacio acústico profesional para preparar tu sonido', // SUGGESTED
    description:
      'Salas tratadas acústicamente con equipamiento real. Para bandas, solistas y proyectos que necesitan trabajar en serio.', // SUGGESTED
    features: [
      'Tratamiento acústico profesional',
      'Equipamiento incluido', // CLIENT_REQUIRED: especificación de equipos
      'Disponibilidad flexible',
      'Locación en Caracas', // CLIENT_REQUIRED: dirección exacta
    ],
    priceNote: 'Consultar disponibilidad', // CLIENT_REQUIRED: precios reales
    ctaLabel: 'Ver salas disponibles',
    ctaHref: '/salas-de-ensayo',
    category: 'core',
    tier: 'money',
  },
  {
    id: 'estudio-grabacion',
    slug: 'estudio-de-grabacion',
    name: 'Estudio de grabación',
    shortName: 'Grabación',
    tagline: 'Sonido de estudio con criterio técnico real', // SUGGESTED
    description:
      'Consola, microfonía de referencia y ambiente controlado. El lugar donde grabaron artistas como Oscar D\'León, Domingo Quiñones y Dimensión Latina.', // CONFIRMED artistas; contexto SUGGESTED
    features: [
      'Consola analógica / digital de referencia', // CLIENT_REQUIRED: especificaciones exactas
      'Microfonía de alto nivel', // CLIENT_REQUIRED
      'Sala de control tratada',
      'Operador técnico disponible', // CLIENT_REQUIRED: confirmar
    ],
    priceNote: 'Desde 100 USD / sesión', // SUGGESTED — CLIENT_REQUIRED para tarifa real
    ctaLabel: 'Cotizar sesión',
    ctaHref: '/estudio-de-grabacion',
    category: 'core',
    tier: 'money',
  },
  {
    id: 'produccion-musical',
    slug: 'produccion-musical',
    name: 'Producción musical',
    shortName: 'Producción',
    tagline: 'De la idea al master en un solo lugar', // SUGGESTED
    description:
      'Producción integral: arreglos, grabación, mezcla y masterización. 30 años de experiencia acumulada del equipo en géneros tropicales, pop y más.', // CONFIRMED años; géneros SUGGESTED
    features: [
      'Producción completa o por etapas',
      'Arreglos musicales',
      'Mezcla y masterización',
      'Experiencia en géneros venezolanos e internacionales',
    ],
    priceNote: 'Presupuesto a medida', // SUGGESTED
    ctaLabel: 'Hablar con el equipo',
    ctaHref: '/produccion-musical',
    category: 'core',
    tier: 'money',
  },
]

export const expandedServices: Service[] = [
  {
    id: 'podcast-locucion',
    slug: 'podcast-locucion',
    name: 'Podcast y locución',
    shortName: 'Podcast',
    tagline: 'Sonido limpio para contenido que se escucha profesional', // SUGGESTED
    description: 'Cabina tratada, operación técnica y entrega lista para distribución.', // SUGGESTED
    features: ['Cabina insonorizada', 'Post-producción incluida', 'Formatos para Spotify, YouTube, RSS'],
    priceNote: 'Consultar tarifas', // CLIENT_REQUIRED
    ctaLabel: 'Cotizar sesión',
    ctaHref: '/servicios/podcast-locucion',
    category: 'expanded',
    tier: 'satellite',
  },
  {
    id: 'video-session',
    slug: 'video-session',
    name: 'Video sessions',
    shortName: 'Video',
    tagline: 'Captura en video de tus sesiones en el estudio', // SUGGESTED
    description: 'Producción audiovisual para artistas que necesitan contenido visual de sus sesiones de grabación o ensayo.', // SUGGESTED
    features: ['Filmación en el estudio', 'Iluminación profesional', 'Edición básica incluida'], // CLIENT_REQUIRED: confirmar incluidos
    priceNote: 'Consultar tarifas', // CLIENT_REQUIRED
    ctaLabel: 'Ver más detalles',
    ctaHref: '/servicios/video-session',
    category: 'expanded',
    tier: 'satellite',
  },
  {
    id: 'mezcla-masterizacion',
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y masterización',
    shortName: 'Mezcla',
    tagline: 'El sonido final que tu producción merece', // SUGGESTED
    description: 'Servicio independiente de mezcla y masterización para proyectos grabados dentro o fuera del estudio.', // SUGGESTED
    features: ['Mezcla estéreo y stems', 'Masterización para streaming y físico', 'Revisiones incluidas'], // CLIENT_REQUIRED: número revisiones
    priceNote: 'Desde 80 USD por tema', // SUGGESTED — CLIENT_REQUIRED
    ctaLabel: 'Cotizar proyecto',
    ctaHref: '/servicios/mezcla-masterizacion',
    category: 'expanded',
    tier: 'satellite',
  },
  {
    id: 'arreglos-musicales',
    slug: 'arreglos-musicales',
    name: 'Arreglos musicales',
    shortName: 'Arreglos',
    tagline: 'Estructura y armonía para tu música', // SUGGESTED
    description: 'Arreglos completos o parciales para producciones que necesitan criterio musical profesional.', // SUGGESTED
    features: ['Orquestación', 'Arreglos para banda', 'MIDI y producción electrónica'],
    priceNote: 'Presupuesto a medida', // CLIENT_REQUIRED
    ctaLabel: 'Hablar con el equipo',
    ctaHref: '/servicios/arreglos-musicales',
    category: 'expanded',
    tier: 'satellite',
  },
]

export const allServices = [...coreServices, ...expandedServices]

export function getServiceBySlug(slug: string): Service | undefined {
  return allServices.find((s) => s.slug === slug)
}
