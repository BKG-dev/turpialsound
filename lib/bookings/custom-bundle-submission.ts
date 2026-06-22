import { getCustomBundleItemBySlug } from '@/lib/bookings/custom-bundle'

export const CUSTOM_BUNDLE_SUBMISSION_CONTRACT_VERSION = 1 as const

export const CUSTOM_BUNDLE_SELECTABLE_ITEM_SLUGS = [
  'sala-flexible',
  'sala-premium',
  'sala-prioritaria',
  'grabacion-ensayo',
  'grabacion-estudio',
  'mezcla',
  'master',
  'podcast',
  'locucion',
  'studio-session',
  'arreglo-musical',
  'consultoria-produccion',
  'combo-percusion',
  'instrumentos-adicionales',
  'grabacion-piano',
  'grabacion-bajo',
  'grabacion-trombones',
  'grabacion-trompetas',
  'grabacion-saxo',
  'cuerdas-sesion-completa',
  'cuerdas-por-instrumento',
  'grabaciones-voces',
] as const

export type CustomBundleSelectableItemSlug =
  (typeof CUSTOM_BUNDLE_SELECTABLE_ITEM_SLUGS)[number]

export const CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS = [
  'tecnico-sonido',
  'backline-equipamiento',
] as const

export type CustomBundleServerIncludedItemSlug =
  (typeof CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS)[number]

export interface CustomBundleServiceVariantPersistenceTarget {
  kind: 'service_variant'
  serviceSlug: string
  variantSlug: string
}

export interface CustomBundleCatalogGapPersistenceTarget {
  kind: 'catalog_gap'
  reason: 'missing_service_variant'
}

export type CustomBundlePersistenceTarget =
  | CustomBundleServiceVariantPersistenceTarget
  | CustomBundleCatalogGapPersistenceTarget

export interface CustomBundleSubmissionCatalogGap {
  itemSlug: CustomBundleCatalogGapItemSlug
  target: CustomBundleCatalogGapPersistenceTarget
}

export interface CustomBundleSubmissionItemInputV1 {
  itemSlug: string
  quantity: number
  sessionDurationMinutes: number | null
}

export interface CustomBundleSubmissionRequesterInputV1 {
  name: string
  email: string
  phone: string
  whatsappConsentAccepted: boolean
}

export interface CustomBundleSubmissionInputV1 {
  contractVersion: typeof CUSTOM_BUNDLE_SUBMISSION_CONTRACT_VERSION
  bookingMode: 'custom_bundle'
  eventDate: string
  startTime: string
  items: CustomBundleSubmissionItemInputV1[]
  extrasNotes: string
  requester: CustomBundleSubmissionRequesterInputV1
}

export interface CustomBundleSubmissionContractIssue {
  code: string
  path: Array<string | number>
  message: string
}

export type CustomBundleSubmissionParseResult =
  | {
      ok: true
      value: CustomBundleSubmissionInputV1
    }
  | {
      ok: false
      issues: CustomBundleSubmissionContractIssue[]
    }

export type CustomBundleCatalogGapItemSlug =
  | 'combo-percusion'
  | 'instrumentos-adicionales'
  | 'grabacion-piano'
  | 'grabacion-bajo'
  | 'grabacion-trombones'
  | 'grabacion-trompetas'
  | 'grabacion-saxo'
  | 'cuerdas-sesion-completa'
  | 'cuerdas-por-instrumento'
  | 'grabaciones-voces'

const CUSTOM_BUNDLE_ALLOWED_ROOT_FIELDS = new Set([
  'contractVersion',
  'bookingMode',
  'eventDate',
  'startTime',
  'items',
  'extrasNotes',
  'requester',
])

const CUSTOM_BUNDLE_ALLOWED_REQUESTER_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'whatsappConsentAccepted',
])

const CUSTOM_BUNDLE_ALLOWED_ITEM_FIELDS = new Set([
  'itemSlug',
  'quantity',
  'sessionDurationMinutes',
])

const CUSTOM_BUNDLE_FORBIDDEN_MONEY_FIELDS = new Set([
  'unitPriceUsd',
  'lineTotalUsd',
  'subtotalUsd',
  'additionalSubtotalUsd',
  'estimatedTotalUsd',
  'price',
  'total',
  'adjustments',
  'currency',
])

