export interface PricingPackage {
  id: string
  name: string
  tagline: string
  iconName: 'Music2' | 'Mic2' | 'Layers' | 'SlidersHorizontal' | 'Radio' | 'Headphones'
  /** Base price in USD. null = custom quote */
  priceUSD: number | null
  /** Short unit label shown above the amount — e.g. "por hora", "por canción" */
  priceLabel: string
  features: string[]
  accent: 'gold' | 'cyan'
  badge?: string
  ctaLabel: string
  ctaHref: string
}

export const pricingPackages: PricingPackage[] = [
  {
    id: 'ensayo',
    name: 'Ensayo Musical',
    tagline: 'Sala lista. Solo llega y toca.',
    iconName: 'Music2',
    priceUSD: 20,
    priceLabel: 'por hora',
    features: [
      'Sala de ensayo general',
      'Ensayo para voces, cuerdas y coreografía',
    ],
    accent: 'gold',
    ctaLabel: 'Reservar sala',
    ctaHref: '/salas-de-ensayo',
  },
  {
    id: 'podcast',
    name: 'Studio Podcast',
    tagline: 'Tu voz, captada con precisión de estudio.',
    iconName: 'Radio',
    priceUSD: 25,
    priceLabel: 'por hora',
    features: [
      'Espacio optimizado para podcast',
      'Microfonía y acústica profesional',
    ],
    accent: 'cyan',
    ctaLabel: 'Reserva ahora',
    ctaHref: '/reservas',
  },
  {
    id: 'grabacion',
    name: 'Grabación',
    tagline: 'Sonido de referencia. Ingeniero incluido.',
    iconName: 'Mic2',
    priceUSD: 30,
    priceLabel: 'por hora',
    features: [
      'Grabación con ingeniero incluido',
      'Consola analógica y digital',
    ],
    accent: 'gold',
    badge: 'Más reservado',
    ctaLabel: 'Reservar estudio',
    ctaHref: '/estudio-de-grabacion',
  },
  {
    id: 'grabacion-mezcla',
    name: 'Grabación + Mezcla',
    tagline: 'De la sesión al archivo final. Sin saltos.',
    iconName: 'Headphones',
    priceUSD: 50,
    priceLabel: 'por hora',
    features: [
      'Sesión de grabación con ingeniero',
      'Mezcla del material incluida',
    ],
    accent: 'cyan',
    ctaLabel: 'Cotizar sesión',
    ctaHref: '/estudio-de-grabacion',
  },
  {
    id: 'post-produccion',
    name: 'Post-Producción',
    tagline: 'El sonido final que tu tema merece.',
    iconName: 'SlidersHorizontal',
    priceUSD: 75,
    priceLabel: 'por canción',
    features: [
      'Mezcla profesional',
      'Masterización para streaming',
    ],
    accent: 'gold',
    ctaLabel: 'Cotizar proyecto',
    ctaHref: '/produccion-musical',
  },
  {
    id: 'produccion-integral',
    name: 'Producción Integral',
    tagline: 'De la idea al master. En un solo lugar.',
    iconName: 'Layers',
    priceUSD: 300,
    priceLabel: 'desde',
    features: [
      'Dirección y producción musical ($300/tema)',
      'Paquete Todo Incluido ($500/tema)',
    ],
    accent: 'cyan',
    badge: 'Full service',
    ctaLabel: 'Hablar con el equipo',
    ctaHref: '/produccion-musical',
  },
]
