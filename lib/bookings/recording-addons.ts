export type RecordingAddonCategory =
  | 'percussion_salsa'
  | 'individual_instruments'
  | 'brass'
  | 'strings'

export type RecordingAddonUnit = 'tema' | 'unidad' | 'sesion'

export interface RecordingAddonDefinition {
  id: string
  slug: string
  publicName: string
  category: RecordingAddonCategory
  unit: RecordingAddonUnit
  priceUsd: number
  description: string
  serviceSlugs: string[]
  variantSlugs: string[]
  minQuantity: number
  maxQuantity: number
  defaultQuantity: number
  isVisible: boolean
  isRecommended: boolean
  requiresReview: boolean
  allowQuantity: boolean
  allowNotes: boolean
  sortOrder: number
}

export interface RecordingAddonGroup {
  category: RecordingAddonCategory
  title: string
  description: string
  addons: RecordingAddonDefinition[]
}

export interface RecordingAddonVisualLine {
  addon: RecordingAddonDefinition
  formulaLabel: string
  lineTotalUsd: number
  noteLabel: string | null
}

const RECORDING_ADDONS: RecordingAddonDefinition[] = [
  {
    id: 'recording-addon-percusion-salsa-combo',
    slug: 'combo-grabacion-percusion-salsa',
    publicName: 'Combo grabacion percusion para salsa',
    category: 'percussion_salsa',
    unit: 'tema',
    priceUsd: 150,
    description: 'Ideal para un tema que requiere base de percusion completa para salsa.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: true,
    requiresReview: false,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 10,
  },
  {
    id: 'recording-addon-instrumentos-adicionales',
    slug: 'grabacion-instrumentos-adicionales',
    publicName: 'Grabacion instrumentos adicionales',
    category: 'individual_instruments',
    unit: 'tema',
    priceUsd: 20,
    description: 'Opcion base para sumar instrumentos extra sin definir una familia puntual.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: true,
    requiresReview: true,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 20,
  },
  {
    id: 'recording-addon-piano',
    slug: 'grabacion-piano',
    publicName: 'Grabacion de piano',
    category: 'individual_instruments',
    unit: 'tema',
    priceUsd: 50,
    description: 'Grabacion de piano para un tema dentro de la sesion activa.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: true,
    requiresReview: false,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 30,
  },
  {
    id: 'recording-addon-bajo',
    slug: 'grabacion-bajo',
    publicName: 'Grabacion de bajo',
    category: 'individual_instruments',
    unit: 'tema',
    priceUsd: 50,
    description: 'Captura de bajo para un tema con enfoque directo de grabacion.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: false,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 40,
  },
  {
    id: 'recording-addon-trombones',
    slug: 'grabacion-trombones',
    publicName: 'Grabacion de trombones',
    category: 'brass',
    unit: 'unidad',
    priceUsd: 50,
    description: 'Grabacion por instrumento para secciones de metales.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: true,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 50,
  },
  {
    id: 'recording-addon-trompetas',
    slug: 'grabacion-trompetas',
    publicName: 'Grabacion de trompetas',
    category: 'brass',
    unit: 'unidad',
    priceUsd: 50,
    description: 'Grabacion por instrumento para arreglos con trompetas.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: true,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 60,
  },
  {
    id: 'recording-addon-saxo',
    slug: 'grabacion-saxo',
    publicName: 'Grabacion de saxo',
    category: 'individual_instruments',
    unit: 'tema',
    priceUsd: 50,
    description: 'Grabacion de saxo para un tema dentro de la sesion.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: false,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 70,
  },
  {
    id: 'recording-addon-cuerdas-sesion',
    slug: 'grabacion-cuerdas-sesion',
    publicName: 'Grabacion de cuerdas sesion',
    category: 'strings',
    unit: 'sesion',
    priceUsd: 300,
    description: 'Bloque de grabacion para sesion de cuerdas completa.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: true,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 80,
  },
  {
    id: 'recording-addon-cuerdas-por-instrumento',
    slug: 'grabacion-cuerdas-por-instrumento',
    publicName: 'Grabacion de cuerdas por instrumento',
    category: 'strings',
    unit: 'tema',
    priceUsd: 50,
    description: 'Opcion por instrumento para distribuir la grabacion de cuerdas por capa.',
    serviceSlugs: ['grabacion'],
    variantSlugs: ['grabacion-ensayo', 'grabacion-hora-estudio'],
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    isVisible: true,
    isRecommended: false,
    requiresReview: true,
    allowQuantity: false,
    allowNotes: true,
    sortOrder: 90,
  },
]

const RECORDING_ADDON_FAMILY_META: Record<
  RecordingAddonCategory,
  { title: string; description: string }
> = {
  percussion_salsa: {
    title: 'Percusion / Salsa',
    description: 'Opciones para base ritmica, capas de percusion y apoyo latino.',
  },
  individual_instruments: {
    title: 'Instrumentos individuales',
    description: 'Capa puntual para un instrumento o aporte adicional por tema.',
  },
  brass: {
    title: 'Metales',
    description: 'Seccion de metales con enfoque por instrumento.',
  },
  strings: {
    title: 'Cuerdas',
    description: 'Sesion completa o por instrumento para arreglos de cuerdas.',
  },
}

