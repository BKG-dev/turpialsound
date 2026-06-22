import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildCustomBundleEstimate } from '@/lib/bookings/custom-bundle'
import {
  CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
  buildCustomBundleAuthoritativeQuote,
  repriceCustomBundleSubmission,
} from '@/lib/bookings/custom-bundle-repricing'
import {
  parseCustomBundleSubmissionInput,
  type CustomBundleSubmissionInputV1,
} from '@/lib/bookings/custom-bundle-submission'
import type { CustomBundleSelection } from '@/lib/bookings/types'

const forbiddenMoneyFields = [
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

const moduleSourcePath = resolve(process.cwd(), 'lib/bookings/custom-bundle-repricing.ts')
const moduleSource = readFileSync(moduleSourcePath, 'utf8')

function selection(
  itemSlug: string,
  quantity = 1,
  sessionDurationMinutes: number | null = null,
): CustomBundleSelection {
  return { itemSlug, quantity, sessionDurationMinutes }
}

function createBasePayload() {
  return {
    contractVersion: 1 as const,
    bookingMode: 'custom_bundle' as const,
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observaciones del cliente  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
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

function sumAdjustments(
  estimate: ReturnType<typeof buildCustomBundleEstimate>,
): number {
  return estimate.adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)
}

function lineSlugs(estimate: ReturnType<typeof buildCustomBundleEstimate>): string[] {
  return estimate.lines.map((line) => line.item.slug)
}

function assertNoForbiddenSourcePattern(pattern: RegExp, label: string): void {
  assert.equal(pattern.test(moduleSource), false, label)
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
      !forbiddenMoneyFields.includes(key as (typeof forbiddenMoneyFields)[number]),
      `Forbidden money field leaked into result: ${key}`,
    )
    assertNoForbiddenMoneyFieldsDeep(nestedValue)
  }
}

function assertParseOk(
  payload: unknown,
): Extract<ReturnType<typeof parseCustomBundleSubmissionInput>, { ok: true }> {
  const result = parseCustomBundleSubmissionInput(payload)
  assert.equal(result.ok, true, 'payload should parse')
  if (!result.ok) {
    throw new Error('payload should parse')
  }

  return result
}

function assertRepricingContractFailure(payload: unknown, expectedCode: string): void {
  const result = repriceCustomBundleSubmission(payload)
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'contract')
  if (result.ok || result.stage !== 'contract') {
    throw new Error('expected contract failure')
  }

  assert.ok(
    result.contractIssues.some((issue) => issue.code === expectedCode),
    `expected contract issue ${expectedCode}`,
  )
}

function assertNoQuote(result: ReturnType<typeof repriceCustomBundleSubmission>): void {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'contract')
  if (result.ok || result.stage !== 'contract') {
    throw new Error('expected contract failure')
  }
  assert.ok(!('quote' in result), 'contract failures must not expose a quote')
}

function assertBusinessIssues(
  result: Extract<ReturnType<typeof repriceCustomBundleSubmission>, { ok: false; stage: 'business_rules' }>,
  expectedCode: string,
): void {
  assert.ok(
    result.businessIssues.some((issue) => issue.code === expectedCode),
    `expected business issue ${expectedCode}`,
  )
}

function assertQuoteLineSummary(
  quote: ReturnType<typeof buildCustomBundleAuthoritativeQuote>,
  expectedSlugs: string[],
): void {
  assert.deepStrictEqual(lineSlugs(quote.estimate), expectedSlugs)
}