const CUSTOM_BUNDLE_SELECTABLE_ITEM_ORDER = new Map(
  CUSTOM_BUNDLE_SELECTABLE_ITEM_SLUGS.map((slug, index) => [slug, index] as const),
)

export const CUSTOM_BUNDLE_PERSISTENCE_TARGETS = {
  'sala-flexible': {
    kind: 'service_variant',
    serviceSlug: 'sala-ensayo',
    variantSlug: 'sala-ensayo-flexible',
  },
  'sala-premium': {
    kind: 'service_variant',
    serviceSlug: 'sala-ensayo',
    variantSlug: 'sala-ensayo-premium',
  },
  'sala-prioritaria': {
    kind: 'service_variant',
    serviceSlug: 'sala-ensayo',
    variantSlug: 'sala-ensayo-prioritaria',
  },
  'grabacion-ensayo': {
    kind: 'service_variant',
    serviceSlug: 'grabacion',
    variantSlug: 'grabacion-ensayo',
  },
  'grabacion-estudio': {
    kind: 'service_variant',
    serviceSlug: 'grabacion',
    variantSlug: 'grabacion-hora-estudio',
  },
  mezcla: {
    kind: 'service_variant',
    serviceSlug: 'mezcla-masterizacion',
    variantSlug: 'mezcla-por-tema',
  },
  master: {
    kind: 'service_variant',
    serviceSlug: 'mezcla-masterizacion',
    variantSlug: 'master-por-tema',
  },
  podcast: {
    kind: 'service_variant',
    serviceSlug: 'podcast-locucion',
    variantSlug: 'podcast-por-episodio',
  },
  locucion: {
    kind: 'service_variant',
    serviceSlug: 'podcast-locucion',
    variantSlug: 'locucion-por-hora',
  },
  'studio-session': {
    kind: 'service_variant',
    serviceSlug: 'video-session',
    variantSlug: 'studio-session-fija',
  },
  'arreglo-musical': {
    kind: 'service_variant',
    serviceSlug: 'arreglos-musicales',
    variantSlug: 'arreglos-musicales-por-tema',
  },
  'consultoria-produccion': {
    kind: 'service_variant',
    serviceSlug: 'consultoria',
    variantSlug: 'consultoria-produccion',
  },
  'combo-percusion': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'instrumentos-adicionales': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabacion-piano': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabacion-bajo': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabacion-trombones': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabacion-trompetas': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabacion-saxo': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'cuerdas-sesion-completa': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'cuerdas-por-instrumento': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
  'grabaciones-voces': {
    kind: 'catalog_gap',
    reason: 'missing_service_variant',
  },
} as const satisfies Record<CustomBundleSelectableItemSlug, CustomBundlePersistenceTarget>

const CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUG_SET = new Set<string>(
  CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS,
)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function makeIssue(
  code: string,
  path: Array<string | number>,
  message: string,
): CustomBundleSubmissionContractIssue {
  return { code, path, message }
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day))

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  )
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizePhoneInput(value: string): string {
  return value.trim().replace(/[\s().-]+/g, '')
}

function collectUnknownAndForbiddenFieldIssues(
  record: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
  pathPrefix: Array<string | number>,
): CustomBundleSubmissionContractIssue[] {
  const issues: CustomBundleSubmissionContractIssue[] = []

  for (const key of Object.keys(record).sort()) {
    if (allowedFields.has(key)) continue

    if (CUSTOM_BUNDLE_FORBIDDEN_MONEY_FIELDS.has(key)) {
      issues.push(
        makeIssue(
          'CLIENT_MONEY_FIELD_FORBIDDEN',
          [...pathPrefix, key],
          `El campo ${key} no puede venir del cliente.`,
        ),
      )
      continue
    }

    issues.push(
      makeIssue('UNKNOWN_FIELD', [...pathPrefix, key], `Campo desconocido: ${key}.`),
    )
  }

  return issues
}

