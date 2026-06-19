// Turpial Sound - Fuente de verdad del catalogo tarifario aprobado
// Fase 1B.6b

export type BookingPriceUnit = 'hour' | 'track' | 'episode' | 'fixed'

export interface BookingPricingRule {
  amountUsd: number | null
  unit: BookingPriceUnit
  showPriceToClient: boolean
  weekendSurchargeUsd?: number
  weekendSurchargeAppliesOn?: number[]
  maxHours?: number
  blockWhenExceedingMaxHours?: boolean
}

export interface BookingCatalogAddonDefinition {
  slug: string
  name: string
  description: string
  serviceSlugs: string[]
  pricing?: BookingPricingRule
  showPriceToClient: boolean
}

export interface BookingCatalogVariantDefinition {
  slug: string
  serviceSlug: string
  name: string
  description: string | null
  pricing: BookingPricingRule
  badges?: string[]
  canBeStandalone?: boolean
  canBeComplement?: boolean
}

export interface BookingCatalogServiceDefinition {
  slug: string
  name: string
  description: string
  variants: BookingCatalogVariantDefinition[]
}

export const BOOKING_CATALOG_ADDONS: BookingCatalogAddonDefinition[] = [
  {
    slug: 'tecnico-sonido',
    name: 'Tecnico de sonido',
    description: 'Acompanamiento tecnico durante la sesion.',
    serviceSlugs: ['sala-ensayo', 'grabacion', 'podcast-locucion', 'video-session'],
    pricing: {
      amountUsd: 0,
      unit: 'fixed',
      showPriceToClient: true,
    },
    showPriceToClient: true,
  },
  {
    slug: 'backline-equipamiento',
    name: 'Backline / equipamiento adicional',
    description: 'Instrumentos y equipamiento adicional segun disponibilidad.',
    serviceSlugs: ['sala-ensayo', 'grabacion', 'video-session'],
    pricing: {
      amountUsd: 0,
      unit: 'fixed',
      showPriceToClient: true,
    },
    showPriceToClient: true,
  },
]

