import type {
  CustomBundleCategory,
  CustomBundleEstimate,
  CustomBundleEstimateAdjustment,
  CustomBundleEstimateIssue,
  CustomBundleEstimateLine,
  CustomBundleItem,
  CustomBundleSelection,
} from '@/lib/bookings/types'

const WEEKEND_DAYS = new Set([0, 6])
const INCLUDED_ITEM_CATEGORY_SLUG = 'incluidos'
const TEMPORAL_CATEGORY_ORDER: Record<string, number> = {
  'sala-de-ensayo': 1,
  grabacion: 2,
  podcast: 3,
  locucion: 4,
  'video-session': 5,
  consultoria: 6,
}

export const CUSTOM_BUNDLE_CATEGORIES: CustomBundleCategory[] = [
  {
    slug: 'sala-de-ensayo',
    name: 'Sala de ensayo',
    description: 'Selecciona una sola modalidad de sala y ajusta las horas requeridas.',
    visualOrder: 10,
    active: true,
  },
  {
    slug: 'grabacion',
    name: 'Grabacion',
    description: 'Reserva grabacion de ensayo o grabacion en estudio por horas reales.',
    visualOrder: 20,
    active: true,
  },
  {
    slug: 'mezcla-masterizacion',
    name: 'Mezcla y masterizacion',
    description: 'Mezcla y master por tema sin consumir tiempo del bloque de calendario.',
    visualOrder: 30,
    active: true,
  },
  {
    slug: 'podcast-locucion',
    name: 'Podcast / locucion',
    description: 'Modalidades independientes con duracion de sesion y precio claro por unidad.',
    visualOrder: 40,
    active: true,
  },
  {
    slug: 'video-session',
    name: 'Video session',
    description: 'Studio Session fija con duracion maxima de 4 horas.',
    visualOrder: 50,
    active: true,
  },
  {
    slug: 'arreglos-musicales',
    name: 'Arreglos musicales',
    description: 'Arreglo musical por tema sin ocupacion horaria independiente.',
    visualOrder: 60,
    active: true,
  },
  {
    slug: 'adicionales',
    name: 'Adicionales',
    description: 'Complementos para enriquecer el paquete sin sumar horas al bloque.',
    visualOrder: 70,
    active: true,
  },
  {
    slug: 'consultoria',
    name: 'Consultoria',
    description: 'Clase o consultoria de produccion por hora.',
    visualOrder: 80,
    active: true,
  },
]

