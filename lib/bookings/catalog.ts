// Turpial Sound — Catálogo estático de servicios y variantes
// Fase 1B.2
//
// Fuente única de datos del catálogo para el wizard público.
// Alineado manualmente con prisma/seed.ts.
// Reemplazar por una query real cuando se implemente la capa de persistencia.

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

import {
  BOOKING_CATALOG_ADDONS,
  BOOKING_CATALOG_SERVICES,
  type BookingPriceUnit,
} from '@/lib/bookings/pricing'

export interface CatalogService {
  slug: string
  name: string
  description: string
}

export interface CatalogVariant {
  slug: string
  name: string
  description: string | null
  serviceSlug: string
  priceUsd?: number | null
  priceUnit?: BookingPriceUnit
  showPriceToClient?: boolean
  maxHours?: number | null
  blockWhenExceedingMaxHours?: boolean
  weekendSurchargeUsd?: number | null
  canBeStandalone?: boolean
  canBeComplement?: boolean
  badges?: string[]
}

// ─────────────────────────────────────────────────────────────────
// SERVICIOS — alineados con prisma/seed.ts
// ─────────────────────────────────────────────────────────────────

export const CATALOG_SERVICES: CatalogService[] = [
  {
    slug: 'sala-ensayo',
    name: 'Sala de Ensayo',
    description: 'Reserva por horas con modalidades diferenciadas y recargo especial fin de semana.',
  },
  {
    slug: 'grabacion',
    name: 'Grabación',
    description: 'Servicio separado entre grabación de ensayo y hora de grabación en estudio.',
  },
  {
    slug: 'produccion-musical',
    name: 'Producción Musical',
    description: 'Servicio principal por tema, sin variantes comerciales adicionales por ahora.',
  },
  {
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y Masterización',
    description: 'Servicio separado por mezcla, master o paquete conjunto por tema.',
  },
  {
    slug: 'podcast-locucion',
    name: 'Podcast / Locución',
    description: 'Servicio separado entre producción de podcast y sesiones de locución.',
  },
  {
    slug: 'video-session',
    name: 'Video Session',
    description: 'Incluye Studio Session fija y diseño de sonido para video como opción standalone o complemento.',
  },
  {
    slug: 'arreglos-musicales',
    name: 'Arreglos Musicales',
    description: 'Servicio principal por tema, sin variantes comerciales adicionales por ahora.',
  },
  {
    slug: 'consultoria',
    name: 'Consultoría',
    description: 'Clase o consultoría de producción por hora.',
  },
]

// ─────────────────────────────────────────────────────────────────
// VARIANTES — alineadas con prisma/seed.ts
// sala-ensayo: 3 variantes específicas
// resto: 1 variante estándar por servicio
// ─────────────────────────────────────────────────────────────────

