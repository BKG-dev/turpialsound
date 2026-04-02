// Turpial Sound — Catálogo estático de servicios y variantes
// Fase 1B.2
//
// Fuente única de datos del catálogo para el wizard público.
// Alineado manualmente con prisma/seed.ts.
// Reemplazar por una query real cuando se implemente la capa de persistencia.

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

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
}

// ─────────────────────────────────────────────────────────────────
// SERVICIOS — alineados con prisma/seed.ts
// ─────────────────────────────────────────────────────────────────

export const CATALOG_SERVICES: CatalogService[] = [
  {
    slug: 'sala-ensayo',
    name: 'Sala de Ensayo',
    description: 'Espacio acústicamente tratado para ensayo de bandas y artistas.',
  },
  {
    slug: 'grabacion',
    name: 'Grabación',
    description: 'Sesión de grabación profesional en estudio.',
  },
  {
    slug: 'produccion-musical',
    name: 'Producción Musical',
    description: 'Producción integral de una pieza o proyecto musical.',
  },
  {
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y Masterización',
    description: 'Mezcla y masterización de material grabado.',
  },
  {
    slug: 'podcast-locucion',
    name: 'Podcast / Locución',
    description: 'Producción de podcast o sesión de locución profesional.',
  },
  {
    slug: 'video-session',
    name: 'Video Session',
    description: 'Sesión de video para artistas en set de producción audiovisual.',
  },
  {
    slug: 'arreglos-musicales',
    name: 'Arreglos Musicales',
    description: 'Arreglos y adaptaciones musicales para proyectos propios o de terceros.',
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
    description: 'Bloque de horas flexible sin horario preferencial fijo.',
    serviceSlug: 'sala-ensayo',
  },
  {
    slug: 'sala-ensayo-premium',
    name: 'Premium',
    description: 'Bloque preferencial con acceso a equipamiento completo.',
    serviceSlug: 'sala-ensayo',
  },
  {
    slug: 'sala-ensayo-prioritaria',
    name: 'Prioritaria',
    description: 'Reserva con prioridad máxima y confirmación acelerada.',
    serviceSlug: 'sala-ensayo',
  },
  {
    slug: 'grabacion-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'grabacion',
  },
  {
    slug: 'produccion-musical-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'produccion-musical',
  },
  {
    slug: 'mezcla-masterizacion-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'mezcla-masterizacion',
  },
  {
    slug: 'podcast-locucion-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'podcast-locucion',
  },
  {
    slug: 'video-session-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'video-session',
  },
  {
    slug: 'arreglos-musicales-standard',
    name: 'Estándar',
    description: null,
    serviceSlug: 'arreglos-musicales',
  },
]

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Devuelve las variantes activas de un servicio dado su slug. */
export function getVariantsForService(serviceSlug: string): CatalogVariant[] {
  return CATALOG_VARIANTS.filter((v) => v.serviceSlug === serviceSlug)
}
