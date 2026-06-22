import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildCustomBundleResourceRequirements,
  getCustomBundleResourcePolicyCandidates,
  getCustomBundleResourcePolicy,
} from '@/lib/bookings/custom-bundle-resource-policy'
import { planCustomBundleContinuousSchedule } from '@/lib/bookings/custom-bundle-schedule'
import { repriceCustomBundleSubmission } from '@/lib/bookings/custom-bundle-repricing'
import type { CustomBundleSubmissionInputV1 } from '@/lib/bookings/custom-bundle-submission'

const SOURCE_AUDITS = [
  {
    sourcePath: 'lib/bookings/custom-bundle-resource-policy.ts',
    forbiddenPatterns: [
      [/Prisma/, 'Prisma'],
      [/lib\/db/, 'lib/db'],
      [/process\.env/, 'process.env'],
      [/fetch\s*\(/, 'fetch'],
      [/DATABASE_URL/, 'DATABASE_URL'],
      [/DIRECT_URL/, 'DIRECT_URL'],
      [/'use server'/, 'use server'],
      [/\bSQL\b/, 'SQL'],
      [/\bwrite\b/i, 'write'],
    ],
  },
  {
    sourcePath: 'lib/bookings/custom-bundle-resource-availability.ts',
    forbiddenPatterns: [
      [/Prisma/, 'Prisma'],
      [/lib\/db/, 'lib/db'],
      [/process\.env/, 'process.env'],
      [/fetch\s*\(/, 'fetch'],
      [/DATABASE_URL/, 'DATABASE_URL'],
      [/DIRECT_URL/, 'DIRECT_URL'],
      [/'use server'/, 'use server'],
      [/\bINSERT\b/i, 'INSERT'],
      [/(?<!FOR\s)\bUPDATE\b/i, 'UPDATE'],
      [/\bDELETE\b/i, 'DELETE'],
      [/\bCOMMIT\b/i, 'COMMIT'],
      [/\bUPSERT\b/i, 'UPSERT'],
      [/\bDROP\b/i, 'DROP'],
      [/\bTRUNCATE\b/i, 'TRUNCATE'],
      [/\bCREATE\b/i, 'CREATE'],
      [/\bALTER\b/i, 'ALTER'],
    ],
  },
] as const

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertSourceAudit(): void {
  for (const audit of SOURCE_AUDITS) {
    const source = readFileSync(resolve(process.cwd(), audit.sourcePath), 'utf8')
    for (const [pattern, label] of audit.forbiddenPatterns) {
      assert.equal(
        pattern.test(source),
        false,
        `${audit.sourcePath} must not contain ${label}`,
      )
    }
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
    extrasNotes: 'Observaciones del cliente',
    requester: {
      name: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+584121234567',
      whatsappConsentAccepted: true,
    },
    items,
    ...overrides,
  }
}

function assertPlanScheduled(
  planResult: ReturnType<typeof planCustomBundleContinuousSchedule>,
): asserts planResult is Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }> {
  assert.equal(planResult.ok, true)
  assert.equal(planResult.stage, 'scheduled')
  if (!planResult.ok || planResult.stage !== 'scheduled') {
    throw new Error('Expected a scheduled plan.')
  }
}

function assertRequirements(
  scheduleResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['schedule'],
  quoteResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['quote'],
  expectedSlugs: string[],
  expectedCandidateMap: Record<string, string[]>,
): void {
  const requirementsResult = buildCustomBundleResourceRequirements(quoteResult, scheduleResult)
  assert.equal(requirementsResult.ok, true)
  if (!requirementsResult.ok) {
    throw new Error('Resource requirements must be valid.')
  }

  assert.deepStrictEqual(
    requirementsResult.requirements.map((requirement) => requirement.itemSlug),
    expectedSlugs,
  )

  for (const requirement of requirementsResult.requirements) {
    assert.deepStrictEqual(
      requirement.candidateResourceSlugs,
      expectedCandidateMap[requirement.itemSlug] ?? [],
    )
  }
}

function assertResourceRequirementsMode(
  scheduleResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['schedule'],
  quoteResult: Extract<ReturnType<typeof planCustomBundleContinuousSchedule>, { ok: true }>['quote'],
  expectedRequirements: Array<{
    itemSlug: string
    mode: 'physical' | 'no_physical_resource'
    candidateResourceSlugs: string[]
  }>,
): void {
  const requirementsResult = buildCustomBundleResourceRequirements(quoteResult, scheduleResult)
  assert.equal(requirementsResult.ok, true)
  if (!requirementsResult.ok) {
    throw new Error('Resource requirements must be valid.')
  }

  assert.deepStrictEqual(
    requirementsResult.requirements.map((requirement) => ({
      itemSlug: requirement.itemSlug,
      mode: requirement.mode,
      candidateResourceSlugs: requirement.candidateResourceSlugs,
    })),
    expectedRequirements,
  )
}

function main(): void {
  assertSourceAudit()

  const salaPremiumPayload = buildPayload([
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
  ])
  const salaPremiumPlan = planCustomBundleContinuousSchedule(deepClone(salaPremiumPayload))
  assertPlanScheduled(salaPremiumPlan)
  assertRequirements(
    salaPremiumPlan.schedule,
    salaPremiumPlan.quote,
    ['sala-premium'],
    {
      'sala-premium': ['sala-3-ensayo', 'sala-1-grande'],
    },
  )

  const grabacionPayload = buildPayload([
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
  ])
  const grabacionPlan = planCustomBundleContinuousSchedule(deepClone(grabacionPayload))
  assertPlanScheduled(grabacionPlan)
  assertRequirements(grabacionPlan.schedule, grabacionPlan.quote, ['grabacion-estudio'], {
    'grabacion-estudio': ['sala-1-grande'],
  })

  const podcastPayload = buildPayload([
    { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
  ])
  const podcastPlan = planCustomBundleContinuousSchedule(deepClone(podcastPayload))
  assertPlanScheduled(podcastPlan)
  assertRequirements(podcastPlan.schedule, podcastPlan.quote, ['podcast'], {
    podcast: ['sala-2-podcast-locucion'],
  })

  const locucionPayload = buildPayload([
    { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
  ])
  const locucionPlan = planCustomBundleContinuousSchedule(deepClone(locucionPayload))
  assertPlanScheduled(locucionPlan)
  assertRequirements(locucionPlan.schedule, locucionPlan.quote, ['locucion'], {
    locucion: ['sala-2-podcast-locucion'],
  })

  const videoSessionPolicy = getCustomBundleResourcePolicy('video-session')
  assert.ok(videoSessionPolicy)
  assert.equal(videoSessionPolicy?.mode, 'no_physical_resource')
  assert.deepStrictEqual(videoSessionPolicy?.candidateResourceSlugs, [])

  const consultoriaPolicy = getCustomBundleResourcePolicy('consultoria')
  assert.ok(consultoriaPolicy)
  assert.equal(consultoriaPolicy?.mode, 'no_physical_resource')
  assert.deepStrictEqual(consultoriaPolicy?.candidateResourceSlugs, [])

  const mixedPayload = buildPayload([
    { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
  ])
  const mixedPlan = planCustomBundleContinuousSchedule(deepClone(mixedPayload))
  assertPlanScheduled(mixedPlan)
  assert.deepStrictEqual(
    mixedPlan.schedule.components.map((component) => component.itemSlug),
    ['sala-premium', 'grabacion-estudio', 'podcast', 'locucion'],
  )
  assertRequirements(mixedPlan.schedule, mixedPlan.quote, [
    'sala-premium',
    'grabacion-estudio',
    'podcast',
    'locucion',
  ], {
    'sala-premium': ['sala-3-ensayo', 'sala-1-grande'],
    'grabacion-estudio': ['sala-1-grande'],
    podcast: ['sala-2-podcast-locucion'],
    locucion: ['sala-2-podcast-locucion'],
  })

  const mixedModesPayload = buildPayload([
    { itemSlug: 'consultoria-produccion', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'studio-session', quantity: 1, sessionDurationMinutes: 180 },
    { itemSlug: 'podcast', quantity: 1, sessionDurationMinutes: 120 },
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
  ])
  const mixedModesPlan = planCustomBundleContinuousSchedule(deepClone(mixedModesPayload))
  assertPlanScheduled(mixedModesPlan)
  assert.deepStrictEqual(
    mixedModesPlan.schedule.components.map((component) => component.itemSlug),
    ['sala-premium', 'podcast', 'studio-session', 'consultoria-produccion'],
  )
  assertResourceRequirementsMode(mixedModesPlan.schedule, mixedModesPlan.quote, [
    {
      itemSlug: 'sala-premium',
      mode: 'physical',
      candidateResourceSlugs: ['sala-3-ensayo', 'sala-1-grande'],
    },
    {
      itemSlug: 'podcast',
      mode: 'physical',
      candidateResourceSlugs: ['sala-2-podcast-locucion'],
    },
    {
      itemSlug: 'studio-session',
      mode: 'no_physical_resource',
      candidateResourceSlugs: [],
    },
    {
      itemSlug: 'consultoria-produccion',
      mode: 'no_physical_resource',
      candidateResourceSlugs: [],
    },
  ])

  const excludedPayload = buildPayload([
    { itemSlug: 'sala-premium', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'mezcla', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'combo-percusion', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'grabaciones-voces', quantity: 2, sessionDurationMinutes: null },
  ])
  const excludedPlan = planCustomBundleContinuousSchedule(deepClone(excludedPayload))
  assertPlanScheduled(excludedPlan)
  const excludedRequirements = buildCustomBundleResourceRequirements(
    excludedPlan.quote,
    excludedPlan.schedule,
  )
  assert.equal(excludedRequirements.ok, true)
  if (!excludedRequirements.ok) {
    throw new Error('Excluded lines should not block requirements.')
  }
  assert.deepStrictEqual(
    excludedRequirements.requirements.map((requirement) => requirement.itemSlug),
    ['sala-premium'],
  )

  const immutabilityPayload = buildPayload([
    { itemSlug: 'sala-premium', quantity: 2, sessionDurationMinutes: null },
    { itemSlug: 'grabacion-estudio', quantity: 1, sessionDurationMinutes: null },
    { itemSlug: 'locucion', quantity: 1, sessionDurationMinutes: null },
  ])
  const immutabilitySnapshot = deepClone(immutabilityPayload)
  const immutabilityPlan = planCustomBundleContinuousSchedule(immutabilityPayload)
  assertPlanScheduled(immutabilityPlan)
  const quoteSnapshot = deepClone(immutabilityPlan.quote)
  const scheduleSnapshot = deepClone(immutabilityPlan.schedule)
  const requirementsImmutability = buildCustomBundleResourceRequirements(
    immutabilityPlan.quote,
    immutabilityPlan.schedule,
  )
  assert.equal(requirementsImmutability.ok, true)
  assert.deepStrictEqual(immutabilityPayload, immutabilitySnapshot)
  assert.deepStrictEqual(immutabilityPlan.quote, quoteSnapshot)
  assert.deepStrictEqual(immutabilityPlan.schedule, scheduleSnapshot)

  const repriced = repriceCustomBundleSubmission(salaPremiumPayload)
  assert.equal(repriced.ok, true)

  const policyCandidates = getCustomBundleResourcePolicyCandidates('sala-ensayo')
  assert.deepStrictEqual(policyCandidates, ['sala-3-ensayo', 'sala-1-grande'])

  const unknownPolicy = getCustomBundleResourcePolicy('future-service')
  assert.equal(unknownPolicy, null)
  assert.equal(getCustomBundleResourcePolicyCandidates('future-service'), null)

  console.log('booking_custom_bundle_resource_policy OK')
  console.log('managed resource policy: verified')
  console.log('candidate priority: verified')
  console.log('no physical resource policy: verified')
  console.log('mixed resource modes: verified')
  console.log('unknown policies blocked: verified')
  console.log('schedule order: verified')
  console.log('immutability: verified')
}

try {
  main()
} catch (error) {
  console.error('booking_custom_bundle_resource_policy FAILED')
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
}
