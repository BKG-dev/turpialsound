import {
  buildCustomBundleResourceRequirements,
  type CustomBundleResourcePolicyIssue,
} from '@/lib/bookings/custom-bundle-resource-policy'
import type { CustomBundleAuthoritativeQuote } from '@/lib/bookings/custom-bundle-repricing'
import {
  planCustomBundleContinuousSchedule,
  type CustomBundleContinuousSchedule,
  type CustomBundleScheduleIssue,
} from '@/lib/bookings/custom-bundle-schedule'
import type {
  CustomBundleEstimateIssue,
} from '@/lib/bookings/types'
import type { CustomBundleSubmissionContractIssue } from '@/lib/bookings/custom-bundle-submission'
import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

interface ResourceCatalogRow {
  id: string
  slug: string
  name: string
  isActive: boolean
}

interface ResourceCatalogResolution {
  resourcesBySlug: Map<string, ResourceCatalogRow>
}

export interface CheckCustomBundleResourceAvailabilityInput {
  submission: unknown
  excludeBookingRequestId?: string | null
}

export interface CustomBundleResolvedResource {
  resourceId: string
  resourceSlug: string
  resourceName: string
}

export interface CustomBundleResourceAllocation {
  itemSlug: string
  itemName: string
  serviceSlug: string
  startsAtIso: string
  endsAtIso: string
  candidateResourceSlugs: readonly string[]
  assignedResource: CustomBundleResolvedResource
}

export interface CustomBundleResourceAvailabilityPlan {
  quote: CustomBundleAuthoritativeQuote
  schedule: CustomBundleContinuousSchedule
  allocations: CustomBundleResourceAllocation[]
}

export type CheckCustomBundleResourceAvailabilityResult =
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundleSubmissionContractIssue[]
    }
  | {
      ok: false
      stage: 'business_rules'
      businessIssues: CustomBundleEstimateIssue[]
    }
  | {
      ok: false
      stage: 'schedule'
      scheduleIssues: CustomBundleScheduleIssue[]
    }
  | {
      ok: false
      stage: 'resource_policy'
      policyIssues: CustomBundleResourcePolicyIssue[]
    }
  | {
      ok: false
      stage: 'server_context'
      code: 'INVALID_SQL_SESSION' | 'INVALID_EXCLUDED_BOOKING_ID'
      message: string
    }
  | {
      ok: false
      stage: 'resource_catalog'
      code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_INACTIVE' | 'RESOURCE_SLUG_DUPLICATED'
      resourceSlug: string
      message: string
    }
  | {
      ok: false
      stage: 'collision'
      code: 'RESOURCE_UNAVAILABLE'
      itemSlug: string
      startsAtIso: string
      endsAtIso: string
      attemptedResourceSlugs: string[]
      message: string
    }
  | {
      ok: false
      stage: 'database'
      code: 'RESOURCE_CHECK_FAILED'
      message: string
    }
  | {
      ok: true
      stage: 'available'
      plan: CustomBundleResourceAvailabilityPlan
    }

interface SqlCollisionRow {
  resourceId: string
}

function buildServerContextIssue(
  code: 'INVALID_SQL_SESSION' | 'INVALID_EXCLUDED_BOOKING_ID',
  message: string,
): Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'server_context' }> {
  return {
    ok: false,
    stage: 'server_context',
    code,
    message,
  }
}

function buildResourceCatalogIssue(
  code: 'RESOURCE_NOT_FOUND' | 'RESOURCE_INACTIVE' | 'RESOURCE_SLUG_DUPLICATED',
  resourceSlug: string,
  message: string,
): Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'resource_catalog' }> {
  return {
    ok: false,
    stage: 'resource_catalog',
    code,
    resourceSlug,
    message,
  }
}

function buildCollisionIssue(
  itemSlug: string,
  startsAtIso: string,
  endsAtIso: string,
  attemptedResourceSlugs: string[],
): Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'collision' }> {
  return {
    ok: false,
    stage: 'collision',
    code: 'RESOURCE_UNAVAILABLE',
    itemSlug,
    startsAtIso,
    endsAtIso,
    attemptedResourceSlugs,
    message: `No hay recursos fisicos disponibles para ${itemSlug}.`,
  }
}

