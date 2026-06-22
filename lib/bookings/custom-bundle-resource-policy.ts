import { orderTemporalComponents } from '@/lib/bookings/custom-bundle'
import type { CustomBundleAuthoritativeQuote } from '@/lib/bookings/custom-bundle-repricing'
import {
  getCustomBundlePersistenceTarget,
  type CustomBundlePersistenceTarget,
} from '@/lib/bookings/custom-bundle-submission'
import type {
  CustomBundleContinuousSchedule,
  CustomBundleScheduleComponent,
} from '@/lib/bookings/custom-bundle-schedule'

export const CUSTOM_BUNDLE_CANONICAL_RESOURCE_SLUGS = [
  'sala-1-grande',
  'sala-2-podcast-locucion',
  'sala-3-ensayo',
] as const

export type CustomBundleCanonicalResourceSlug =
  (typeof CUSTOM_BUNDLE_CANONICAL_RESOURCE_SLUGS)[number]

const CUSTOM_BUNDLE_RESOURCE_POLICY_BY_SERVICE = {
  'sala-ensayo': ['sala-3-ensayo', 'sala-1-grande'],
  grabacion: ['sala-1-grande'],
  'podcast-locucion': ['sala-2-podcast-locucion'],
} as const satisfies Record<string, readonly CustomBundleCanonicalResourceSlug[]>

export interface CustomBundleResourceRequirement {
  itemSlug: string
  itemName: string
  serviceSlug: string
  startsAtIso: string
  endsAtIso: string
  startOffsetMinutes: number
  endOffsetMinutes: number
  candidateResourceSlugs: readonly CustomBundleCanonicalResourceSlug[]
}

export interface CustomBundleResourcePolicyIssue {
  code:
    | 'RESOURCE_POLICY_MISSING'
    | 'PERSISTENCE_TARGET_MISSING'
    | 'TEMPORAL_ITEM_NOT_SERVICE_VARIANT'
    | 'INVALID_RESOURCE_INTERVAL'
  message: string
  itemSlug: string
  serviceSlug?: string
}

type ResourceRequirementsResult =
  | {
      ok: true
      requirements: CustomBundleResourceRequirement[]
    }
  | {
      ok: false
      issues: CustomBundleResourcePolicyIssue[]
    }

function makePolicyIssue(
  code: CustomBundleResourcePolicyIssue['code'],
  message: string,
  itemSlug: string,
  serviceSlug?: string,
): CustomBundleResourcePolicyIssue {
  return serviceSlug ? { code, message, itemSlug, serviceSlug } : { code, message, itemSlug }
}

function getResourcePolicy(serviceSlug: string): readonly CustomBundleCanonicalResourceSlug[] | null {
  return CUSTOM_BUNDLE_RESOURCE_POLICY_BY_SERVICE[
    serviceSlug as keyof typeof CUSTOM_BUNDLE_RESOURCE_POLICY_BY_SERVICE
  ] ?? null
}

function isValidResourceInterval(
  component: CustomBundleScheduleComponent,
  quoteLineDurationMinutes: number | null,
  quoteLineSessionDurationMinutes: number | null,
): boolean {
  const start = new Date(component.startsAtIso)
  const end = new Date(component.endsAtIso)

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return false
  }

  if (end.getTime() <= start.getTime()) {
    return false
  }

  if (
    !Number.isFinite(component.startOffsetMinutes) ||
    !Number.isFinite(component.endOffsetMinutes) ||
    component.startOffsetMinutes < 0 ||
    component.endOffsetMinutes <= component.startOffsetMinutes
  ) {
    return false
  }

  if (component.endOffsetMinutes - component.startOffsetMinutes !== component.durationMinutes) {
    return false
  }

  if (quoteLineDurationMinutes !== component.durationMinutes) {
    return false
  }

  if (quoteLineSessionDurationMinutes !== component.sessionDurationMinutes) {
    return false
  }

  return true
}

function getQuoteLineBySlug(
  quote: CustomBundleAuthoritativeQuote,
  itemSlug: string,
): { durationMinutes: number; sessionDurationMinutes: number | null } | null {
  const line = quote.estimate.lines.find((quoteLine) => quoteLine.item.slug === itemSlug)
  if (!line) {
    return null
  }

  return {
    durationMinutes: line.durationMinutes,
    sessionDurationMinutes: line.sessionDurationMinutes,
  }
}

export function buildCustomBundleResourceRequirements(
  quote: CustomBundleAuthoritativeQuote,
  schedule: CustomBundleContinuousSchedule,
): ResourceRequirementsResult {
  const requirements: CustomBundleResourceRequirement[] = []
  const issues: CustomBundleResourcePolicyIssue[] = []

  for (const component of schedule.components) {
    const quoteLine = getQuoteLineBySlug(quote, component.itemSlug)
    if (!quoteLine) {
      issues.push(
        makePolicyIssue(
          'INVALID_RESOURCE_INTERVAL',
          `El componente ${component.itemSlug} no existe en el quote autoritativo.`,
          component.itemSlug,
        ),
      )
      continue
    }

    const persistenceTarget = getCustomBundlePersistenceTarget(component.itemSlug)
    if (!persistenceTarget) {
      issues.push(
        makePolicyIssue(
          'PERSISTENCE_TARGET_MISSING',
          `No se encontro una estrategia de persistencia para ${component.itemSlug}.`,
          component.itemSlug,
        ),
      )
      continue
    }

    if (persistenceTarget.kind !== 'service_variant') {
      issues.push(
        makePolicyIssue(
          'TEMPORAL_ITEM_NOT_SERVICE_VARIANT',
          `El componente ${component.itemSlug} debe resolver una ServiceVariant persistible.`,
          component.itemSlug,
          undefined,
        ),
      )
      continue
    }

    const candidateResourceSlugs = getResourcePolicy(persistenceTarget.serviceSlug)
    if (!candidateResourceSlugs) {
      issues.push(
        makePolicyIssue(
          'RESOURCE_POLICY_MISSING',
          `No existe una politica de recursos fisicos para ${persistenceTarget.serviceSlug}.`,
          component.itemSlug,
          persistenceTarget.serviceSlug,
        ),
      )
      continue
    }

    if (
      !isValidResourceInterval(
        component,
        quoteLine.durationMinutes,
        quoteLine.sessionDurationMinutes,
      )
    ) {
      issues.push(
        makePolicyIssue(
          'INVALID_RESOURCE_INTERVAL',
          `El componente ${component.itemSlug} no tiene un intervalo de recursos valido.`,
          component.itemSlug,
          persistenceTarget.serviceSlug,
        ),
      )
      continue
    }

    requirements.push({
      itemSlug: component.itemSlug,
      itemName: component.itemName,
      serviceSlug: persistenceTarget.serviceSlug,
      startsAtIso: component.startsAtIso,
      endsAtIso: component.endsAtIso,
      startOffsetMinutes: component.startOffsetMinutes,
      endOffsetMinutes: component.endOffsetMinutes,
      candidateResourceSlugs: [...candidateResourceSlugs],
    })
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return {
    ok: true,
    requirements,
  }
}

export function getCustomBundleResourcePolicyCandidates(
  serviceSlug: string,
): readonly CustomBundleCanonicalResourceSlug[] | null {
  const policy = getResourcePolicy(serviceSlug)
  return policy ? [...policy] : null
}

export function getCustomBundleTemporalResourceOrder(
  lines: Parameters<typeof orderTemporalComponents>[0],
): ReturnType<typeof orderTemporalComponents> {
  return orderTemporalComponents(lines)
}

export type { CustomBundlePersistenceTarget }