function validateRequesterInput(
  value: unknown,
  issues: CustomBundleSubmissionContractIssue[],
): CustomBundleSubmissionRequesterInputV1 | null {
  if (!isPlainObject(value)) {
    issues.push(
      makeIssue(
        'INVALID_OBJECT',
        ['requester'],
        'requester debe ser un objeto plano.',
      ),
    )
    return null
  }

  issues.push(
    ...collectUnknownAndForbiddenFieldIssues(value, CUSTOM_BUNDLE_ALLOWED_REQUESTER_FIELDS, [
      'requester',
    ]),
  )

  const nameValue = value.name
  const emailValue = value.email
  const phoneValue = value.phone
  const consentValue = value.whatsappConsentAccepted

  if (typeof nameValue !== 'string' || nameValue.trim().length === 0) {
    issues.push(
      makeIssue('INVALID_STRING', ['requester', 'name'], 'name es obligatorio.'),
    )
  }

  if (
    typeof emailValue !== 'string' ||
    emailValue.trim().length === 0 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())
  ) {
    issues.push(
      makeIssue('INVALID_EMAIL', ['requester', 'email'], 'email no tiene un formato válido.'),
    )
  }

  if (typeof phoneValue !== 'string' || phoneValue.trim().length === 0) {
    issues.push(
      makeIssue('INVALID_STRING', ['requester', 'phone'], 'phone es obligatorio.'),
    )
  }

  if (consentValue !== true) {
    issues.push(
      makeIssue(
        'WHATSAPP_CONSENT_REQUIRED',
        ['requester', 'whatsappConsentAccepted'],
        'whatsappConsentAccepted debe ser true.',
      ),
    )
  }

  if (issues.length > 0) {
    return null
  }

  const normalizedName = nameValue as string
  const normalizedEmail = emailValue as string
  const normalizedPhoneValue = phoneValue as string
  const normalizedPhone = normalizePhoneInput(normalizedPhoneValue)
  if (!/^\+?[0-9]+$/.test(normalizedPhone)) {
    issues.push(
      makeIssue(
        'INVALID_STRING',
        ['requester', 'phone'],
        'phone sólo puede contener dígitos y un prefijo + opcional.',
      ),
    )
    return null
  }

  return {
    name: normalizedName.trim(),
    email: normalizedEmail.trim().toLowerCase(),
    phone: normalizedPhone,
    whatsappConsentAccepted: true,
  }
}

