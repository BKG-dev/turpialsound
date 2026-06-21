import assert from 'node:assert/strict'
import {
  buildCustomBundleEstimate,
  countCustomBundleAggregateOnlySelections,
  formatCustomBundlePriceDisplay,
  getCustomBundleItemBySlug,
  normalizeCustomBundleSelections,
  splitCustomBundleEstimateLines,
  validateCustomBundleSelection,
} from '@/lib/bookings/custom-bundle'
import type { CustomBundleSelection } from '@/lib/bookings/types'

function selection(
  itemSlug: string,
  quantity = 1,
  sessionDurationMinutes: number | null = null,
): CustomBundleSelection {
  return { itemSlug, quantity, sessionDurationMinutes }
}

function sumAdjustments(estimate: ReturnType<typeof buildCustomBundleEstimate>): number {
  return estimate.adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)
}

function lineBySlug(
  estimate: ReturnType<typeof buildCustomBundleEstimate>,
  slug: string,
) {
  return estimate.lines.find((line) => line.item.slug === slug) ?? null
}

function assertNoMoneyMarkers(label: string, value: string): void {
  assert.ok(!/\bUSD\b|[$€₿]/i.test(value), `${label} must not contain currency markers`)
  assert.ok(!/\d/.test(value), `${label} must not contain numeric prices`)
}

function assertIssueCodes(
  selections: CustomBundleSelection[],
  eventDate: string | null,
): string[] {
  return validateCustomBundleSelection(selections, eventDate).map((issue) => issue.code)
}