function buildDatabaseIssue(
  message: string,
): Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'database' }> {
  return {
    ok: false,
    stage: 'database',
    code: 'RESOURCE_CHECK_FAILED',
    message,
  }
}

function rollbackSilently(session: CustomBundleSqlSession): Promise<void> {
  return session.query('ROLLBACK').then(
    () => undefined,
    () => undefined,
  )
}

function normalizeExcludedBookingRequestId(
  value: unknown,
): string | null | Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'server_context' }> {
  if (value == null) {
    return null
  }

  if (typeof value !== 'string') {
    return buildServerContextIssue(
      'INVALID_EXCLUDED_BOOKING_ID',
      'excludeBookingRequestId debe ser null, undefined o una cadena no vacia.',
    )
  }

  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > 128) {
    return buildServerContextIssue(
      'INVALID_EXCLUDED_BOOKING_ID',
      'excludeBookingRequestId debe ser null, undefined o una cadena no vacia.',
    )
  }

  return normalized
}

function collectCandidateResourceSlugs(
  requirements: ReadonlyArray<{ candidateResourceSlugs: readonly string[] }>,
): string[] {
  const collected: string[] = []
  const seen = new Set<string>()

  for (const requirement of requirements) {
    for (const candidateResourceSlug of requirement.candidateResourceSlugs) {
      if (seen.has(candidateResourceSlug)) {
        continue
      }

      seen.add(candidateResourceSlug)
      collected.push(candidateResourceSlug)
    }
  }

  return collected
}

function collectCandidateResourceIds(
  requirements: ReadonlyArray<{ candidateResourceSlugs: readonly string[] }>,
  resourcesBySlug: ReadonlyMap<string, ResourceCatalogRow>,
): string[] {
  const collected: string[] = []
  const seen = new Set<string>()

  for (const requirement of requirements) {
    for (const candidateResourceSlug of requirement.candidateResourceSlugs) {
      const resource = resourcesBySlug.get(candidateResourceSlug)
      if (!resource || seen.has(resource.id)) {
        continue
      }

      seen.add(resource.id)
      collected.push(resource.id)
    }
  }

  return collected.sort((left, right) => left.localeCompare(right))
}

async function resolveResourceCatalog(
  session: CustomBundleSqlSession,
  candidateResourceSlugs: readonly string[],
): Promise<
  | {
      ok: true
      catalog: ResourceCatalogResolution
    }
  | Extract<CheckCustomBundleResourceAvailabilityResult, { stage: 'resource_catalog' }>
> {
  if (candidateResourceSlugs.length === 0) {
    return {
      ok: true,
      catalog: {
        resourcesBySlug: new Map(),
      },
    }
  }

  const result = await session.query<ResourceCatalogRow>(
    `
      SELECT
        id,
        slug,
        name,
        "isActive" AS "isActive"
      FROM resources
      WHERE slug = ANY($1::text[])
      ORDER BY slug ASC, id ASC
    `,
    [candidateResourceSlugs],
  )

  const rowsBySlug = new Map<string, ResourceCatalogRow[]>()
  for (const row of result.rows) {
    const current = rowsBySlug.get(row.slug) ?? []
    current.push(row)
    rowsBySlug.set(row.slug, current)
  }

  for (const resourceSlug of candidateResourceSlugs) {
    const rows = rowsBySlug.get(resourceSlug) ?? []
    if (rows.length === 0) {
      return buildResourceCatalogIssue(
        'RESOURCE_NOT_FOUND',
        resourceSlug,
        `No se encontro el recurso fisico ${resourceSlug}.`,
      )
    }

    if (rows.length > 1) {
      return buildResourceCatalogIssue(
        'RESOURCE_SLUG_DUPLICATED',
        resourceSlug,
        `El recurso fisico ${resourceSlug} aparece duplicado.`,
      )
    }

    if (!rows[0].isActive) {
      return buildResourceCatalogIssue(
        'RESOURCE_INACTIVE',
        resourceSlug,
        `El recurso fisico ${resourceSlug} esta inactivo.`,
      )
    }
  }

  const resourcesBySlug = new Map<string, ResourceCatalogRow>()
  for (const resourceSlug of candidateResourceSlugs) {
    const row = rowsBySlug.get(resourceSlug)?.[0]
    if (row) {
      resourcesBySlug.set(resourceSlug, row)
    }
  }

  return {
    ok: true,
    catalog: {
      resourcesBySlug,
    },
  }
}