function main(): void {
  assert.equal(CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE, 'server_catalog_v1')
  assertNoForbiddenSourcePattern(/from\s+['"]@\/lib\/db['"]/, 'module must not import lib/db')
  assertNoForbiddenSourcePattern(/process\.env/, 'module must not read process.env')
  assertNoForbiddenSourcePattern(/fetch\s*\(/, 'module must not call fetch')
  assertNoForbiddenSourcePattern(/from\s+['"]prisma['"]/, 'module must not import Prisma')
  assertNoForbiddenSourcePattern(/['"]use server['"]/, 'module must not include use server')
  assertNoForbiddenSourcePattern(/DATABASE_URL/, 'module must not mention DATABASE_URL')

  const case1Payload = createBasePayload()
  const case1Result = repriceCustomBundleSubmission(case1Payload)
  assert.equal(case1Result.ok, true)
  assert.equal(case1Result.stage, 'priced')
  if (!case1Result.ok || case1Result.stage !== 'priced') {
    throw new Error('case 1 must be priced')
  }

  assert.equal(case1Result.quote.pricingSource, 'server_catalog_v1')
  assert.equal(case1Result.quote.persistenceReady, false)
  assert.deepStrictEqual(
    case1Result.quote.catalogGaps.map((gap) => gap.itemSlug),
    ['combo-percusion', 'grabaciones-voces'],
  )
  assert.equal(case1Result.quote.estimate.subtotalUsd, 280)
  assert.equal(case1Result.quote.estimate.additionalSubtotalUsd, 230)
  assert.equal(case1Result.quote.estimate.estimatedTotalUsd, 280)
  assert.equal(case1Result.quote.estimate.totalDurationMinutes, 120)
  assert.equal(case1Result.quote.estimate.lines.find((line) => line.item.slug === 'sala-premium')?.lineTotalUsd, 50)
  assert.equal(sumAdjustments(case1Result.quote.estimate), 0)
  assert.deepStrictEqual(case1Result.quote.serverIncludedItemSlugs, [
    'tecnico-sonido',
    'backline-equipamiento',
  ])
  assert.deepStrictEqual(
    case1Result.quote.estimate.lines.filter((line) => line.isIncluded).map((line) => line.item.slug),
    ['tecnico-sonido', 'backline-equipamiento'],
  )
  assert.deepStrictEqual(
    case1Result.quote.estimate.lines.filter((line) => line.isIncluded).map((line) => ({
      slug: line.item.slug,
      unitPriceUsd: line.unitPriceUsd,
      lineTotalUsd: line.lineTotalUsd,
      durationMinutes: line.durationMinutes,
    })),
    [
      {
        slug: 'tecnico-sonido',
        unitPriceUsd: 0,
        lineTotalUsd: 0,
        durationMinutes: 0,
      },
      {
        slug: 'backline-equipamiento',
        unitPriceUsd: 0,
        lineTotalUsd: 0,
        durationMinutes: 0,
      },
    ],
  )
  assertQuoteLineSummary(case1Result.quote, [
    'sala-premium',
    'combo-percusion',
    'tecnico-sonido',
    'backline-equipamiento',
    'grabaciones-voces',
  ])
  assert.ok(
    case1Result.quote.estimate.lines
      .filter((line) => line.isIncluded)
      .every(
        (line) =>
          !case1Result.quote.submission.items.some((item) => item.itemSlug === line.item.slug),
      ),
    'included lines must be derived by the server, not submitted by the client',
  )
  assertNoForbiddenMoneyFieldsDeep(case1Result.quote.submission)
  assertNoForbiddenMoneyFieldsDeep(assertParseOk(case1Payload).value)

  const case2Payload = {
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 2,
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
  const case2Result = repriceCustomBundleSubmission(case2Payload)
  assert.equal(case2Result.ok, true)
  assert.equal(case2Result.stage, 'priced')
  if (!case2Result.ok || case2Result.stage !== 'priced') {
    throw new Error('case 2 must be priced')
  }
  assert.equal(case2Result.quote.persistenceReady, true)
  assert.deepStrictEqual(case2Result.quote.catalogGaps, [])
  assert.equal(case2Result.quote.estimate.subtotalUsd, 240)
  assert.equal(case2Result.quote.estimate.additionalSubtotalUsd, 0)
  assert.equal(case2Result.quote.estimate.estimatedTotalUsd, 240)
  assert.equal(case2Result.quote.estimate.totalDurationMinutes, 180)
  assert.equal(case2Result.quote.estimate.lines.find((line) => line.item.slug === 'grabacion-estudio')?.lineTotalUsd, 40)
  assertQuoteLineSummary(case2Result.quote, [
    'sala-premium',
    'grabacion-estudio',
    'mezcla',
    'tecnico-sonido',
    'backline-equipamiento',
  ])
  assert.deepStrictEqual(
    buildCustomBundleAuthoritativeQuote(assertParseOk(case2Payload).value).estimate,
    case2Result.quote.estimate,
  )

  const case3Payload = {
    ...createBasePayload(),
    eventDate: '2026-06-21',
    items: [
      {
        itemSlug: 'sala-prioritaria',
        quantity: 2,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabacion-trombones',
        quantity: 2,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabacion-trompetas',
        quantity: 1,
        sessionDurationMinutes: null,
      },
    ],
  }
  const case3Result = repriceCustomBundleSubmission(case3Payload)
  assert.equal(case3Result.ok, true)
  assert.equal(case3Result.stage, 'priced')
  if (!case3Result.ok || case3Result.stage !== 'priced') {
    throw new Error('case 3 must be priced')
  }
  assert.equal(case3Result.quote.persistenceReady, false)
  assert.deepStrictEqual(case3Result.quote.catalogGaps.map((gap) => gap.itemSlug), [
    'grabacion-trombones',
    'grabacion-trompetas',
  ])
  assert.equal(case3Result.quote.estimate.subtotalUsd, 300)
  assert.equal(case3Result.quote.estimate.additionalSubtotalUsd, 240)
  assert.equal(case3Result.quote.estimate.estimatedTotalUsd, 310)
  assert.equal(sumAdjustments(case3Result.quote.estimate), 10)
  assert.equal(case3Result.quote.estimate.totalDurationMinutes, 120)
  assertQuoteLineSummary(case3Result.quote, [
    'sala-prioritaria',
    'tecnico-sonido',
    'backline-equipamiento',
    'grabacion-trombones',
    'grabacion-trompetas',
  ])

  const case4RootMoneyResult = repriceCustomBundleSubmission({
    ...createBasePayload(),
    estimatedTotalUsd: 1,
  })
  assertNoQuote(case4RootMoneyResult)
  assertRepricingContractFailure(
    {
      ...createBasePayload(),
      estimatedTotalUsd: 1,
    },
    'CLIENT_MONEY_FIELD_FORBIDDEN',
  )

  assertRepricingContractFailure(
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
    'CLIENT_MONEY_FIELD_FORBIDDEN',
  )

  const incompatibleSalaResult = repriceCustomBundleSubmission({
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'sala-flexible',
        quantity: 1,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'sala-premium',
        quantity: 1,
        sessionDurationMinutes: null,
      },
    ],
  })
  assert.equal(incompatibleSalaResult.ok, false)
  assert.equal(incompatibleSalaResult.stage, 'business_rules')
  if (incompatibleSalaResult.ok || incompatibleSalaResult.stage !== 'business_rules') {
    throw new Error('expected business rules failure')
  }
  assertBusinessIssues(incompatibleSalaResult, 'EXCLUSIVE_SALA')
  assert.equal(incompatibleSalaResult.quote.estimate.isBlocked, true)

  const noTemporalComponentResult = repriceCustomBundleSubmission({
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'mezcla',
        quantity: 1,
        sessionDurationMinutes: null,
      },
    ],
  })
  assert.equal(noTemporalComponentResult.ok, false)
  assert.equal(noTemporalComponentResult.stage, 'business_rules')
  if (noTemporalComponentResult.ok || noTemporalComponentResult.stage !== 'business_rules') {
    throw new Error('expected business rules failure')
  }
  assertBusinessIssues(noTemporalComponentResult, 'NO_TIME_COMPONENT')
  assert.equal(noTemporalComponentResult.quote.estimate.isBlocked, true)

  const podcastResult = repriceCustomBundleSubmission({
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'podcast',
        quantity: 1,
        sessionDurationMinutes: 120,
      },
    ],
  })
  assert.equal(podcastResult.ok, true)
  assert.equal(podcastResult.stage, 'priced')
  if (!podcastResult.ok || podcastResult.stage !== 'priced') {
    throw new Error('podcast case must be priced')
  }
  assert.equal(podcastResult.quote.estimate.estimatedTotalUsd, 100)
  assert.equal(podcastResult.quote.estimate.totalDurationMinutes, 120)
  assert.equal(sumAdjustments(podcastResult.quote.estimate), 0)
  assert.equal(podcastResult.quote.persistenceReady, true)
  assert.deepStrictEqual(podcastResult.quote.catalogGaps, [])
  assert.deepStrictEqual(
    podcastResult.quote.estimate.lines.map((line) => line.item.slug),
    ['podcast', 'tecnico-sonido', 'backline-equipamiento'],
  )

  const includedItemsQuote = case1Result.quote
  const includedItemLines = includedItemsQuote.estimate.lines.filter((line) => line.isIncluded)
  assert.equal(
    includedItemLines.length,
    2,
    'included items must appear exactly once in the estimate',
  )
  for (const line of includedItemLines) {
    assert.equal(line.unitPriceUsd, 0, `${line.item.slug} must cost 0 USD`)
    assert.equal(line.lineTotalUsd, 0, `${line.item.slug} must not add to the total`)
    assert.equal(line.durationMinutes, 0, `${line.item.slug} must not add duration`)
  }
  assert.ok(
    includedItemsQuote.submission.items.every(
      (item) =>
        item.itemSlug !== 'tecnico-sonido' && item.itemSlug !== 'backline-equipamiento',
    ),
    'server included items must not be part of submission.items',
  )

  const payloadsForParity = [case1Payload, case2Payload, case3Payload]
  for (const payload of payloadsForParity) {
    const clonedPayload = JSON.parse(JSON.stringify(payload)) as typeof payload
    const parsed = parseCustomBundleSubmissionInput(clonedPayload)
    assert.equal(parsed.ok, true, 'parity payload must parse')
    if (!parsed.ok) {
      throw new Error('parity payload must parse')
    }

    const manualSelections = parsed.value.items.map((item) => ({ ...item }))
    const directEstimate = buildCustomBundleEstimate({
      selections: manualSelections,
      eventDate: parsed.value.eventDate,
    })
    const quote = buildCustomBundleAuthoritativeQuote(parsed.value)
    assert.deepStrictEqual(quote.estimate, directEstimate)
  }

  const immutabilityPayload = createBasePayload()
  const immutabilitySnapshot = JSON.parse(JSON.stringify(immutabilityPayload)) as typeof immutabilityPayload
  repriceCustomBundleSubmission(immutabilityPayload)
  assert.deepStrictEqual(immutabilityPayload, immutabilitySnapshot)

  const untrustedDurationResult = repriceCustomBundleSubmission({
    ...createBasePayload(),
    items: [
      {
        itemSlug: 'sala-premium',
        quantity: 2,
        sessionDurationMinutes: 999,
      },
    ],
  })
  assert.equal(untrustedDurationResult.ok, true)
  assert.equal(untrustedDurationResult.stage, 'priced')
  if (!untrustedDurationResult.ok || untrustedDurationResult.stage !== 'priced') {
    throw new Error('untrusted duration case must be priced')
  }
  assert.equal(
    untrustedDurationResult.quote.submission.items[0]?.sessionDurationMinutes,
    null,
    'session duration must be normalized to null for non-session items',
  )
  assert.equal(untrustedDurationResult.quote.estimate.totalDurationMinutes, 120)
  assert.equal(
    untrustedDurationResult.quote.estimate.lines.find((line) => line.item.slug === 'sala-premium')?.lineTotalUsd,
    50,
  )

  const parseOnlyPayload = createBasePayload()
  const parseOnlyResult = parseCustomBundleSubmissionInput(parseOnlyPayload)
  assert.equal(parseOnlyResult.ok, true)
  if (!parseOnlyResult.ok) {
    throw new Error('parseOnlyPayload must parse')
  }
  assertNoForbiddenMoneyFieldsDeep(parseOnlyResult.value)

  console.log('booking_custom_bundle_authoritative_repricing OK')
}

try {
  main()
} catch (error) {
  console.error('booking_custom_bundle_authoritative_repricing FAILED')
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
}