function validateSubmissionItem(
  value: unknown,
  index: number,
  issues: CustomBundleSubmissionContractIssue[],
  seenItemSlugs: Set<string>,
): CustomBundleSubmissionItemInputV1 | null {
  if (!isPlainObject(value)) {
    issues.push(
      makeIssue('INVALID_OBJECT', ['items', index], 'Cada item debe ser un objeto plano.'),
    )
    return null
  }

  issues.push(
    ...collectUnknownAndForbiddenFieldIssues(value, CUSTOM_BUNDLE_ALLOWED_ITEM_FIELDS, [
      'items',
      index,
    ]),
  )

  const itemSlugValue = value.itemSlug
  const quantityValue = value.quantity
  const sessionDurationValue = value.sessionDurationMinutes

  if (typeof itemSlugValue !== 'string' || itemSlugValue.trim().length === 0) {
    issues.push(
      makeIssue('INVALID_STRING', ['items', index, 'itemSlug'], 'itemSlug es obligatorio.'),
    )
    return null
  }

  const itemSlug = itemSlugValue
  const catalogItem = getCustomBundleItemBySlug(itemSlug)
  if (!catalogItem) {
    issues.push(
      makeIssue('ITEM_NOT_FOUND', ['items', index, 'itemSlug'], `itemSlug desconocido: ${itemSlug}.`),
    )
    return null
  }

  if (!catalogItem.active) {
    issues.push(
      makeIssue('ITEM_INACTIVE', ['items', index, 'itemSlug'], `itemSlug inactivo: ${itemSlug}.`),
    )
    return null
  }

  if (seenItemSlugs.has(itemSlug)) {
    issues.push(
      makeIssue(
        'DUPLICATE_ITEM_SLUG',
        ['items', index, 'itemSlug'],
        `itemSlug duplicado: ${itemSlug}.`,
      ),
    )
    return null
  }

  if (!isFiniteInteger(quantityValue)) {
    issues.push(
      makeIssue(
        'INVALID_QUANTITY',
        ['items', index, 'quantity'],
        'quantity debe ser un entero.',
      ),
    )
    return null
  }

  if (quantityValue < catalogItem.minimumQuantity) {
    issues.push(
      makeIssue(
        'QUANTITY_BELOW_MINIMUM',
        ['items', index, 'quantity'],
        `quantity debe ser al menos ${catalogItem.minimumQuantity}.`,
      ),
    )
  }

  if (catalogItem.maximumQuantity !== null && quantityValue > catalogItem.maximumQuantity) {
    issues.push(
      makeIssue(
        'QUANTITY_ABOVE_MAXIMUM',
        ['items', index, 'quantity'],
        `quantity no puede superar ${catalogItem.maximumQuantity}.`,
      ),
    )
  }

  if (catalogItem.quantityStep > 1) {
    const alignedQuantity = quantityValue - catalogItem.minimumQuantity
    if (alignedQuantity % catalogItem.quantityStep !== 0) {
      issues.push(
        makeIssue(
          'QUANTITY_STEP_INVALID',
          ['items', index, 'quantity'],
          `quantity debe avanzar en pasos de ${catalogItem.quantityStep}.`,
        ),
      )
    }
  }

  if (catalogItem.included || CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUG_SET.has(itemSlug)) {
    issues.push(
      makeIssue(
        'ITEM_NOT_ALLOWED',
        ['items', index, 'itemSlug'],
        `itemSlug no puede ser enviado por el cliente: ${itemSlug}.`,
      ),
    )
    return null
  }

  let normalizedSessionDurationMinutes: number | null = null

  if (catalogItem.requiresSessionDuration) {
    if (sessionDurationValue === null || sessionDurationValue === undefined) {
      issues.push(
        makeIssue(
          'SESSION_DURATION_REQUIRED',
          ['items', index, 'sessionDurationMinutes'],
          'sessionDurationMinutes es obligatorio para este item.',
        ),
      )
    } else if (!isFiniteInteger(sessionDurationValue) || sessionDurationValue <= 0) {
      issues.push(
        makeIssue(
          'INVALID_SESSION_DURATION',
          ['items', index, 'sessionDurationMinutes'],
          'sessionDurationMinutes debe ser un entero positivo.',
        ),
      )
    } else {
      if (
        catalogItem.minimumSessionMinutes !== null &&
        sessionDurationValue < catalogItem.minimumSessionMinutes
      ) {
        issues.push(
          makeIssue(
            'SESSION_DURATION_BELOW_MINIMUM',
            ['items', index, 'sessionDurationMinutes'],
            `sessionDurationMinutes debe ser al menos ${catalogItem.minimumSessionMinutes}.`,
          ),
        )
      }

      if (
        catalogItem.maximumSessionMinutes !== null &&
        sessionDurationValue > catalogItem.maximumSessionMinutes
      ) {
        issues.push(
          makeIssue(
            'SESSION_DURATION_ABOVE_MAXIMUM',
            ['items', index, 'sessionDurationMinutes'],
            `sessionDurationMinutes no puede superar ${catalogItem.maximumSessionMinutes}.`,
          ),
        )
      }

      normalizedSessionDurationMinutes = sessionDurationValue
    }
  }

  if (issues.length > 0) {
    return null
  }

  seenItemSlugs.add(itemSlug)

  return {
    itemSlug,
    quantity: quantityValue,
    sessionDurationMinutes: normalizedSessionDurationMinutes,
  }
}

export function getCustomBundlePersistenceTarget(
  itemSlug: string,
): CustomBundlePersistenceTarget | null {
  if (!Object.prototype.hasOwnProperty.call(CUSTOM_BUNDLE_PERSISTENCE_TARGETS, itemSlug)) {
    return null
  }

  return CUSTOM_BUNDLE_PERSISTENCE_TARGETS[itemSlug as CustomBundleSelectableItemSlug]
}