async function lockResourceRows(
  session: CustomBundleSqlSession,
  resourceIds: readonly string[],
): Promise<void> {
  if (resourceIds.length === 0) {
    return
  }

  await session.query(
    `
      SELECT
        id
      FROM resources
      WHERE id = ANY($1::text[])
      ORDER BY id ASC
      FOR UPDATE
    `,
    [resourceIds],
  )
}

async function findCollidingResourceIds(
  session: CustomBundleSqlSession,
  resourceIds: readonly string[],
  requestedStartIso: string,
  requestedEndIso: string,
  excludeBookingRequestId: string | null,
): Promise<Set<string>> {
  if (resourceIds.length === 0) {
    return new Set()
  }

  const sql = `
    SELECT DISTINCT
      bri."resourceId" AS "resourceId"
    FROM "booking_request_items" bri
    INNER JOIN "booking_requests" br ON br.id = bri."bookingRequestId"
    WHERE bri."resourceId" = ANY($1::text[])
      AND br."eventDate" < $2::timestamptz
      AND (
        (br."eventEndDate" IS NOT NULL AND br."eventEndDate" > $3::timestamptz)
        OR (
          br."eventEndDate" IS NULL
          AND br."eventDate" >= $3::timestamptz
        )
      )
      AND (
        br."status" IN ('approved', 'confirmed')
        OR (
          br."status" = 'under_review'
          AND (
            COALESCE(br."internalNotes", '') LIKE '%[ops_status:payment_reported]%'
            OR EXISTS (
              SELECT 1
              FROM "payment_proofs" pp
              WHERE pp."bookingRequestId" = br.id
                AND pp."isActive" = TRUE
            )
          )
        )
      )
      ${excludeBookingRequestId ? 'AND br.id <> $4::text' : ''}
  `

  const values: unknown[] = [resourceIds, requestedEndIso, requestedStartIso]
  if (excludeBookingRequestId) {
    values.push(excludeBookingRequestId)
  }

  const result = await session.query<SqlCollisionRow>(sql, values)
  return new Set(result.rows.map((row) => row.resourceId))
}

function buildResourceAllocationPlan(
  requirements: Array<{
    itemSlug: string
    itemName: string
    serviceSlug: string
    startsAtIso: string
    endsAtIso: string
    candidateResourceSlugs: readonly string[]
  }>,
  catalog: ResourceCatalogResolution,
  collidingResourceIdsByRequirement: Array<Set<string>>,
): CustomBundleResourceAllocation[] {
  const allocations: CustomBundleResourceAllocation[] = []

  requirements.forEach((requirement, index) => {
    const collidingResourceIds = collidingResourceIdsByRequirement[index] ?? new Set<string>()
    const assignedResource = requirement.candidateResourceSlugs
      .map((resourceSlug) => catalog.resourcesBySlug.get(resourceSlug))
      .find((resource): resource is ResourceCatalogRow => {
        if (!resource) {
          return false
        }

        return !collidingResourceIds.has(resource.id)
      })

    if (!assignedResource) {
      return
    }

    allocations.push({
      itemSlug: requirement.itemSlug,
      itemName: requirement.itemName,
      serviceSlug: requirement.serviceSlug,
      startsAtIso: requirement.startsAtIso,
      endsAtIso: requirement.endsAtIso,
      candidateResourceSlugs: [...requirement.candidateResourceSlugs],
      assignedResource: {
        resourceId: assignedResource.id,
        resourceSlug: assignedResource.slug,
        resourceName: assignedResource.name,
      },
    })
  })

  return allocations
}