export const BOOKING_CATALOG_SERVICES: BookingCatalogServiceDefinition[] = [
  {
    slug: 'sala-ensayo',
    name: 'Sala de Ensayo',
    description: 'Reserva sala por horas con modalidades flexibles y recargo especial fin de semana.',
    variants: [
      {
        slug: 'sala-ensayo-flexible',
        serviceSlug: 'sala-ensayo',
        name: 'Flexible',
        description:
          'Tarifa flexible; la sesion puede reprogramarse con aviso previo si entra una solicitud prioritaria.',
        pricing: {
          amountUsd: 20,
          unit: 'hour',
          showPriceToClient: true,
          weekendSurchargeUsd: 5,
          weekendSurchargeAppliesOn: [0, 6],
        },
        badges: ['Recargo fin de semana'],
        canBeStandalone: true,
      },
      {
        slug: 'sala-ensayo-premium',
        serviceSlug: 'sala-ensayo',
        name: 'Premium',
        description: 'Horario fijo y garantizado, no sujeto a cambios.',
        pricing: {
          amountUsd: 25,
          unit: 'hour',
          showPriceToClient: true,
          weekendSurchargeUsd: 5,
          weekendSurchargeAppliesOn: [0, 6],
        },
        badges: ['Recargo fin de semana'],
        canBeStandalone: true,
      },
      {
        slug: 'sala-ensayo-prioritaria',
        serviceSlug: 'sala-ensayo',
        name: 'Prioritaria',
        description: 'Acceso prioritario al espacio cuando lo necesitas.',
        pricing: {
          amountUsd: 30,
          unit: 'hour',
          showPriceToClient: true,
          weekendSurchargeUsd: 5,
          weekendSurchargeAppliesOn: [0, 6],
        },
        badges: ['Recargo fin de semana'],
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'grabacion',
    name: 'Grabacion',
    description: 'Servicio de grabacion separado por tipo de sesion.',
    variants: [
      {
        slug: 'grabacion-ensayo',
        serviceSlug: 'grabacion',
        name: 'Grabacion de ensayo',
        description: '35 USD por hora para documentar o producir ensayos.',
        pricing: {
          amountUsd: 35,
          unit: 'hour',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
      {
        slug: 'grabacion-hora-estudio',
        serviceSlug: 'grabacion',
        name: 'Hora de grabacion',
        description: '40 USD por hora para sesiones de grabacion en estudio.',
        pricing: {
          amountUsd: 40,
          unit: 'hour',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'produccion-musical',
    name: 'Produccion Musical',
    description: 'Servicio principal por tema, sin variantes comerciales adicionales por ahora.',
    variants: [
      {
        slug: 'produccion-musical-por-tema',
        serviceSlug: 'produccion-musical',
        name: 'Produccion por tema',
        description: '200 USD por tema.',
        pricing: {
          amountUsd: 200,
          unit: 'track',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'arreglos-musicales',
    name: 'Arreglos Musicales',
    description: 'Servicio principal por tema, sin variantes comerciales adicionales por ahora.',
    variants: [
      {
        slug: 'arreglos-musicales-por-tema',
        serviceSlug: 'arreglos-musicales',
        name: 'Arreglo por tema',
        description: '200 USD por tema.',
        pricing: {
          amountUsd: 200,
          unit: 'track',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y Masterizacion',
    description: 'Servicio separado por tipo de entrega: mezcla, master o paquete conjunto.',
    variants: [
      {
        slug: 'mezcla-por-tema',
        serviceSlug: 'mezcla-masterizacion',
        name: 'Mezcla',
        description: '150 USD por tema.',
        pricing: {
          amountUsd: 150,
          unit: 'track',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
      {
        slug: 'master-por-tema',
        serviceSlug: 'mezcla-masterizacion',
        name: 'Master',
        description: '150 USD por tema.',
        pricing: {
          amountUsd: 150,
          unit: 'track',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
      {
        slug: 'mezcla-master-por-tema',
        serviceSlug: 'mezcla-masterizacion',
        name: 'Mezcla + Master',
        description: 'Paquete conjunto para tema completo.',
        pricing: {
          amountUsd: 300,
          unit: 'track',
          showPriceToClient: true,
        },
        badges: ['Paquete conjunto'],
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'podcast-locucion',
    name: 'Podcast / Locucion',
    description: 'Servicio separado entre produccion de podcast y sesiones de locucion.',
    variants: [
      {
        slug: 'podcast-por-episodio',
        serviceSlug: 'podcast-locucion',
        name: 'Podcast',
        description: '100 USD por episodio. Maximo 4 horas por sesion.',
        pricing: {
          amountUsd: 100,
          unit: 'episode',
          showPriceToClient: true,
          maxHours: 4,
          blockWhenExceedingMaxHours: true,
        },
        badges: ['Maximo 4 horas'],
        canBeStandalone: true,
      },
      {
        slug: 'locucion-por-hora',
        serviceSlug: 'podcast-locucion',
        name: 'Locucion',
        description: '50 USD por hora.',
        pricing: {
          amountUsd: 50,
          unit: 'hour',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
    ],
  },
  {
    slug: 'video-session',
    name: 'Video Session',
    description: 'Servicio audiovisual con opcion de sesion de estudio o diseno sonoro para video.',
    variants: [
      {
        slug: 'studio-session-fija',
        serviceSlug: 'video-session',
        name: 'Studio Session',
        description: '500 USD fijo. Maximo 4 horas por sesion.',
        pricing: {
          amountUsd: 500,
          unit: 'fixed',
          showPriceToClient: true,
          maxHours: 4,
          blockWhenExceedingMaxHours: true,
        },
        badges: ['Maximo 4 horas'],
        canBeStandalone: true,
      },
      {
        slug: 'diseno-sonoro-video',
        serviceSlug: 'video-session',
        name: 'Diseno de sonido para video',
        description: '60 USD por hora. Puede pedirse como servicio aparte o como complemento.',
        pricing: {
          amountUsd: 60,
          unit: 'hour',
          showPriceToClient: true,
        },
        badges: ['Standalone o complemento'],
        canBeStandalone: true,
        canBeComplement: true,
      },
    ],
  },
  {
    slug: 'consultoria',
    name: 'Consultoria',
    description: 'Clase o consultoria de produccion por hora.',
    variants: [
      {
        slug: 'consultoria-produccion',
        serviceSlug: 'consultoria',
        name: 'Clase / consultoria de produccion',
        description: '80 USD por hora.',
        pricing: {
          amountUsd: 80,
          unit: 'hour',
          showPriceToClient: true,
        },
        canBeStandalone: true,
      },
    ],
  },
]
