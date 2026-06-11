export type ProductionMusicAddonUnit = 'theme' | 'unit'

export interface ProductionMusicAddonDefinition {
  id: string
  label: string
  unit: ProductionMusicAddonUnit
  internalPriceUsd: number
  quantityEnabled?: boolean
  category: 'keys' | 'rhythm' | 'brass' | 'strings' | 'vocals' | 'custom'
  description: string
}

export interface ProductionMusicAddonSelectionInput {
  addonId: string
  quantity?: number
}

export interface ProductionMusicAddonEstimateLine {
  addonId: string
  label: string
  quantity: number
  unit: ProductionMusicAddonUnit
  totalUsd: number
}

export interface ProductionMusicEstimate {
  themeCount: number
  includedHours: number
  baseTotalUsd: number
  addonsTotalUsd: number
  totalUsd: number
  selectedAddonIds: string[]
  selectedAddons: ProductionMusicAddonEstimateLine[]
  requiresManualReview: true
}

export interface CalculateProductionMusicEstimateInput {
  themeCount: number
  selectedAddons: ProductionMusicAddonSelectionInput[]
}

export const PRODUCTION_MUSIC_SERVICE_SLUG = 'produccion-musical'
export const PRODUCTION_MUSIC_VARIANT_SLUG = 'produccion-musical-por-tema'

export const PRODUCTION_MUSIC_BASE = {
  unit: 'theme',
  basePriceUsd: 1000,
  includedHoursPerTheme: 12,
  usesCalendar: false,
  requiresManualReview: true,
} as const

export const PRODUCTION_MUSIC_ADDONS: ProductionMusicAddonDefinition[] = [
  {
    id: 'piano',
    label: 'Grabacion de piano',
    unit: 'theme',
    internalPriceUsd: 80,
    category: 'keys',
    description: 'Pistas de piano adicionales dentro del alcance de cada tema.',
  },
  {
    id: 'bass',
    label: 'Grabacion de bajo',
    unit: 'theme',
    internalPriceUsd: 80,
    category: 'rhythm',
    description: 'Grabacion dedicada de bajo para cada tema seleccionado.',
  },
  {
    id: 'trombones',
    label: 'Grabacion de trombones',
    unit: 'unit',
    internalPriceUsd: 80,
    quantityEnabled: true,
    category: 'brass',
    description: 'Se calcula por cantidad de instrumentos requeridos.',
  },
  {
    id: 'trumpets',
    label: 'Grabacion de trompetas',
    unit: 'unit',
    internalPriceUsd: 80,
    quantityEnabled: true,
    category: 'brass',
    description: 'Se calcula por cantidad de instrumentos requeridos.',
  },
  {
    id: 'sax',
    label: 'Grabacion de saxo',
    unit: 'theme',
    internalPriceUsd: 80,
    category: 'brass',
    description: 'Capa de saxo por tema dentro del alcance de produccion.',
  },
  {
    id: 'strings_session',
    label: 'Grabacion de cuerdas, sesion completa',
    unit: 'theme',
    internalPriceUsd: 480,
    category: 'strings',
    description: 'Sesion integral de cuerdas incluida por tema.',
  },
  {
    id: 'strings_by_instrument',
    label: 'Grabacion de cuerdas por instrumento',
    unit: 'theme',
    internalPriceUsd: 80,
    quantityEnabled: true,
    category: 'strings',
    description: 'Multiplica por tema y por cantidad de instrumentos requeridos.',
  },
  {
    id: 'vocals',
    label: 'Grabaciones de voces',
    unit: 'theme',
    internalPriceUsd: 40,
    category: 'vocals',
    description: 'Capas o refuerzos vocales adicionales por tema.',
  },
  {
    id: 'other_instrument',
    label: 'Otro instrumento adicional',
    unit: 'theme',
    internalPriceUsd: 20,
    quantityEnabled: true,
    category: 'custom',
    description: 'Se revisa manualmente para cerrar el alcance final con el cliente.',
  },
]