export async function checkCustomBundleResourceAvailabilityWithSql(
  session: CustomBundleSqlSession,
  input: CheckCustomBundleResourceAvailabilityInput,
): Promise<CheckCustomBundleResourceAvailabilityResult> {
  const planResult = planCustomBundleContinuousSchedule(input.submission)
  if (!planResult.ok) {
    if (planResult.stage === 'contract') {
      return {
        ok: false,
        stage: 'contract',
        contractIssues: planResult.contractIssues,
      }
    }

    if (planResult.stage === 'business_rules') {
      return {
        ok: false,
        stage: 'business_rules',
        businessIssues: planResult.businessIssues,
      }
    }

    return {
      ok: false,
      stage: 'schedule',
      scheduleIssues: planResult.scheduleIssues,
    }
  }

  if (session.transactionScope !== 'single_connection') {
    return buildServerContextIssue(
      'INVALID_SQL_SESSION',
      'La verificacion de recursos requiere una conexion SQL transaccional dedicada.',
    )
  }

  const normalizedExcludeBookingRequestId = normalizeExcludedBookingRequestId(
    input.excludeBookingRequestId,
  )
  if (
    typeof normalizedExcludeBookingRequestId === 'object' &&
    normalizedExcludeBookingRequestId !== null &&
    'stage' in normalizedExcludeBookingRequestId
  ) {
    return normalizedExcludeBookingRequestId
  }

  const requirementsResult = buildCustomBundleResourceRequirements(
    planResult.quote,
    planResult.schedule,
  )
  if (!requirementsResult.ok) {
    return {
      ok: false,
      stage: 'resource_policy',
      policyIssues: requirementsResult.issues,
    }
  }

  const requirements = requirementsResult.requirements
  const candidateResourceSlugs = collectCandidateResourceSlugs(requirements)

  let transactionStarted = false
  try {
    await session.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    transactionStarted = true

    const catalogResult = await resolveResourceCatalog(session, candidateResourceSlugs)
    if (!catalogResult.ok) {
      await rollbackSilently(session)
      transactionStarted = false
      return catalogResult
    }

    const candidateResourceIds = collectCandidateResourceIds(
      requirements,
      catalogResult.catalog.resourcesBySlug,
    )
    await lockResourceRows(session, candidateResourceIds)

    const collidingResourceIdsByRequirement: Array<Set<string>> = []

    for (const requirement of requirements) {
      const resourceIds = requirement.candidateResourceSlugs
        .map((resourceSlug) => catalogResult.catalog.resourcesBySlug.get(resourceSlug)?.id)
        .filter((resourceId): resourceId is string => Boolean(resourceId))

      const collidingResourceIds = await findCollidingResourceIds(
        session,
        resourceIds,
        requirement.startsAtIso,
        requirement.endsAtIso,
        normalizedExcludeBookingRequestId,
      )
      collidingResourceIdsByRequirement.push(collidingResourceIds)

      const assignedResource = requirement.candidateResourceSlugs
        .map((resourceSlug) => catalogResult.catalog.resourcesBySlug.get(resourceSlug))
        .find((resource): resource is ResourceCatalogRow => {
          if (!resource) {
            return false
          }

          return !collidingResourceIds.has(resource.id)
        })

      if (!assignedResource) {
        await rollbackSilently(session)
        transactionStarted = false
        return buildCollisionIssue(
          requirement.itemSlug,
          requirement.startsAtIso,
          requirement.endsAtIso,
          [...requirement.candidateResourceSlugs],
        )
      }
    }

    const allocations = buildResourceAllocationPlan(
      requirements,
      catalogResult.catalog,
      collidingResourceIdsByRequirement,
    )

    await rollbackSilently(session)
    transactionStarted = false

    return {
      ok: true,
      stage: 'available',
      plan: {
        quote: planResult.quote,
        schedule: planResult.schedule,
        allocations,
      },
    }
  } catch (error) {
    if (transactionStarted) {
      await rollbackSilently(session)
    }

    return buildDatabaseIssue(
      error instanceof Error
        ? 'No se pudo verificar la disponibilidad de recursos.'
        : 'No se pudo verificar la disponibilidad de recursos.',
    )
  }
}