function run(): void {
  const aggregateOnlyPrices: Record<string, { price: number; unit: string }> = {
    'combo-percusion': { price: 150, unit: 'tema' },
    'instrumentos-adicionales': { price: 20, unit: 'tema' },
    'grabacion-piano': { price: 80, unit: 'tema' },
    'grabacion-bajo': { price: 80, unit: 'tema' },
    'grabacion-trombones': { price: 80, unit: 'unidad' },
    'grabacion-trompetas': { price: 80, unit: 'unidad' },
    'grabacion-saxo': { price: 80, unit: 'tema' },
    'cuerdas-sesion-completa': { price: 480, unit: 'sesion' },
    'cuerdas-por-instrumento': { price: 80, unit: 'tema' },
    'grabaciones-voces': { price: 40, unit: 'tema' },
  }

  for (const [slug, expected] of Object.entries(aggregateOnlyPrices)) {
    const item = getCustomBundleItemBySlug(slug)
    assert.ok(item, `Expected item ${slug} to exist`)
    assert.equal(item.unitPriceUsd, expected.price, `${slug} internal price mismatch`)
    assert.equal(item.clientPriceDisplay, 'aggregate_only', `${slug} must be aggregate_only`)
    assert.equal(formatCustomBundlePriceDisplay(item), `Unidad: ${expected.unit}`)
    assertNoMoneyMarkers(`${slug} description`, item.description)
  }

  const includedItems = ['tecnico-sonido', 'backline-equipamiento'] as const
  for (const slug of includedItems) {
    const item = getCustomBundleItemBySlug(slug)
    assert.ok(item, `Expected item ${slug} to exist`)
    assert.equal(item.unitPriceUsd, 0, `${slug} must be 0 USD`)
    assert.equal(item.clientPriceDisplay, 'included', `${slug} must be included`)
    assert.equal(formatCustomBundlePriceDisplay(item), 'Incluido')
    assertNoMoneyMarkers(`${slug} description`, item.description)
  }

  const itemizedSample = getCustomBundleItemBySlug('sala-premium')
  assert.ok(itemizedSample, 'Expected sala-premium to exist')
  assert.equal(formatCustomBundlePriceDisplay(itemizedSample), '25 USD / hora')

  const aggregateSelectionTypes = normalizeCustomBundleSelections([
    selection('combo-percusion', 1),
    selection('grabaciones-voces', 2),
  ])
  assert.equal(aggregateSelectionTypes.length, 2)

  const case1 = buildCustomBundleEstimate({
    selections: [
      selection('sala-premium', 2),
      selection('combo-percusion', 1),
      selection('grabaciones-voces', 2),
    ],
    eventDate: '2026-06-22',
  })
  assert.equal(lineBySlug(case1, 'sala-premium')?.lineTotalUsd, 50)
  assert.equal(case1.additionalSubtotalUsd, 230)
  assert.equal(case1.subtotalUsd, 280)
  assert.equal(case1.estimatedTotalUsd, 280)
  assert.equal(case1.totalDurationMinutes, 120)
  assert.equal(countCustomBundleAggregateOnlySelections(case1.lines), 2)
  const case1Split = splitCustomBundleEstimateLines(case1.lines)
  assert.equal(case1Split.aggregateOnlyLines.length, 2)
  assert.equal(case1Split.itemizedLines.length, 1)
  assert.equal(case1Split.includedLines.length, 2)
  assert.ok(case1Split.aggregateOnlyLines.every((line) => line.durationMinutes === 0))

  const case2 = buildCustomBundleEstimate({
    selections: [
      selection('grabacion-estudio', 1, 60),
      selection('grabacion-piano', 1),
      selection('grabacion-bajo', 1),
    ],
    eventDate: '2026-06-22',
  })
  assert.equal(lineBySlug(case2, 'grabacion-estudio')?.lineTotalUsd, 40)
  assert.equal(case2.additionalSubtotalUsd, 160)
  assert.equal(case2.subtotalUsd, 200)
  assert.equal(case2.estimatedTotalUsd, 200)
  assert.equal(case2.totalDurationMinutes, 60)
  assert.equal(countCustomBundleAggregateOnlySelections(case2.lines), 2)

  const case3 = buildCustomBundleEstimate({
    selections: [
      selection('sala-flexible', 1),
      selection('cuerdas-sesion-completa', 1),
      selection('instrumentos-adicionales', 1),
    ],
    eventDate: '2026-06-22',
  })
  assert.equal(lineBySlug(case3, 'sala-flexible')?.lineTotalUsd, 20)
  assert.equal(case3.additionalSubtotalUsd, 500)
  assert.equal(case3.estimatedTotalUsd, 520)
  assert.equal(case3.totalDurationMinutes, 60)

  const case4 = buildCustomBundleEstimate({
    selections: [
      selection('sala-prioritaria', 2),
      selection('grabacion-trombones', 2),
      selection('grabacion-trompetas', 1),
    ],
    eventDate: '2026-06-21',
  })
  assert.equal(lineBySlug(case4, 'sala-prioritaria')?.lineTotalUsd, 60)
  assert.equal(case4.additionalSubtotalUsd, 240)
  assert.equal(sumAdjustments(case4), 10)
  assert.equal(case4.estimatedTotalUsd, 310)
  assert.equal(case4.totalDurationMinutes, 120)

  const case5 = buildCustomBundleEstimate({
    selections: [selection('sala-flexible', 1)],
    eventDate: '2026-06-22',
  })
  assert.equal(case5.additionalSubtotalUsd, 0)
  assert.equal(countCustomBundleAggregateOnlySelections(case5.lines), 0)
  assert.equal(case5.estimatedTotalUsd, 20)
  assert.equal(case5.totalDurationMinutes, 60)

  const saturdayRecordingOnly = buildCustomBundleEstimate({
    selections: [selection('grabacion-estudio', 1, 60)],
    eventDate: '2026-06-21',
  })
  assert.equal(sumAdjustments(saturdayRecordingOnly), 0)

  assert.deepEqual(
    assertIssueCodes(
      [selection('sala-flexible', 1), selection('sala-premium', 1)],
      '2026-06-22',
    ),
    ['EXCLUSIVE_SALA'],
  )

  assert.ok(
    assertIssueCodes([selection('mezcla', 1)], '2026-06-22').includes('NO_TIME_COMPONENT'),
    'Only Mezcla must be blocked without a time component',
  )
  assert.ok(
    assertIssueCodes([selection('master', 1)], '2026-06-22').includes('NO_TIME_COMPONENT'),
    'Only Master must be blocked without a time component',
  )

  assert.ok(
    assertIssueCodes([selection('podcast', 1, null)], '2026-06-22').includes(
      'DURATION_REQUIRED_podcast',
    ),
    'Podcast without duration must be blocked',
  )
  assert.ok(
    assertIssueCodes([selection('podcast', 1, 300)], '2026-06-22').includes(
      'DURATION_MAX_podcast',
    ),
    'Podcast above 240 minutes must be blocked',
  )
  assert.ok(
    assertIssueCodes([selection('studio-session', 1, 300)], '2026-06-22').includes(
      'DURATION_MAX_studio-session',
    ),
    'Studio Session above 240 minutes must be blocked',
  )

  const aggregateSelectionEstimate = buildCustomBundleEstimate({
    selections: [
      selection('combo-percusion', 1),
      selection('grabaciones-voces', 2),
      selection('tecnico-sonido', 1),
      selection('backline-equipamiento', 1),
    ],
    eventDate: '2026-06-22',
  })
  const splitAggregateSelectionEstimate = splitCustomBundleEstimateLines(
    aggregateSelectionEstimate.lines,
  )
  assert.equal(splitAggregateSelectionEstimate.itemizedLines.length, 0)
  assert.equal(splitAggregateSelectionEstimate.aggregateOnlyLines.length, 2)
  assert.equal(splitAggregateSelectionEstimate.includedLines.length, 2)
  assert.ok(
    splitAggregateSelectionEstimate.aggregateOnlyLines.every((line) => line.durationMinutes === 0),
    'Aggregate-only lines must not add minutes',
  )
  assert.ok(
    splitAggregateSelectionEstimate.aggregateOnlyLines.every((line) => line.lineTotalUsd > 0),
    'Aggregate-only lines must contribute to the additional subtotal',
  )
  assert.ok(
    splitAggregateSelectionEstimate.includedLines.every((line) => line.lineTotalUsd === 0),
    'Included lines must not contribute to price',
  )
  assert.ok(
    splitAggregateSelectionEstimate.includedLines.every((line) => line.durationMinutes === 0),
    'Included lines must not contribute to duration',
  )

  const normalizedMissingSlugs = normalizeCustomBundleSelections([
    selection('missing-slug', 3),
    selection('sala-flexible', 1),
  ])
  assert.deepEqual(
    normalizedMissingSlugs.map((entry) => entry.itemSlug),
    ['sala-flexible'],
    'Normalization must remove missing slugs',
  )

  const normalizedMaxOne = normalizeCustomBundleSelections([
    selection('podcast', 3, 180),
    selection('studio-session', 2, 180),
  ])
  assert.equal(
    normalizedMaxOne.find((entry) => entry.itemSlug === 'podcast')?.quantity,
    1,
    'Podcast quantity must be limited to 1',
  )
  assert.equal(
    normalizedMaxOne.find((entry) => entry.itemSlug === 'studio-session')?.quantity,
    1,
    'Studio Session quantity must be limited to 1',
  )

  console.log('booking_custom_bundle_contract OK')
}

try {
  run()
} catch (error) {
  console.error('booking_custom_bundle_contract FAILED')
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
}