export const PRODUCTION_MUSIC_ADDON_CATEGORY_META = {
  keys: {
    title: 'Teclas y armonia',
    description: 'Capas puntuales para reforzar el arreglo armonico.',
  },
  rhythm: {
    title: 'Base ritmica',
    description: 'Instrumentos que sostienen groove y estructura del tema.',
  },
  brass: {
    title: 'Metales',
    description: 'Refuerzos por instrumento para secciones de metales.',
  },
  strings: {
    title: 'Cuerdas',
    description: 'Sesion completa o capas por instrumento para arreglos mas amplios.',
  },
  vocals: {
    title: 'Voces',
    description: 'Capas vocales adicionales incluidas dentro del total estimado.',
  },
  custom: {
    title: 'Otros apoyos',
    description: 'Requerimientos no estandar que se validan por WhatsApp.',
  },
} as const

export function isProductionMusicService(serviceSlug: string | null | undefined): boolean {
  return serviceSlug === PRODUCTION_MUSIC_SERVICE_SLUG
}

export function isProductionMusicVariant(variantSlug: string | null | undefined): boolean {
  return variantSlug === PRODUCTION_MUSIC_VARIANT_SLUG
}

export function getProductionMusicAddonById(
  addonId: string,
): ProductionMusicAddonDefinition | null {
  return PRODUCTION_MUSIC_ADDONS.find((addon) => addon.id === addonId) ?? null
}

export function getProductionMusicAddonCategoryEntries() {
  return Object.entries(PRODUCTION_MUSIC_ADDON_CATEGORY_META).map(([category, meta]) => ({
    category: category as keyof typeof PRODUCTION_MUSIC_ADDON_CATEGORY_META,
    ...meta,
    addons: PRODUCTION_MUSIC_ADDONS.filter((addon) => addon.category === category),
  }))
}

export function normalizeProductionMusicAddonSelections(
  selectedAddons: ProductionMusicAddonSelectionInput[],
): ProductionMusicAddonSelectionInput[] {
  const normalized = new Map<string, ProductionMusicAddonSelectionInput>()

  for (const rawSelection of selectedAddons) {
    const addon = getProductionMusicAddonById(rawSelection.addonId)
    if (!addon) continue

    const safeQuantity = addon.quantityEnabled
      ? Math.max(1, Math.trunc(rawSelection.quantity ?? 1))
      : 1

    normalized.set(addon.id, {
      addonId: addon.id,
      quantity: safeQuantity,
    })
  }

  return Array.from(normalized.values())
}

export function calculateProductionMusicEstimate(
  input: CalculateProductionMusicEstimateInput,
): ProductionMusicEstimate {
  const themeCount = Math.max(1, Math.trunc(input.themeCount))
  const normalizedSelections = normalizeProductionMusicAddonSelections(input.selectedAddons)
  const selectedAddons: ProductionMusicAddonEstimateLine[] = normalizedSelections.flatMap((selection) => {
    const addon = getProductionMusicAddonById(selection.addonId)
    if (!addon) return []

    const quantity = addon.quantityEnabled ? Math.max(1, selection.quantity ?? 1) : 1
    const totalUsd =
      addon.unit === 'theme'
        ? addon.internalPriceUsd * quantity * themeCount
        : addon.internalPriceUsd * quantity

    return [
      {
        addonId: addon.id,
        label: addon.label,
        quantity,
        unit: addon.unit,
        totalUsd,
      },
    ]
  })

  const baseTotalUsd = themeCount * PRODUCTION_MUSIC_BASE.basePriceUsd
  const includedHours = themeCount * PRODUCTION_MUSIC_BASE.includedHoursPerTheme
  const addonsTotalUsd = selectedAddons.reduce((total, addon) => total + addon.totalUsd, 0)

  return {
    themeCount,
    includedHours,
    baseTotalUsd,
    addonsTotalUsd,
    totalUsd: baseTotalUsd + addonsTotalUsd,
    selectedAddonIds: selectedAddons.map((addon) => addon.addonId),
    selectedAddons,
    requiresManualReview: true,
  }
}

export function getProductionMusicAddonPublicSummary(
  estimate: ProductionMusicEstimate,
): string[] {
  return estimate.selectedAddons.map((selection) => {
    const suffix = selection.quantity > 1 ? ` x${selection.quantity}` : ''
    return `${selection.label}${suffix}`
  })
}