export const CATALOG_VARIANTS: CatalogVariant[] = [
  {
    slug: 'sala-ensayo-flexible',
    name: 'Flexible',
    description: 'Tarifa flexible; la sesion puede reprogramarse con aviso previo si entra una solicitud prioritaria.',
    serviceSlug: 'sala-ensayo',
    priceUsd: 20,
    priceUnit: 'hour',
    showPriceToClient: true,
    weekendSurchargeUsd: 5,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Recargo fin de semana'],
  },
  {
    slug: 'sala-ensayo-premium',
    name: 'Premium',
    description: 'Horario fijo y garantizado, no sujeto a cambios.',
    serviceSlug: 'sala-ensayo',
    priceUsd: 25,
    priceUnit: 'hour',
    showPriceToClient: true,
    weekendSurchargeUsd: 5,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Recargo fin de semana'],
  },
  {
    slug: 'sala-ensayo-prioritaria',
    name: 'Prioritaria',
    description: 'Acceso prioritario al espacio cuando lo necesitas.',
    serviceSlug: 'sala-ensayo',
    priceUsd: 30,
    priceUnit: 'hour',
    showPriceToClient: true,
    weekendSurchargeUsd: 5,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Recargo fin de semana'],
  },
  {
    slug: 'grabacion-ensayo',
    name: 'Grabación de ensayo',
    description: 'Registro de ensayo por hora.',
    serviceSlug: 'grabacion',
    priceUsd: 35,
    priceUnit: 'hour',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'grabacion-hora-estudio',
    name: 'Hora de grabación',
    description: 'Sesión de grabación en estudio por hora.',
    serviceSlug: 'grabacion',
    priceUsd: 40,
    priceUnit: 'hour',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'produccion-musical-por-tema',
    name: 'Producción por tema',
    description: 'Servicio principal por tema.',
    serviceSlug: 'produccion-musical',
    priceUsd: 200,
    priceUnit: 'track',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'mezcla-por-tema',
    name: 'Mezcla',
    description: 'Proceso de mezcla por tema.',
    serviceSlug: 'mezcla-masterizacion',
    priceUsd: 150,
    priceUnit: 'track',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'master-por-tema',
    name: 'Master',
    description: 'Proceso de master por tema.',
    serviceSlug: 'mezcla-masterizacion',
    priceUsd: 150,
    priceUnit: 'track',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'mezcla-master-por-tema',
    name: 'Mezcla + Master',
    description: 'Paquete conjunto por tema.',
    serviceSlug: 'mezcla-masterizacion',
    priceUsd: 300,
    priceUnit: 'track',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Paquete conjunto'],
  },
  {
    slug: 'podcast-por-episodio',
    name: 'Podcast',
    description: 'Producción por episodio con máximo 4 horas por sesión.',
    serviceSlug: 'podcast-locucion',
    priceUsd: 100,
    priceUnit: 'episode',
    showPriceToClient: true,
    maxHours: 4,
    blockWhenExceedingMaxHours: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Máximo 4 horas'],
  },
  {
    slug: 'locucion-por-hora',
    name: 'Locución',
    description: 'Sesión de locución por hora.',
    serviceSlug: 'podcast-locucion',
    priceUsd: 50,
    priceUnit: 'hour',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'studio-session-fija',
    name: 'Studio Session',
    description: 'Sesión fija de video con máximo 4 horas.',
    serviceSlug: 'video-session',
    priceUsd: 500,
    priceUnit: 'fixed',
    showPriceToClient: true,
    maxHours: 4,
    blockWhenExceedingMaxHours: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: ['Máximo 4 horas'],
  },
  {
    slug: 'diseno-sonoro-video',
    name: 'Diseño de sonido para video',
    description: 'Puede pedirse como servicio aparte o como complemento.',
    serviceSlug: 'video-session',
    priceUsd: 60,
    priceUnit: 'hour',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: true,
    badges: ['Standalone o complemento'],
  },
  {
    slug: 'arreglos-musicales-por-tema',
    name: 'Arreglo por tema',
    description: 'Servicio principal por tema.',
    serviceSlug: 'arreglos-musicales',
    priceUsd: 200,
    priceUnit: 'track',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
  {
    slug: 'consultoria-produccion',
    name: 'Clase / consultoría de producción',
    description: 'Consultoría o clase por hora.',
    serviceSlug: 'consultoria',
    priceUsd: 80,
    priceUnit: 'hour',
    showPriceToClient: true,
    canBeStandalone: true,
    canBeComplement: false,
    badges: [],
  },
]

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Devuelve las variantes activas de un servicio dado su slug. */
export function getVariantsForService(serviceSlug: string): CatalogVariant[] {
  return CATALOG_VARIANTS.filter((v) => v.serviceSlug === serviceSlug)
}

export function getAddonsForService(serviceSlug: string) {
  return BOOKING_CATALOG_ADDONS.filter((addon) => addon.serviceSlugs.includes(serviceSlug))
}

export function getVariantPriceLabel(variant: CatalogVariant): string | null {
  if (!variant.showPriceToClient || variant.priceUsd == null || !variant.priceUnit) {
    return null
  }

  if (variant.priceUnit === 'fixed') {
    return `${variant.priceUsd} USD fijo`
  }

  const unitLabel =
    variant.priceUnit === 'hour' ? 'hora' :
    variant.priceUnit === 'track' ? 'tema' :
    'episodio'

  return `${variant.priceUsd} USD / ${unitLabel}`
}

export function getServiceStartingPriceUsd(serviceSlug: string): number | null {
  const service = BOOKING_CATALOG_SERVICES.find((entry) => entry.slug === serviceSlug)
  if (!service) return null

  const amounts = service.variants
    .map((variant) => variant.pricing.amountUsd)
    .filter((amount): amount is number => amount !== null)

  if (amounts.length === 0) return null

  return Math.min(...amounts)
}
