import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CATALOG_VARIANTS } from '@/lib/bookings/catalog'
import { getCustomBundleItemBySlug } from '@/lib/bookings/custom-bundle'
import {
  CUSTOM_BUNDLE_PERSISTENCE_TARGETS,
  CUSTOM_BUNDLE_SELECTABLE_ITEM_SLUGS,
  CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS,
  getCustomBundlePersistenceTarget,
  getCustomBundleServerIncludedItemSlugs,
  getCustomBundleSubmissionCatalogGaps,
  hasCustomBundleSubmissionCatalogGaps,
  parseCustomBundleSubmissionInput,
  type CustomBundleCatalogGapPersistenceTarget,
  type CustomBundleServiceVariantPersistenceTarget,
  type CustomBundleSubmissionContractIssue,
  type CustomBundleSubmissionParseResult,
} from '@/lib/bookings/custom-bundle-submission'

const FORBIDDEN_MONEY_FIELDS = [
  'unitPriceUsd',
  'lineTotalUsd',
  'subtotalUsd',
  'additionalSubtotalUsd',
  'estimatedTotalUsd',
  'price',
  'total',
  'adjustments',
  'currency',
] as const

const submissionSourcePath = resolve(
  process.cwd(),
  'lib/bookings/custom-bundle-submission.ts',
)

const submissionSource = readFileSync(submissionSourcePath, 'utf8')

function assertNoForbiddenSourcePattern(pattern: RegExp, label: string): void {
  assert.equal(pattern.test(submissionSource), false, label)
}

function createBasePayload() {
  return {
    contractVersion: 1 as const,
    bookingMode: 'custom_bundle' as const,
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observaciones del cliente  ',
    requester: {
      name: '  Ana Pérez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412 123 4567',
      whatsappConsentAccepted: true,
    },
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 2,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'combo-percusion',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabaciones-voces',
        quantity: 2,
        sessionDurationMinutes: null,
      },
    ],
  }
}

function assertParseFailure(
  payload: unknown,
  expectedCodes: string[],
  label: string,
): Extract<CustomBundleSubmissionParseResult, { ok: false }> {
  const result = parseCustomBundleSubmissionInput(payload)
  assert.equal(result.ok, false, label)
  if (result.ok) {
    throw new Error(label)
  }

  for (const code of expectedCodes) {
    assert.ok(
      result.issues.some((issue) => issue.code === code),
      `${label}: expected code ${code}`,
    )
  }

  return result
}

function assertIssuePath(
  issues: CustomBundleSubmissionContractIssue[],
  code: string,
  path: Array<string | number>,
  label: string,
): void {
  const issue = issues.find((entry) => entry.code === code)
  assert.ok(issue, `${label}: missing issue code ${code}`)
  assert.deepStrictEqual(issue?.path, path, `${label}: path mismatch for ${code}`)
}

function assertNoForbiddenMoneyFieldsDeep(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoForbiddenMoneyFieldsDeep(entry)
    }
    return
  }

  if (value === null || typeof value !== 'object') {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.ok(
      !FORBIDDEN_MONEY_FIELDS.includes(key as (typeof FORBIDDEN_MONEY_FIELDS)[number]),
      `Forbidden money field leaked into parsed value: ${key}`,
    )
    assertNoForbiddenMoneyFieldsDeep(nestedValue)
  }
}