export function getRecordingAddonFamilyLabel(category: RecordingAddonCategory): string {
  return RECORDING_ADDON_FAMILY_META[category].title
}

export function getRecordingAddonFamilyDescription(category: RecordingAddonCategory): string {
  return RECORDING_ADDON_FAMILY_META[category].description
}

export function getRecordingAddonUnitLabel(unit: RecordingAddonUnit): string {
  if (unit === 'tema') return 'Por tema'
  if (unit === 'unidad') return 'Por unidad'
  return 'Por sesion'
}

function clampRecordingAddonTopicCount(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(10, Math.max(1, Math.trunc(value)))
}

export function getRecordingAddonVisualTopicLabel(topicCount: number): string {
  const safeTopicCount = clampRecordingAddonTopicCount(topicCount)
  return `${safeTopicCount} ${safeTopicCount === 1 ? 'tema' : 'temas'}`
}

export function getRecordingAddonVisualLine(
  addon: RecordingAddonDefinition,
  topicCount: number,
): RecordingAddonVisualLine {
  const safeTopicCount = clampRecordingAddonTopicCount(topicCount)

  if (addon.unit === 'sesion') {
    return {
      addon,
      formulaLabel: `${addon.priceUsd} USD / sesión = ${addon.priceUsd} USD`,
      lineTotalUsd: addon.priceUsd,
      noteLabel: addon.requiresReview ? 'Sujeto a revisión operativa' : null,
    }
  }

  const lineTotalUsd = addon.priceUsd * safeTopicCount
  const topicLabel = getRecordingAddonVisualTopicLabel(safeTopicCount)

  return {
    addon,
    formulaLabel: `${addon.priceUsd} USD × ${topicLabel} = ${lineTotalUsd} USD`,
    lineTotalUsd,
    noteLabel: addon.requiresReview ? 'Sujeto a revisión operativa' : null,
  }
}

export function getSelectedRecordingAddonVisualLines(
  selectedSlugs: string[],
  serviceSlug: string | null | undefined,
  variantSlug: string | null | undefined = null,
  topicCount: number,
): RecordingAddonVisualLine[] {
  return getSelectedRecordingAddons(selectedSlugs, serviceSlug, variantSlug).map((addon) =>
    getRecordingAddonVisualLine(addon, topicCount),
  )
}

export function getSelectedRecordingAddonVisualTotalUsd(
  selectedSlugs: string[],
  serviceSlug: string | null | undefined,
  variantSlug: string | null | undefined = null,
  topicCount: number,
): number {
  return getSelectedRecordingAddonVisualLines(selectedSlugs, serviceSlug, variantSlug, topicCount).reduce(
    (total, line) => total + line.lineTotalUsd,
    0,
  )
}

export function getRecordingAddonsForService(
  serviceSlug: string | null | undefined,
  variantSlug: string | null | undefined = null,
): RecordingAddonDefinition[] {
  if (!serviceSlug) return []

  return RECORDING_ADDONS.filter((addon) => {
    if (!addon.isVisible) return false
    if (!addon.serviceSlugs.includes(serviceSlug)) return false
    if (variantSlug && addon.variantSlugs.length > 0 && !addon.variantSlugs.includes(variantSlug)) {
      return false
    }
    return true
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getRecordingAddonBySlug(
  slug: string,
): RecordingAddonDefinition | null {
  return RECORDING_ADDONS.find((addon) => addon.slug === slug) ?? null
}

export function getSelectedRecordingAddons(
  selectedSlugs: string[],
  serviceSlug: string | null | undefined,
  variantSlug: string | null | undefined = null,
): RecordingAddonDefinition[] {
  const available = getRecordingAddonsForService(serviceSlug, variantSlug)
  const availableBySlug = new Map(available.map((addon) => [addon.slug, addon]))

  return selectedSlugs
    .map((slug) => availableBySlug.get(slug))
    .filter((addon): addon is RecordingAddonDefinition => Boolean(addon))
}

export function getSelectedRecordingAddonTotalUsd(
  selectedSlugs: string[],
  serviceSlug: string | null | undefined,
  variantSlug: string | null | undefined = null,
): number {
  return getSelectedRecordingAddons(selectedSlugs, serviceSlug, variantSlug).reduce(
    (total, addon) => total + addon.priceUsd,
    0,
  )
}

export function groupRecordingAddons(
  addons: RecordingAddonDefinition[],
): RecordingAddonGroup[] {
  const groups: RecordingAddonGroup[] = []

  for (const category of [
    'percussion_salsa',
    'individual_instruments',
    'brass',
    'strings',
  ] as const) {
    const familyAddons = addons.filter((addon) => addon.category === category)
    if (familyAddons.length === 0) continue

    groups.push({
      category,
      title: getRecordingAddonFamilyLabel(category),
      description: getRecordingAddonFamilyDescription(category),
      addons: familyAddons,
    })
  }

  return groups
}

export function getRecommendedRecordingAddons(
  addons: RecordingAddonDefinition[],
): RecordingAddonDefinition[] {
  return addons.filter((addon) => addon.isRecommended).sort((a, b) => a.sortOrder - b.sortOrder)
}