export function getCustomBundleSubmissionCatalogGaps(
  items: ReadonlyArray<Pick<CustomBundleSubmissionItemInputV1, 'itemSlug'>>,
): CustomBundleSubmissionCatalogGap[] {
  const uniqueGaps = new Map<CustomBundleCatalogGapItemSlug, CustomBundleSubmissionCatalogGap>()

  for (const item of items) {
    const target = getCustomBundlePersistenceTarget(item.itemSlug)
    if (!target || target.kind !== 'catalog_gap') continue
    const itemSlug = item.itemSlug as CustomBundleCatalogGapItemSlug
    uniqueGaps.set(itemSlug, { itemSlug, target })
  }

  return [...uniqueGaps.values()].sort((left, right) => {
    const leftOrder = CUSTOM_BUNDLE_SELECTABLE_ITEM_ORDER.get(left.itemSlug) ?? Number.MAX_SAFE_INTEGER
    const rightOrder =
      CUSTOM_BUNDLE_SELECTABLE_ITEM_ORDER.get(right.itemSlug) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

export function hasCustomBundleSubmissionCatalogGaps(
  items: ReadonlyArray<Pick<CustomBundleSubmissionItemInputV1, 'itemSlug'>>,
): boolean {
  return getCustomBundleSubmissionCatalogGaps(items).length > 0
}

export function getCustomBundleServerIncludedItemSlugs(): readonly [
  CustomBundleServerIncludedItemSlug,
  CustomBundleServerIncludedItemSlug,
] {
  return CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS
}

export function parseCustomBundleSubmissionInput(
  input: unknown,
): CustomBundleSubmissionParseResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        makeIssue('INVALID_OBJECT', [], 'El payload debe ser un objeto plano.'),
      ],
    }
  }

  const issues: CustomBundleSubmissionContractIssue[] = []
  const root = input as Record<string, unknown>
  const eventDate = root.eventDate as string
  const startTime = root.startTime as string
  const extrasNotes = root.extrasNotes as string

  issues.push(...collectUnknownAndForbiddenFieldIssues(root, CUSTOM_BUNDLE_ALLOWED_ROOT_FIELDS, []))

  if (root.contractVersion !== CUSTOM_BUNDLE_SUBMISSION_CONTRACT_VERSION) {
    issues.push(
      makeIssue(
        'INVALID_CONTRACT_VERSION',
        ['contractVersion'],
        'contractVersion debe ser exactamente 1.',
      ),
    )
  }

  if (root.bookingMode !== 'custom_bundle') {
    issues.push(
      makeIssue('INVALID_BOOKING_MODE', ['bookingMode'], 'bookingMode debe ser custom_bundle.'),
    )
  }

  if (typeof root.eventDate !== 'string' || !isValidIsoDate(eventDate)) {
    issues.push(
      makeIssue('INVALID_DATE_FORMAT', ['eventDate'], 'eventDate debe tener formato YYYY-MM-DD.'),
    )
  }

  if (typeof root.startTime !== 'string' || !isValidTime(startTime)) {
    issues.push(
      makeIssue('INVALID_TIME_FORMAT', ['startTime'], 'startTime debe tener formato HH:mm.'),
    )
  }

  if (typeof root.extrasNotes !== 'string') {
    issues.push(
      makeIssue('INVALID_STRING', ['extrasNotes'], 'extrasNotes debe ser una cadena de texto.'),
    )
  }

  const requester = validateRequesterInput(root.requester, issues)

  if (!Array.isArray(root.items) || root.items.length === 0) {
    issues.push(
      makeIssue('INVALID_ITEMS', ['items'], 'items debe ser un arreglo no vacío.'),
    )
  }

  const normalizedItems: CustomBundleSubmissionItemInputV1[] = []
  if (Array.isArray(root.items) && root.items.length > 0) {
    const seenItemSlugs = new Set<string>()
    for (let index = 0; index < root.items.length; index += 1) {
      const normalizedItem = validateSubmissionItem(root.items[index], index, issues, seenItemSlugs)
      if (normalizedItem) {
        normalizedItems.push(normalizedItem)
      }
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return {
    ok: true,
    value: {
      contractVersion: CUSTOM_BUNDLE_SUBMISSION_CONTRACT_VERSION,
      bookingMode: 'custom_bundle',
      eventDate,
      startTime,
      items: normalizedItems,
      extrasNotes: extrasNotes.trim(),
      requester: requester as CustomBundleSubmissionRequesterInputV1,
    },
  }
}
