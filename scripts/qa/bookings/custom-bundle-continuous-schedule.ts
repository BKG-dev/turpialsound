import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseCaracasLocalDateTime } from '@/lib/bookings/caracas-time'
import {
  buildCustomBundleContinuousSchedule,
  planCustomBundleContinuousSchedule,
} from '@/lib/bookings/custom-bundle-schedule'
import { repriceCustomBundleSubmission } from '@/lib/bookings/custom-bundle-repricing'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'

const SOURCE_FILES = [
  'lib/bookings/caracas-time.ts',
  'lib/bookings/custom-bundle-schedule.ts',
] as const

const FORBIDDEN_SOURCE_PATTERNS: Array<[RegExp, string]> = [
  [/Prisma/, 'Prisma'],
  [/lib\/db/, 'lib/db'],
  [/process\.env/, 'process.env'],
  [/fetch\s*\(/, 'fetch'],
  [/DATABASE_URL/, 'DATABASE_URL'],
  [/DIRECT_URL/, 'DIRECT_URL'],
  [/'use server'/, 'use server'],
  [/\bSQL\b/, 'SQL'],
  [/\bwrite\b/, 'write'],
]

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertNoForbiddenSource(sourcePath: string): void {
  const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
  for (const [pattern, label] of FORBIDDEN_SOURCE_PATTERNS) {
    assert.equal(pattern.test(source), false, `${sourcePath} must not contain ${label}`)
  }
}

function assertSourceAudit(): void {
  for (const sourceFile of SOURCE_FILES) {
    assertNoForbiddenSource(sourceFile)
  }
}

function buildPayload(
  items: CustomBundleSubmissionInputV1['items'],
  overrides: Partial<Omit<CustomBundleSubmissionInputV1, 'items'>> = {},
): CustomBundleSubmissionInputV1 {
  return {
    contractVersion: 1,
    bookingMode: 'custom_bundle',
    eventDate: '2026-06-24',
    startTime: '10:00',
    extrasNotes: '  Observaciones del cliente  ',
    requester: {
      name: '  Ana Perez  ',
      email: ' ANA@Example.COM ',
      phone: '+58 412-123-4567',
      whatsappConsentAccepted: true,
    },
    items,
    ...overrides,
  }
}

function assertTemporalContinuity(
  schedule: Exclude<ReturnType<typeof buildCustomBundleContinuousSchedule>, { ok: false }>['schedule'],
): void {
  for (let index = 1; index < schedule.components.length; index += 1) {
    const previous = schedule.components[index - 1]
    const current = schedule.components[index]
    assert.equal(previous.endOffsetMinutes, current.startOffsetMinutes)
    assert.equal(previous.endsAtIso, current.startsAtIso)
  }
}

function assertScheduleParity(
  schedule: Exclude<ReturnType<typeof buildCustomBundleContinuousSchedule>, { ok: false }>['schedule'],
): void {
  assert.equal(schedule.mode, 'continuous_sequential')
  assert.equal(schedule.timezone, 'America/Caracas')
  assert.equal(schedule.utcOffset, '-04:00')
  assert.equal(
    new Date(schedule.endsAtIso).getTime() - new Date(schedule.startsAtIso).getTime(),
    schedule.totalDurationMinutes * 60 * 1000,
  )
  assertTemporalContinuity(schedule)
}

function assertScheduleComponents(
  schedule: Exclude<ReturnType<typeof buildCustomBundleContinuousSchedule>, { ok: false }>['schedule'],
  expectedSlugs: string[],
): void {
  assert.deepStrictEqual(
    schedule.components.map((component) => component.itemSlug),
    expectedSlugs,
  )
}

function assertExcludedReasons(
  schedule: Exclude<ReturnType<typeof buildCustomBundleContinuousSchedule>, { ok: false }>['schedule'],
  expected: Record<string, string>,
): void {
  const excluded = new Map(schedule.excludedLines.map((line) => [line.itemSlug, line.reason]))
  assert.equal(excluded.size, Object.keys(expected).length)
  for (const [slug, reason] of Object.entries(expected)) {
    assert.equal(excluded.get(slug), reason, `${slug} exclusion reason`)
  }
}

function assertPlanScheduled(
  result: ReturnType<typeof planCustomBundleContinuousSchedule>,
): asserts result is Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }> {
  assert.equal(result.ok, true)
  assert.equal(result.stage, 'scheduled')
  if (!result.ok || result.stage !== 'scheduled') {
    throw new Error('plan must be scheduled')
  }
}

function assertPlanBusinessRules(
  result: ReturnType<typeof planCustomBundleContinuousSchedule>,
): asserts result is Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: false; stage: 'business_rules' }> {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'business_rules')
  if (result.ok || result.stage !== 'business_rules') {
    throw new Error('plan must fail business rules')
  }
}