function main(): void {
  assertNoForbiddenSourcePattern(
    /buildCustomBundleEstimate\s*\(/,
    'parse module must not call buildCustomBundleEstimate',
  )
  assertNoForbiddenSourcePattern(/process\.env/, 'parse module must not read process.env')
  assertNoForbiddenSourcePattern(/from\s+['"]@\/lib\/db['"]/, 'parse module must not import lib/db')
  assertNoForbiddenSourcePattern(/fetch\s*\(/, 'parse module must not call fetch')
  assertNoForbiddenSourcePattern(/from\s+['"]prisma['"]/, 'parse module must not import Prisma')

  const basePayload = createBasePayload()

  const validResult = parseCustomBundleSubmissionInput(basePayload)
  assert.equal(validResult.ok, true, 'valid payload should parse')
  if (!validResult.ok) {
    throw new Error('valid payload should parse')
  }

  assert.deepStrictEqual(validResult.value, {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: 'Observaciones del cliente',
    requester: {
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '+584121234567',
      whatsappConsentAccepted: true,
    },
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 2,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'combo-percusion',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabaciones-voces',
        quantity: 2,
        sessionDurationMinutes: null,
      },
    ],
  })

  assert.deepStrictEqual(
    getCustomBundleSubmissionCatalogGaps(validResult.value.items),
    [
      {
        itemSlug: 'combo-percusion',
        target: CUSTOM_BUNDLE_PERSISTENCE_TARGETS['combo-percusion'],
      },
      {
        itemSlug: 'grabaciones-voces',
        target: CUSTOM_BUNDLE_PERSISTENCE_TARGETS['grabaciones-voces'],
      },
    ],
  )
  assert.equal(hasCustomBundleSubmissionCatalogGaps(validResult.value.items), true)
  assertNoForbiddenMoneyFieldsDeep(validResult.value)

  const serviceOnlyPayload = {
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabacion-estudio',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'mezcla',
        quantity: 1,
        sessionDurationMinutes: null,
      },
    ],
  }

  const serviceOnlyResult = parseCustomBundleSubmissionInput(serviceOnlyPayload)
  assert.equal(serviceOnlyResult.ok, true, 'service-only payload should parse')
  if (!serviceOnlyResult.ok) {
    throw new Error('service-only payload should parse')
  }

  assert.equal(hasCustomBundleSubmissionCatalogGaps(serviceOnlyResult.value.items), false)
  assert.deepStrictEqual(getCustomBundleSubmissionCatalogGaps(serviceOnlyResult.value.items), [])

  const serviceTargets = {
    'sala-premium': {
      kind: 'service_variant',
      serviceSlug: 'sala-ensayo',
      variantSlug: 'sala-ensayo-premium',
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
  } as const

  for (const [slug, target] of Object.entries(serviceTargets)) {
    assert.deepStrictEqual(
      getCustomBundlePersistenceTarget(slug),
      target,
      `unexpected persistence target for ${slug}`,
    )
  }

  assertParseFailure(
    {
      ...createBasePayload(),
      estimatedTotalUsd: 1,
    },
    ['CLIENT_MONEY_FIELD_FORBIDDEN'],
    'root money field must be rejected',
  )

  assertParseFailure(
    {
      ...createBasePayload(),
      items: [
        {
          itemSlug: 'sala-premium',
          quantity: 1,
          sessionDurationMinutes: null,
          unitPriceUsd: 1,
        },
      ],
    },
    ['CLIENT_MONEY_FIELD_FORBIDDEN'],
    'item money field must be rejected',
  )

  assertParseFailure(
    {
      ...createBasePayload(),
      contractVersion: 2,
    },
    ['INVALID_CONTRACT_VERSION'],
    'contractVersion 2 must be rejected',
  )

  assertParseFailure(
    {
      ...createBasePayload(),
      bookingMode: 'single',
    },
    ['INVALID_BOOKING_MODE'],
    'bookingMode single must be rejected',
  )

  const invalidItemCases: Array<{
    label: string
    payload: unknown
    expectedCodes: string[]
    expectedPath?: Array<string | number>
  }> = [
    {
      label: 'empty items array',
      payload: {
        ...createBasePayload(),
        items: [],
      },
      expectedCodes: ['INVALID_ITEMS'],
      expectedPath: ['items'],
    },
    {
      label: 'unknown item slug',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'unknown-slug',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['ITEM_NOT_FOUND'],
      expectedPath: ['items', 0, 'itemSlug'],
    },
    {
      label: 'duplicate item slug',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: 1,
            sessionDurationMinutes: null,
          },
          {
            itemSlug: 'sala-premium',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['DUPLICATE_ITEM_SLUG'],
      expectedPath: ['items', 1, 'itemSlug'],
    },
    {
      label: 'quantity zero',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: 0,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['QUANTITY_BELOW_MINIMUM'],
      expectedPath: ['items', 0, 'quantity'],
    },
    {
      label: 'quantity negative',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: -1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['QUANTITY_BELOW_MINIMUM'],
      expectedPath: ['items', 0, 'quantity'],
    },
    {
      label: 'quantity decimal',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'sala-premium',
            quantity: 1.5,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['INVALID_QUANTITY'],
      expectedPath: ['items', 0, 'quantity'],
    },
    {
      label: 'quantity over maximum',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'tecnico-sonido',
            quantity: 2,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['QUANTITY_ABOVE_MAXIMUM', 'ITEM_NOT_ALLOWED'],
      expectedPath: ['items', 0, 'quantity'],
    },
    {
      label: 'sessionDuration decimal',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'podcast',
            quantity: 1,
            sessionDurationMinutes: 90.5,
          },
        ],
      },
      expectedCodes: ['INVALID_SESSION_DURATION'],
      expectedPath: ['items', 0, 'sessionDurationMinutes'],
    },
    {
      label: 'Podcast without duration',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'podcast',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['SESSION_DURATION_REQUIRED'],
      expectedPath: ['items', 0, 'sessionDurationMinutes'],
    },
    {
      label: 'Podcast over 240 minutes',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'podcast',
            quantity: 1,
            sessionDurationMinutes: 300,
          },
        ],
      },
      expectedCodes: ['SESSION_DURATION_ABOVE_MAXIMUM'],
      expectedPath: ['items', 0, 'sessionDurationMinutes'],
    },
    {
      label: 'Studio Session over 240 minutes',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'studio-session',
            quantity: 1,
            sessionDurationMinutes: 300,
          },
        ],
      },
      expectedCodes: ['SESSION_DURATION_ABOVE_MAXIMUM'],
      expectedPath: ['items', 0, 'sessionDurationMinutes'],
    },
    {
      label: 'Tecnico enviado por cliente',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'tecnico-sonido',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['ITEM_NOT_ALLOWED'],
      expectedPath: ['items', 0, 'itemSlug'],
    },
    {
      label: 'Backline enviado por cliente',
      payload: {
        ...createBasePayload(),
        items: [
          {
            itemSlug: 'backline-equipamiento',
            quantity: 1,
            sessionDurationMinutes: null,
          },
        ],
      },
      expectedCodes: ['ITEM_NOT_ALLOWED'],
      expectedPath: ['items', 0, 'itemSlug'],
    },
  ]

  for (const testCase of invalidItemCases) {
    const result = assertParseFailure(
      testCase.payload,
      testCase.expectedCodes,
      testCase.label,
    )
    if (testCase.expectedPath) {
      assertIssuePath(result.issues, testCase.expectedCodes[0], testCase.expectedPath, testCase.label)
    }
  }

  assertParseFailure(
    {
      ...createBasePayload(),
      unexpectedRootField: true,
    },
    ['UNKNOWN_FIELD'],
    'unknown root key must be rejected',
  )

  assertParseFailure(
    {
      ...createBasePayload(),
      requester: {
        ...createBasePayload().requester,
        unexpectedRequesterField: true,
      },
    },
    ['UNKNOWN_FIELD'],
    'unknown requester key must be rejected',
  )

  assertParseFailure(
    {
      ...createBasePayload(),
      items: [
        {
          itemSlug: 'sala-premium',
          quantity: 1,
          sessionDurationMinutes: null,
          unexpectedItemField: true,
        },
      ],
    },
    ['UNKNOWN_FIELD'],
    'unknown item key must be rejected',
  )

  const allSelectableSlugs = [...CUSTOM_BUNDLE_SELECTABLE_ITEM_SLUGS]
  const persistenceTargetKeys = Object.keys(CUSTOM_BUNDLE_PERSISTENCE_TARGETS)

  assert.deepStrictEqual(
    [...persistenceTargetKeys].sort(),
    [...allSelectableSlugs].sort(),
    'persistence target keys must match the selectable catalog',
  )

  const persistenceTargets = Object.entries(CUSTOM_BUNDLE_PERSISTENCE_TARGETS) as Array<
    [string, CustomBundleServiceVariantPersistenceTarget | CustomBundleCatalogGapPersistenceTarget]
  >
  const serviceVariantTargets = persistenceTargets.filter(
    (entry) => entry[1].kind === 'service_variant',
  ) as Array<[string, CustomBundleServiceVariantPersistenceTarget]>
  const catalogGapTargets = persistenceTargets.filter(
    (entry) => entry[1].kind === 'catalog_gap',
  ) as Array<[string, CustomBundleCatalogGapPersistenceTarget]>

  assert.equal(serviceVariantTargets.length, 12, 'there must be 12 service_variant targets')
  assert.equal(catalogGapTargets.length, 10, 'there must be 10 catalog_gap targets')

  for (const [itemSlug, target] of serviceVariantTargets) {
    const catalogItem = getCustomBundleItemBySlug(itemSlug)
    assert.ok(catalogItem, `catalog item must exist for ${itemSlug}`)
    assert.equal(catalogItem?.active, true, `${itemSlug} must be active`)
    assert.equal(catalogItem?.included, false, `${itemSlug} must not be included`)

    const catalogVariant = CATALOG_VARIANTS.find((variant) => variant.slug === target.variantSlug)
    assert.ok(catalogVariant, `catalog variant must exist for ${target.variantSlug}`)
    assert.equal(
      catalogVariant?.serviceSlug,
      target.serviceSlug,
      `${target.variantSlug} must belong to ${target.serviceSlug}`,
    )
  }

  for (const [itemSlug, target] of catalogGapTargets) {
    const catalogItem = getCustomBundleItemBySlug(itemSlug)
    assert.ok(catalogItem, `catalog item must exist for ${itemSlug}`)
    assert.equal(catalogItem?.active, true, `${itemSlug} must be active`)
    assert.equal(target.reason, 'missing_service_variant')
  }

  assert.deepStrictEqual(
    getCustomBundleServerIncludedItemSlugs(),
    CUSTOM_BUNDLE_SERVER_INCLUDED_ITEM_SLUGS,
    'server included slugs must stay canonical',
  )

  for (const slug of getCustomBundleServerIncludedItemSlugs()) {
    assert.equal(
      getCustomBundlePersistenceTarget(slug),
      null,
      `${slug} must not be a client persistence target`,
    )

    const item = getCustomBundleItemBySlug(slug)
    assert.ok(item, `${slug} must exist in the catalog`)
    assert.equal(item?.included, true, `${slug} must remain server-derived`)
  }

  const serializedValid = JSON.parse(JSON.stringify(validResult.value)) as unknown
  assertNoForbiddenMoneyFieldsDeep(serializedValid)

  console.log('booking_custom_bundle_submission_contract OK')
}

main()