export const CUSTOM_BUNDLE_ITEMS: CustomBundleItem[] = [
  {
    slug: 'sala-flexible',
    categorySlug: 'sala-de-ensayo',
    groupSlug: 'sala-de-ensayo',
    clientPriceDisplay: 'itemized',
    name: 'Flexible',
    description: '20 USD por hora. Recargo de fin de semana de 5 USD por hora.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 20,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 1,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: 5,
    included: false,
  },
  {
    slug: 'sala-premium',
    categorySlug: 'sala-de-ensayo',
    groupSlug: 'sala-de-ensayo',
    clientPriceDisplay: 'itemized',
    name: 'Premium',
    description: '25 USD por hora. Recargo de fin de semana de 5 USD por hora.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 25,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 1,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: 5,
    included: false,
  },
  {
    slug: 'sala-prioritaria',
    categorySlug: 'sala-de-ensayo',
    groupSlug: 'sala-de-ensayo',
    clientPriceDisplay: 'itemized',
    name: 'Prioritaria',
    description: '30 USD por hora. Recargo de fin de semana de 5 USD por hora.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 30,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 1,
    visualOrder: 30,
    active: true,
    weekendSurchargeUsdPerHour: 5,
    included: false,
  },
  {
    slug: 'grabacion-ensayo',
    categorySlug: 'grabacion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Grabacion de ensayo',
    description: '35 USD por hora. Consume tiempo de calendario.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 35,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 2,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-estudio',
    categorySlug: 'grabacion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Grabacion en estudio',
    description: '40 USD por hora. Consume tiempo de calendario.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 40,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 2,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'mezcla',
    categorySlug: 'mezcla-masterizacion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Mezcla',
    description: '150 USD por tema. No consume tiempo de calendario.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 150,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'master',
    categorySlug: 'mezcla-masterizacion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Master',
    description: '150 USD por tema. No consume tiempo de calendario.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 150,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'podcast',
    categorySlug: 'podcast-locucion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Podcast',
    description: '100 USD por episodio. La sesion debe reservarse entre 1 y 4 horas.',
    commercialUnit: 'episodio',
    quantityType: 'episode',
    unitPriceUsd: 100,
    minimumQuantity: 1,
    maximumQuantity: 1,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: null,
    fixedPrice: true,
    requiresSessionDuration: true,
    minimumSessionMinutes: 60,
    maximumSessionMinutes: 240,
    scheduleOrder: 3,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'locucion',
    categorySlug: 'podcast-locucion',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Locucion',
    description: '50 USD por hora. Consume tiempo de calendario.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 50,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 4,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'studio-session',
    categorySlug: 'video-session',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Studio Session',
    description: '500 USD por servicio fijo. La sesion debe reservarse entre 1 y 4 horas.',
    commercialUnit: 'servicio',
    quantityType: 'unit',
    unitPriceUsd: 500,
    minimumQuantity: 1,
    maximumQuantity: 1,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: null,
    fixedPrice: true,
    requiresSessionDuration: true,
    minimumSessionMinutes: 60,
    maximumSessionMinutes: 240,
    scheduleOrder: 5,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'arreglo-musical',
    categorySlug: 'arreglos-musicales',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Arreglo musical',
    description: '200 USD por tema. No consume tiempo de calendario.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 200,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'combo-percusion',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Combo de percusion',
    description: 'Apoyo de percusion para enriquecer la produccion.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 150,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'instrumentos-adicionales',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Instrumentos adicionales',
    description: 'Incorpora instrumentos adicionales segun las necesidades del tema.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 20,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-piano',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de piano',
    description: 'Grabacion de piano para complementar el tema.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 30,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-bajo',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de bajo',
    description: 'Grabacion de bajo para complementar el tema.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 40,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-trombones',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de trombones',
    description: 'Grabacion de trombones adicionales para la produccion.',
    commercialUnit: 'unidad',
    quantityType: 'unit',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 50,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-trompetas',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de trompetas',
    description: 'Grabacion de trompetas adicionales para la produccion.',
    commercialUnit: 'unidad',
    quantityType: 'unit',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 60,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabacion-saxo',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de saxo',
    description: 'Grabacion de saxo para complementar el tema.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 70,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'cuerdas-sesion-completa',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de cuerdas - sesion completa',
    description: 'Sesion completa de grabacion de cuerdas para la produccion.',
    commercialUnit: 'sesion',
    quantityType: 'unit',
    unitPriceUsd: 480,
    minimumQuantity: 1,
    maximumQuantity: 1,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: true,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 80,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'cuerdas-por-instrumento',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabacion de cuerdas por instrumento',
    description: 'Grabacion individual de instrumentos de cuerda.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 90,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'grabaciones-voces',
    categorySlug: 'adicionales',
    groupSlug: null,
    clientPriceDisplay: 'aggregate_only',
    name: 'Grabaciones de voces',
    description: 'Grabacion de voces adicionales para el tema.',
    commercialUnit: 'tema',
    quantityType: 'track',
    unitPriceUsd: 40,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 100,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
  {
    slug: 'consultoria-produccion',
    categorySlug: 'consultoria',
    groupSlug: null,
    clientPriceDisplay: 'itemized',
    name: 'Clase / consultoria de produccion',
    description: '80 USD por hora. Consume tiempo de calendario.',
    commercialUnit: 'hora',
    quantityType: 'hour',
    unitPriceUsd: 80,
    minimumQuantity: 1,
    maximumQuantity: null,
    quantityStep: 1,
    consumesCalendar: true,
    minutesPerUnit: 60,
    fixedPrice: false,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: 6,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: false,
  },
]

export const CUSTOM_BUNDLE_INCLUDED_ITEMS: CustomBundleItem[] = [
  {
    slug: 'tecnico-sonido',
    categorySlug: INCLUDED_ITEM_CATEGORY_SLUG,
    groupSlug: null,
    clientPriceDisplay: 'included',
    name: 'Tecnico de sonido',
    description: 'Activado automaticamente e incluido.',
    commercialUnit: 'servicio',
    quantityType: 'unit',
    unitPriceUsd: 0,
    minimumQuantity: 1,
    maximumQuantity: 1,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: true,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 10,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: true,
  },
  {
    slug: 'backline-equipamiento',
    categorySlug: INCLUDED_ITEM_CATEGORY_SLUG,
    groupSlug: null,
    clientPriceDisplay: 'included',
    name: 'Backline / equipamiento',
    description: 'Activado automaticamente e incluido.',
    commercialUnit: 'servicio',
    quantityType: 'unit',
    unitPriceUsd: 0,
    minimumQuantity: 1,
    maximumQuantity: 1,
    quantityStep: 1,
    consumesCalendar: false,
    minutesPerUnit: null,
    fixedPrice: true,
    requiresSessionDuration: false,
    minimumSessionMinutes: null,
    maximumSessionMinutes: null,
    scheduleOrder: null,
    visualOrder: 20,
    active: true,
    weekendSurchargeUsdPerHour: null,
    included: true,
  },
]

const CUSTOM_BUNDLE_ITEM_INDEX = new Map(
  [...CUSTOM_BUNDLE_ITEMS, ...CUSTOM_BUNDLE_INCLUDED_ITEMS].map((item) => [item.slug, item]),
)

const CUSTOM_BUNDLE_CATEGORY_INDEX = new Map(
  CUSTOM_BUNDLE_CATEGORIES.map((category) => [category.slug, category]),
)

export function getCustomBundleCategories(): CustomBundleCategory[] {
  return [...CUSTOM_BUNDLE_CATEGORIES]
    .filter((category) => category.active)
    .sort((left, right) => left.visualOrder - right.visualOrder)
}

export function getCustomBundleItemsForCategory(categorySlug: string): CustomBundleItem[] {
  return [...CUSTOM_BUNDLE_ITEMS]
    .filter((item) => item.active && item.categorySlug === categorySlug)
    .sort((left, right) => left.visualOrder - right.visualOrder)
}

export function getCustomBundleIncludedItems(): CustomBundleItem[] {
  return [...CUSTOM_BUNDLE_INCLUDED_ITEMS]
    .filter((item) => item.active)
    .sort((left, right) => left.visualOrder - right.visualOrder)
}

export function getCustomBundleItemBySlug(slug: string): CustomBundleItem | null {
  return CUSTOM_BUNDLE_ITEM_INDEX.get(slug) ?? null
}

export function getCustomBundleCategoryBySlug(slug: string): CustomBundleCategory | null {
  return CUSTOM_BUNDLE_CATEGORY_INDEX.get(slug) ?? null
}

function isAggregateOnlyCustomBundleItem(item: CustomBundleItem): boolean {
  return item.clientPriceDisplay === 'aggregate_only'
}

function isIncludedCustomBundleItem(item: CustomBundleItem): boolean {
  return item.clientPriceDisplay === 'included'
}

export function formatCustomBundlePriceDisplay(item: CustomBundleItem): string {
  if (item.clientPriceDisplay === 'aggregate_only') {
    return `Unidad: ${item.commercialUnit}`
  }

  if (item.clientPriceDisplay === 'included') {
    return 'Incluido'
  }

  return `${item.unitPriceUsd} USD / ${item.commercialUnit}`
}

export function countCustomBundleAggregateOnlySelections(
  lines: CustomBundleEstimateLine[],
): number {
  return splitCustomBundleEstimateLines(lines).aggregateOnlyLines.length
}

export function splitCustomBundleEstimateLines(lines: CustomBundleEstimateLine[]): {
  itemizedLines: CustomBundleEstimateLine[]
  aggregateOnlyLines: CustomBundleEstimateLine[]
  includedLines: CustomBundleEstimateLine[]
} {
  return lines.reduce(
    (accumulator, line) => {
      if (isIncludedCustomBundleItem(line.item) || line.isIncluded) {
        accumulator.includedLines.push(line)
        return accumulator
      }

      if (isAggregateOnlyCustomBundleItem(line.item)) {
        accumulator.aggregateOnlyLines.push(line)
        return accumulator
      }

      accumulator.itemizedLines.push(line)
      return accumulator
    },
    {
      itemizedLines: [] as CustomBundleEstimateLine[],
      aggregateOnlyLines: [] as CustomBundleEstimateLine[],
      includedLines: [] as CustomBundleEstimateLine[],
    },
  )
}

export function calculateCustomBundleAdditionalSubtotal(
  lines: CustomBundleEstimateLine[],
): number {
  return lines.reduce((total, line) => {
    if (!isAggregateOnlyCustomBundleItem(line.item)) return total
    return total + line.lineTotalUsd
  }, 0)
}

export function normalizeCustomBundleSelections(
  selections: CustomBundleSelection[],
): CustomBundleSelection[] {
  const normalized = new Map<string, CustomBundleSelection>()

  for (const selection of selections) {
    const item = getCustomBundleItemBySlug(selection.itemSlug)
    if (!item || !item.active || isIncludedCustomBundleItem(item)) continue

    const quantity = Math.max(
      item.minimumQuantity,
      Math.trunc(Number.isFinite(selection.quantity) ? selection.quantity : item.minimumQuantity),
    )
    const limitedQuantity =
      item.maximumQuantity !== null ? Math.min(item.maximumQuantity, quantity) : quantity

    const sessionDurationMinutes =
      item.requiresSessionDuration && Number.isFinite(selection.sessionDurationMinutes ?? Number.NaN)
        ? Math.trunc(selection.sessionDurationMinutes ?? 0)
        : null

    normalized.set(item.slug, {
      itemSlug: item.slug,
      quantity: limitedQuantity,
      sessionDurationMinutes,
    })
  }

  return [...normalized.values()].sort((left, right) => {
    const leftItem = getCustomBundleItemBySlug(left.itemSlug)
    const rightItem = getCustomBundleItemBySlug(right.itemSlug)
    const leftOrder = leftItem?.visualOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = rightItem?.visualOrder ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

export function detectIncompatibleSelections(
  selections: CustomBundleSelection[],
): CustomBundleEstimateIssue[] {
  const issues: CustomBundleEstimateIssue[] = []
  const normalized = normalizeCustomBundleSelections(selections)
  const selectedItems = normalized
    .map((selection) => getCustomBundleItemBySlug(selection.itemSlug))
    .filter((item): item is CustomBundleItem => item !== null)

  const groupedSelections = new Map<string, CustomBundleItem[]>()
  for (const item of selectedItems) {
    if (!item.groupSlug) continue
    const current = groupedSelections.get(item.groupSlug) ?? []
    current.push(item)
    groupedSelections.set(item.groupSlug, current)
  }

  for (const [groupSlug, items] of groupedSelections) {
    if (items.length <= 1) continue
    if (groupSlug === 'sala-de-ensayo') {
      issues.push({
        code: 'EXCLUSIVE_SALA',
        message: 'Solo puedes seleccionar una modalidad de sala a la vez.',
      })
      continue
    }

    issues.push({
      code: `EXCLUSIVE_${groupSlug.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
      message: 'Seleccionaste opciones incompatibles entre si.',
    })
  }

  return issues
}

export function calculateCustomBundleLineSubtotal(
  item: CustomBundleItem,
  selection: CustomBundleSelection,
): number {
  return item.unitPriceUsd * selection.quantity
}

export function getCustomBundleLineDurationMinutes(
  item: CustomBundleItem,
  selection: CustomBundleSelection,
): number {
  if (!item.consumesCalendar) return 0

  if (item.requiresSessionDuration) {
    return Math.max(0, Math.trunc(selection.sessionDurationMinutes ?? 0))
  }

  const minutesPerUnit = item.minutesPerUnit ?? 0
  return Math.max(0, selection.quantity * minutesPerUnit)
}

export function calculateCustomBundleDurationTotal(
  lines: CustomBundleEstimateLine[],
): number {
  return lines.reduce((total, line) => total + line.durationMinutes, 0)
}

export function calculateCustomBundleSubtotal(lines: CustomBundleEstimateLine[]): number {
  return lines.reduce((total, line) => total + line.lineTotalUsd, 0)
}

export function applyWeekendSurcharge(
  lines: CustomBundleEstimateLine[],
  eventDate: string | null,
): CustomBundleEstimateAdjustment[] {
  if (!eventDate) return []

  const parsedDate = new Date(`${eventDate}T12:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return []

  if (!WEEKEND_DAYS.has(parsedDate.getDay())) return []

  const surchargeUsd = lines.reduce((total, line) => {
    const surchargePerHour = line.item.weekendSurchargeUsdPerHour ?? 0
    if (!surchargePerHour) return total
    if (line.item.scheduleOrder !== 1) return total

    return total + surchargePerHour * (line.durationMinutes / 60)
  }, 0)

  if (surchargeUsd <= 0) return []

  return [
    {
      label: 'Recargo de fin de semana',
      amountUsd: surchargeUsd,
    },
  ]
}

export function orderTemporalComponents(
  lines: CustomBundleEstimateLine[],
): CustomBundleEstimateLine[] {
  return [...lines].sort((left, right) => {
    const leftOrder =
      left.item.scheduleOrder ?? TEMPORAL_CATEGORY_ORDER[left.item.categorySlug] ?? 999
    const rightOrder =
      right.item.scheduleOrder ?? TEMPORAL_CATEGORY_ORDER[right.item.categorySlug] ?? 999

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    if (left.item.categorySlug !== right.item.categorySlug) {
      return left.item.visualOrder - right.item.visualOrder
    }

    return left.item.visualOrder - right.item.visualOrder
  })
}

function buildEstimateLine(
  item: CustomBundleItem,
  selection: CustomBundleSelection | null,
): CustomBundleEstimateLine {
  const quantity = selection?.quantity ?? 1
  const sessionDurationMinutes = selection?.sessionDurationMinutes ?? null
  const durationMinutes = selection
    ? getCustomBundleLineDurationMinutes(item, selection)
    : 0
  const unitPriceUsd = item.unitPriceUsd
  const lineTotalUsd = selection ? calculateCustomBundleLineSubtotal(item, selection) : 0

  return {
    item,
    label: item.name,
    quantity,
    sessionDurationMinutes,
    durationMinutes,
    unitPriceUsd,
    lineTotalUsd,
    isIncluded: isIncludedCustomBundleItem(item),
  }
}

function getCalendarBlockingIssue(
  lines: CustomBundleEstimateLine[],
): CustomBundleEstimateIssue | null {
  const timeLines = lines.filter((line) => !line.isIncluded && line.durationMinutes > 0)
  if (timeLines.length === 0) {
    return {
      code: 'NO_TIME_COMPONENT',
      message: 'Selecciona al menos un servicio con duracion para reservar un bloque en el calendario.',
    }
  }

  return null
}

function validateQuantityLine(line: CustomBundleEstimateLine): CustomBundleEstimateIssue | null {
  const { item, quantity } = line
  if (quantity < item.minimumQuantity) {
    return {
      code: `MIN_${item.slug}`,
      message: `${item.name} requiere al menos ${item.minimumQuantity} unidad${item.minimumQuantity === 1 ? '' : 'es'}.`,
    }
  }

  if (item.maximumQuantity !== null && quantity > item.maximumQuantity) {
    return {
      code: `MAX_${item.slug}`,
      message: `${item.name} admite un maximo de ${item.maximumQuantity} unidad${item.maximumQuantity === 1 ? '' : 'es'}.`,
    }
  }

  const step = item.quantityStep > 0 ? item.quantityStep : 1
  if ((quantity - item.minimumQuantity) % step !== 0) {
    return {
      code: `STEP_${item.slug}`,
      message: `${item.name} solo admite incrementos de ${step}.`,
    }
  }

  return null
}

function validateDurationLine(line: CustomBundleEstimateLine): CustomBundleEstimateIssue | null {
  const { item, durationMinutes } = line
  if (!item.consumesCalendar) return null

  if (item.requiresSessionDuration) {
    if (!durationMinutes) {
      return {
        code: `DURATION_REQUIRED_${item.slug}`,
        message: `${item.name} requiere seleccionar una duracion entre 1 y 4 horas.`,
      }
    }

    if (durationMinutes < (item.minimumSessionMinutes ?? 0)) {
      return {
        code: `DURATION_MIN_${item.slug}`,
        message: `${item.name} requiere al menos ${item.minimumSessionMinutes ?? 0} minutos.`,
      }
    }

    if (item.maximumSessionMinutes !== null && durationMinutes > item.maximumSessionMinutes) {
      return {
        code: `DURATION_MAX_${item.slug}`,
        message: `${item.name} no puede superar ${Math.floor(item.maximumSessionMinutes / 60)} horas por sesion.`,
      }
    }
  } else if (durationMinutes <= 0) {
    return {
      code: `DURATION_EMPTY_${item.slug}`,
      message: `${item.name} requiere una duracion mayor a cero.`,
    }
  }

  return null
}

export function validateCustomBundleSelection(
  selections: CustomBundleSelection[],
  _eventDate: string | null,
): CustomBundleEstimateIssue[] {
  const normalizedSelections = normalizeCustomBundleSelections(selections)
  const selectedItems = normalizedSelections
    .map((selection) => getCustomBundleItemBySlug(selection.itemSlug))
    .filter((item): item is CustomBundleItem => item !== null)

  const lines = selectedItems.map((item) => {
    const selection = normalizedSelections.find((entry) => entry.itemSlug === item.slug) ?? null
    return buildEstimateLine(item, selection)
  })

  const issues: CustomBundleEstimateIssue[] = []

  if (selectedItems.length === 0) {
    issues.push({
      code: 'EMPTY_SELECTION',
      message: 'Selecciona al menos un servicio para continuar.',
    })
    return issues
  }

  issues.push(...detectIncompatibleSelections(normalizedSelections))

  for (const line of lines) {
    const quantityIssue = validateQuantityLine(line)
    if (quantityIssue) {
      issues.push(quantityIssue)
    }

    const durationIssue = validateDurationLine(line)
    if (durationIssue) {
      issues.push(durationIssue)
    }
  }

  const calendarBlockingIssue = getCalendarBlockingIssue(lines)
  if (calendarBlockingIssue) {
    issues.push(calendarBlockingIssue)
  }

  const totalDurationMinutes = calculateCustomBundleDurationTotal(lines)
  if (!calendarBlockingIssue && totalDurationMinutes <= 0) {
    issues.push({
      code: 'ZERO_DURATION',
      message: 'Selecciona al menos un servicio con duracion para reservar un bloque en el calendario.',
    })
  }

  const subtotalUsd = calculateCustomBundleSubtotal(lines)
  if (subtotalUsd <= 0) {
    issues.push({
      code: 'ZERO_TOTAL',
      message: 'El total del paquete debe ser mayor que cero.',
    })
  }

  return issues
}

export function buildCustomBundleEstimate(input: {
  selections: CustomBundleSelection[]
  eventDate: string | null
}): CustomBundleEstimate {
  const normalizedSelections = normalizeCustomBundleSelections(input.selections)
  const selectedItems = normalizedSelections
    .map((selection) => {
      const item = getCustomBundleItemBySlug(selection.itemSlug)
      return item ? { item, selection } : null
    })
    .filter((entry): entry is { item: CustomBundleItem; selection: CustomBundleSelection } => entry !== null)

  const selectedLines = selectedItems.map(({ item, selection }) => buildEstimateLine(item, selection))
  const includedLines = getCustomBundleIncludedItems().map((item) => buildEstimateLine(item, null))
  const orderedLines = orderTemporalComponents([...selectedLines, ...includedLines])
  const adjustments = applyWeekendSurcharge(orderedLines, input.eventDate)
  const subtotalUsd = calculateCustomBundleSubtotal(orderedLines)
  const additionalSubtotalUsd = calculateCustomBundleAdditionalSubtotal(orderedLines)
  const estimatedTotalUsd =
    subtotalUsd + adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)
  const totalDurationMinutes = calculateCustomBundleDurationTotal(orderedLines)
  const blockingIssues = validateCustomBundleSelection(normalizedSelections, input.eventDate)

  return {
    lines: orderedLines,
    adjustments,
    additionalSubtotalUsd,
    subtotalUsd,
    estimatedTotalUsd,
    totalDurationMinutes,
    selectionCount: normalizedSelections.length,
    blockingIssues,
    isBlocked: blockingIssues.length > 0,
  }
}