function assertPlanContractFailure(
  result: ReturnType<typeof planCustomBundleContinuousSchedule>,
): asserts result is Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: false; stage: 'contract' }> {
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'contract')
  if (result.ok || result.stage !== 'contract') {
    throw new Error('plan must fail contract')
  }
}

function assertResultIssueCodes(
  issues: readonly { code: string }[],
  expectedCodes: string[],
): void {
  assert.deepStrictEqual(
    issues.map((issue) => issue.code),
    expectedCodes,
  )
}

function assertValidQuote(scheduleResult: ReturnType<typeof planCustomBundleContinuousSchedule>): void {
  assertPlanScheduled(scheduleResult)
  const rebuilt = buildCustomBundleContinuousSchedule(scheduleResult.quote)
  assert.equal(rebuilt.ok, true)
  if (!rebuilt.ok) {
    throw new Error('rebuilt schedule must be valid')
  }
  assert.deepStrictEqual(rebuilt.schedule, scheduleResult.schedule)
}

function main(): void {
  assertSourceAudit()

  const weekdayPayload = buildPayload([
    { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
    { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
    { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
  ])
  const weekdayPlan = planCustomBundleContinuousSchedule(deepClone(weekdayPayload))
  assertPlanScheduled(weekdayPlan)
  assertScheduleComponents(weekdayPlan.schedule, [
    'sala-premium',
    'grabacion-estudio',
    'podcast',
    'locucion',
    'studio-session',
    'consultoria-produccion',
  ])
  assert.deepStrictEqual(
    weekdayPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      startOffsetMinutes: component.startOffsetMinutes,
      endOffsetMinutes: component.endOffsetMinutes,
      durationMinutes: component.durationMinutes,
      sessionDurationMinutes: component.sessionDurationMinutes,
    })),
    [
      {
        itemSlug: 'sala-premium',
        startOffsetMinutes: 0,
        endOffsetMinutes: 120,
        durationMinutes: 120,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'grabacion-estudio',
        startOffsetMinutes: 120,
        endOffsetMinutes: 180,
        durationMinutes: 60,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'podcast',
        startOffsetMinutes: 180,
        endOffsetMinutes: 300,
        durationMinutes: 120,
        sessionDurationMinutes: 120,
      },
      {
        itemSlug: 'locucion',
        startOffsetMinutes: 300,
        endOffsetMinutes: 360,
        durationMinutes: 60,
        sessionDurationMinutes: null,
      },
      {
        itemSlug: 'studio-session',
        startOffsetMinutes: 360,
        endOffsetMinutes: 540,
        durationMinutes: 180,
        sessionDurationMinutes: 180,
      },
      {
        itemSlug: 'consultoria-produccion',
        startOffsetMinutes: 540,
        endOffsetMinutes: 600,
        durationMinutes: 60,
        sessionDurationMinutes: null,
      },
    ],
  )
  assert.equal(weekdayPlan.schedule.totalDurationMinutes, 600)
  assert.equal(weekdayPlan.schedule.startsAtIso, '2026-06-24T14:00:00.000Z')
  assert.equal(weekdayPlan.schedule.endsAtIso, '2026-06-25T00:00:00.000Z')
  assertScheduleParity(weekdayPlan.schedule)
  assertValidQuote(weekdayPlan)

  const weekdayQuote = weekdayPlan.quote
  assertExcludedReasons(weekdayPlan.schedule, {
    'mezcla': 'does_not_consume_calendar',
    'combo-percusion': 'does_not_consume_calendar',
    'tecnico-sonido': 'included',
    'backline-equipamiento': 'included',
  })
  assert.equal(
    weekdayPlan.schedule.components.some((component) => component.itemSlug === 'mezcla'),
    false,
  )
  assert.equal(
    weekdayPlan.schedule.components.some((component) => component.itemSlug === 'combo-percusion'),
    false,
  )
  assert.equal(
    weekdayPlan.schedule.components.some((component) => component.itemSlug === 'tecnico-sonido'),
    false,
  )
  assert.equal(
    weekdayPlan.schedule.components.some((component) => component.itemSlug === 'backline-equipamiento'),
    false,
  )

  const reversedGrabacionPayload = buildPayload([
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'grabacion-ensayo', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null },
  ])
  const reversedGrabacionPlan = planCustomBundleContinuousSchedule(deepClone(reversedGrabacionPayload))
  assertPlanScheduled(reversedGrabacionPlan)
  assertScheduleComponents(reversedGrabacionPlan.schedule, [
    'sala-premium',
    'grabacion-ensayo',
    'grabacion-estudio',
  ])

  const podcastExplicitPlan = planCustomBundleContinuousSchedule(
    buildPayload([
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
    ]),
  )
  assertPlanScheduled(podcastExplicitPlan)
  assert.deepStrictEqual(
    podcastExplicitPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      sessionDurationMinutes: component.sessionDurationMinutes,
      durationMinutes: component.durationMinutes,
    })),
    [
      {
        itemSlug: 'podcast',
        sessionDurationMinutes: 120,
        durationMinutes: 120,
      },
    ],
  )
  assert.equal(podcastExplicitPlan.schedule.totalDurationMinutes, 120)

  const studioSessionExplicitPlan = planCustomBundleContinuousSchedule(
    buildPayload([
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
    ]),
  )
  assertPlanScheduled(studioSessionExplicitPlan)
  assert.deepStrictEqual(
    studioSessionExplicitPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      sessionDurationMinutes: component.sessionDurationMinutes,
      durationMinutes: component.durationMinutes,
    })),
    [
      {
        itemSlug: 'studio-session',
        sessionDurationMinutes: 180,
        durationMinutes: 180,
      },
    ],
  )
  assert.equal(studioSessionExplicitPlan.schedule.totalDurationMinutes, 180)

  const salaPremiumCalculatedPlan = planCustomBundleContinuousSchedule(
    buildPayload([{ itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null }]),
  )
  assertPlanScheduled(salaPremiumCalculatedPlan)
  assert.deepStrictEqual(
    salaPremiumCalculatedPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      sessionDurationMinutes: component.sessionDurationMinutes,
      durationMinutes: component.durationMinutes,
    })),
    [
      {
        itemSlug: 'sala-premium',
        sessionDurationMinutes: null,
        durationMinutes: 120,
      },
    ],
  )
  assert.equal(salaPremiumCalculatedPlan.schedule.totalDurationMinutes, 120)

  const locucionCalculatedPlan = planCustomBundleContinuousSchedule(
    buildPayload([{ itemSlug: 'locucion', quantity: 2, sessionDurationMinutes: null }]),
  )
  assertPlanScheduled(locucionCalculatedPlan)
  assert.deepStrictEqual(
    locucionCalculatedPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      sessionDurationMinutes: component.sessionDurationMinutes,
      durationMinutes: component.durationMinutes,
    })),
    [
      {
        itemSlug: 'locucion',
        sessionDurationMinutes: null,
        durationMinutes: 120,
      },
    ],
  )
  assert.equal(locucionCalculatedPlan.schedule.totalDurationMinutes, 120)

  const rolloverPlan = planCustomBundleContinuousSchedule(
    buildPayload(
      [{ itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 180 }],
      {
        eventDate: '2026-06-24',
        startTime: '22:30',
      },
    ),
  )
  assertPlanScheduled(rolloverPlan)
  assert.equal(rolloverPlan.schedule.startsAtIso, '2026-06-25T02:30:00.000Z')
  assert.equal(rolloverPlan.schedule.endsAtIso, '2026-06-25T05:30:00.000Z')
  assert.equal(rolloverPlan.schedule.totalDurationMinutes, 180)

  assert.equal(
    parseCaracasLocalDateTime('2026-06-24', '10:00')?.toISOString(),
    '2026-06-24T14:00:00.000Z',
  )
  assert.equal(parseCaracasLocalDateTime('2026-02-29', '10:00'), null)
  assert.equal(parseCaracasLocalDateTime('2026-13-01', '10:00'), null)
  assert.equal(parseCaracasLocalDateTime('2026-04-31', '10:00'), null)
  assert.equal(parseCaracasLocalDateTime('2026-06-24', '24:00'), null)
  assert.equal(parseCaracasLocalDateTime('2026-06-24', '10:60'), null)
  assert.equal(
    parseCaracasLocalDateTime('2028-02-29', '10:00')?.toISOString(),
    '2028-02-29T14:00:00.000Z',
  )

  const noTemporalPlan = planCustomBundleContinuousSchedule(
    buildPayload([{ itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null }]),
  )
  assertPlanBusinessRules(noTemporalPlan)
  assertResultIssueCodes(noTemporalPlan.businessIssues, ['NO_TIME_COMPONENT'])

  const moneyContractResult = repriceCustomBundleSubmission({
    ...buildPayload([{ itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null }]),
    estimatedTotalUsd: 1,
  })
  assert.equal(moneyContractResult.ok, false)
  assert.equal(moneyContractResult.stage, 'contract')
  if (moneyContractResult.ok || moneyContractResult.stage !== 'contract') {
    throw new Error('money case must fail contract')
  }
  assertResultIssueCodes(moneyContractResult.contractIssues, ['CLIENT_MONEY_FIELD_FORBIDDEN'])
  assertPlanContractFailure(planCustomBundleContinuousSchedule({
    ...buildPayload([{ itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null }]),
    estimatedTotalUsd: 1,
  }))

  const saturdayPlan = planCustomBundleContinuousSchedule(
    buildPayload([
      { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
      { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
      { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
      { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
      { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
    ], {
      eventDate: '2026-06-27',
    }),
  )
  assertPlanScheduled(saturdayPlan)
  assert.deepStrictEqual(
    saturdayPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      startOffsetMinutes: component.startOffsetMinutes,
      endOffsetMinutes: component.endOffsetMinutes,
      durationMinutes: component.durationMinutes,
    })),
    weekdayPlan.schedule.components.map((component) => ({
      itemSlug: component.itemSlug,
      startOffsetMinutes: component.startOffsetMinutes,
      endOffsetMinutes: component.endOffsetMinutes,
      durationMinutes: component.durationMinutes,
    })),
  )
  assert.equal(saturdayPlan.schedule.totalDurationMinutes, weekdayPlan.schedule.totalDurationMinutes)
  assert.equal(
    saturdayPlan.quote.estimate.estimatedTotalUsd - weekdayPlan.quote.estimate.estimatedTotalUsd,
    10,
  )

  for (const scheduled of [weekdayPlan, reversedGrabacionPlan, podcastExplicitPlan, studioSessionExplicitPlan, salaPremiumCalculatedPlan, locucionCalculatedPlan, rolloverPlan, saturdayPlan]) {
    assertPlanScheduled(scheduled)
    assertScheduleParity(scheduled.schedule)
  }

  const weekdayPlanQuote = weekdayPlan.quote
  const weekdayPlanRebuilt = buildCustomBundleContinuousSchedule(weekdayPlanQuote)
  assert.equal(weekdayPlanRebuilt.ok, true)
  if (!weekdayPlanRebuilt.ok) {
    throw new Error('weekday rebuild must succeed')
  }
  assert.deepStrictEqual(weekdayPlanRebuilt.schedule, weekdayPlan.schedule)

  const immutabilityPayload = buildPayload([
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
  ])
  const immutabilitySnapshot = deepClone(immutabilityPayload)
  planCustomBundleContinuousSchedule(immutabilityPayload)
  assert.deepStrictEqual(immutabilityPayload, immutabilitySnapshot)

  const alteredQuoteBase = deepClone(salaPremiumCalculatedPlan.quote)
  const alteredDurationQuote = deepClone(alteredQuoteBase)
  alteredDurationQuote.estimate.totalDurationMinutes = 999
  const alteredDurationResult = buildCustomBundleContinuousSchedule(alteredDurationQuote)
  assert.equal(alteredDurationResult.ok, false)
  if (alteredDurationResult.ok) {
    throw new Error('altered duration quote must fail')
  }
  assert.ok(
    alteredDurationResult.issues.some((issue) => issue.code === 'TOTAL_DURATION_MISMATCH'),
  )

  const alteredNegativeQuote = deepClone(alteredQuoteBase)
  const alteredTemporalLine = alteredNegativeQuote.estimate.lines.find(
    (line) => !line.isIncluded && line.item.consumesCalendar && line.durationMinutes > 0,
  )
  assert.ok(alteredTemporalLine)
  if (alteredTemporalLine) {
    alteredTemporalLine.durationMinutes = -1
  }
  const alteredNegativeResult = buildCustomBundleContinuousSchedule(alteredNegativeQuote)
  assert.equal(alteredNegativeResult.ok, false)
  if (alteredNegativeResult.ok) {
    throw new Error('altered negative quote must fail')
  }
  assert.ok(alteredNegativeResult.issues.length > 0)

  const alteredDateQuote = deepClone(alteredQuoteBase)
  alteredDateQuote.submission.eventDate = '2026-02-29'
  const alteredDateResult = buildCustomBundleContinuousSchedule(alteredDateQuote)
  assert.equal(alteredDateResult.ok, false)
  if (alteredDateResult.ok) {
    throw new Error('altered date quote must fail')
  }
  assertResultIssueCodes(alteredDateResult.issues, ['INVALID_START_DATETIME'])

  const directQuote = repriceCustomBundleSubmission(weekdayPayload)
  assert.equal(directQuote.ok, true)
  if (!directQuote.ok || directQuote.stage !== 'priced') {
    throw new Error('weekday payload must repricing succeed')
  }
  const directSchedule = buildCustomBundleContinuousSchedule(directQuote.quote)
  assert.equal(directSchedule.ok, true)
  if (!directSchedule.ok) {
    throw new Error('direct schedule must succeed')
  }
  assert.deepStrictEqual(directSchedule.schedule, weekdayPlan.schedule)

  console.log('booking_custom_bundle_continuous_schedule OK')
  console.log('authoritative repricing: verified')
  console.log('temporal order: verified')
  console.log('continuous offsets: verified')
  console.log('excluded lines: verified')
  console.log('date rollover: verified')
  console.log('duration parity: verified')
  console.log('immutability: verified')
}

try {
  main()
} catch (error) {
  console.error('booking_custom_bundle_continuous_schedule FAILED')
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
}
