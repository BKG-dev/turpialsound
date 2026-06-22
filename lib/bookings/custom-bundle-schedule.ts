import { addMinutesToDate, parseCaracasLocalDateTime } from '@/lib/bookings/caracas-time'
import { orderTemporalComponents } from '@/lib/bookings/custom-bundle'
import {
  repriceCustomBundleSubmission,
  type CustomBundleAuthoritativeQuote,
} from '@/lib/bookings/custom-bundle-repricing'
import type {
  CustomBundleEstimateIssue,
  CustomBundleEstimateLine,
} from '@/lib/bookings/types'
import type {
  CustomBundleSubmissionContractIssue,
} from '@/lib/bookings/custom-bundle-submission'

export const CUSTOM_BUNDLE_SCHEDULE_MODE = 'continuous_sequential' as const
export const CUSTOM_BUNDLE_SCHEDULE_TIMEZONE = 'America/Caracas' as const
export const CUSTOM_BUNDLE_SCHEDULE_UTC_OFFSET = '-04:00' as const

export type CustomBundleScheduleExclusionReason =
  | 'included'
  | 'does_not_consume_calendar'
  | 'zero_duration'

export interface CustomBundleScheduleComponent {
  itemSlug: string
  itemName: string
  categorySlug: string
  scheduleOrder: number
  quantity: number
  sessionDurationMinutes: number | null
  durationMinutes: number
  startOffsetMinutes: number
  endOffsetMinutes: number
  startsAtIso: string
  endsAtIso: string
}

export interface CustomBundleScheduleExcludedLine {
  itemSlug: string
  itemName: string
  reason: CustomBundleScheduleExclusionReason
}

export interface CustomBundleContinuousSchedule {
  mode: typeof CUSTOM_BUNDLE_SCHEDULE_MODE
  timezone: typeof CUSTOM_BUNDLE_SCHEDULE_TIMEZONE
  utcOffset: typeof CUSTOM_BUNDLE_SCHEDULE_UTC_OFFSET
  eventDate: string
  startTime: string
  startsAtIso: string
  endsAtIso: string
  totalDurationMinutes: number
  components: CustomBundleScheduleComponent[]
  excludedLines: CustomBundleScheduleExcludedLine[]
}

export interface CustomBundleScheduleIssue {
  code:
    | 'INVALID_START_DATETIME'
    | 'NO_TEMPORAL_COMPONENTS'
    | 'INVALID_TEMPORAL_COMPONENT'
    | 'TOTAL_DURATION_MISMATCH'
    | 'NON_CONTIGUOUS_COMPONENTS'
  message: string
  itemSlug?: string
}

export type BuildCustomBundleContinuousScheduleResult =
  | {
      ok: true
      schedule: CustomBundleContinuousSchedule
    }
  | {
      ok: false
      issues: CustomBundleScheduleIssue[]
    }

export type PlanCustomBundleContinuousScheduleResult =
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
      ok: true
      stage: 'scheduled'
      quote: CustomBundleAuthoritativeQuote
      schedule: CustomBundleContinuousSchedule
    }

function makeScheduleIssue(
  code: CustomBundleScheduleIssue['code'],
  message: string,
  itemSlug?: string,
): CustomBundleScheduleIssue {
  return itemSlug ? { code, message, itemSlug } : { code, message }
}

function classifyQuoteLines(
  quote: CustomBundleAuthoritativeQuote,
): {
  temporalLines: CustomBundleEstimateLine[]
  excludedLines: CustomBundleScheduleExcludedLine[]
  issues: CustomBundleScheduleIssue[]
} {
  const temporalLines: CustomBundleEstimateLine[] = []
  const excludedLines: CustomBundleScheduleExcludedLine[] = []
  const issues: CustomBundleScheduleIssue[] = []

  for (const line of quote.estimate.lines) {
    if (line.isIncluded) {
      excludedLines.push({
        itemSlug: line.item.slug,
        itemName: line.item.name,
        reason: 'included',
      })
      continue
    }

    if (!line.item.consumesCalendar) {
      excludedLines.push({
        itemSlug: line.item.slug,
        itemName: line.item.name,
        reason: 'does_not_consume_calendar',
      })
      continue
    }

    if (line.durationMinutes <= 0) {
      excludedLines.push({
        itemSlug: line.item.slug,
        itemName: line.item.name,
        reason: 'zero_duration',
      })
      continue
    }

    if (typeof line.item.scheduleOrder !== 'number' || !Number.isFinite(line.item.scheduleOrder)) {
      issues.push(
        makeScheduleIssue(
          'INVALID_TEMPORAL_COMPONENT',
          `El componente ${line.item.slug} no tiene scheduleOrder canonico.`,
          line.item.slug,
        ),
      )
      continue
    }

    temporalLines.push(line)
  }

  return {
    temporalLines,
    excludedLines,
    issues,
  }
}

function buildScheduleComponents(
  startDateTime: Date,
  lines: CustomBundleEstimateLine[],
): {
  components: CustomBundleScheduleComponent[]
  issues: CustomBundleScheduleIssue[]
} {
  const components: CustomBundleScheduleComponent[] = []
  const issues: CustomBundleScheduleIssue[] = []
  let currentStart = new Date(startDateTime.getTime())
  let currentOffset = 0

  for (const line of lines) {
    const scheduleOrder = line.item.scheduleOrder
    if (typeof scheduleOrder !== 'number' || !Number.isFinite(scheduleOrder)) {
      issues.push(
        makeScheduleIssue(
          'INVALID_TEMPORAL_COMPONENT',
          `El componente ${line.item.slug} no tiene scheduleOrder canonico.`,
          line.item.slug,
        ),
      )
      continue
    }

    const componentEnd = addMinutesToDate(currentStart, line.durationMinutes)
    if (!componentEnd) {
      issues.push(
        makeScheduleIssue(
          'INVALID_TEMPORAL_COMPONENT',
          `El componente ${line.item.slug} no puede calcular su horario final.`,
          line.item.slug,
        ),
      )
      continue
    }

    const nextOffset = currentOffset + line.durationMinutes
    components.push({
      itemSlug: line.item.slug,
      itemName: line.item.name,
      categorySlug: line.item.categorySlug,
      scheduleOrder,
      quantity: line.quantity,
      sessionDurationMinutes: line.sessionDurationMinutes,
      durationMinutes: line.durationMinutes,
      startOffsetMinutes: currentOffset,
      endOffsetMinutes: nextOffset,
      startsAtIso: currentStart.toISOString(),
      endsAtIso: componentEnd.toISOString(),
    })

    currentStart = componentEnd
    currentOffset = nextOffset
  }

  for (let index = 1; index < components.length; index += 1) {
    const previous = components[index - 1]
    const current = components[index]
    if (
      previous.endOffsetMinutes !== current.startOffsetMinutes ||
      previous.endsAtIso !== current.startsAtIso
    ) {
      issues.push(
        makeScheduleIssue(
          'NON_CONTIGUOUS_COMPONENTS',
          'Los componentes temporales no forman un bloque continuo.',
          current.itemSlug,
        ),
      )
      break
    }
  }

  return {
    components,
    issues,
  }
}

export function buildCustomBundleContinuousSchedule(
  quote: CustomBundleAuthoritativeQuote,
): BuildCustomBundleContinuousScheduleResult {
  const startsAt = parseCaracasLocalDateTime(
    quote.submission.eventDate,
    quote.submission.startTime,
  )

  if (!startsAt) {
    return {
      ok: false,
      issues: [
        makeScheduleIssue(
          'INVALID_START_DATETIME',
          'No se pudo construir la fecha inicial del bloque en America/Caracas.',
        ),
      ],
    }
  }

  const { temporalLines, excludedLines, issues } = classifyQuoteLines(quote)

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  if (temporalLines.length === 0) {
    return {
      ok: false,
      issues: [
        makeScheduleIssue(
          'NO_TEMPORAL_COMPONENTS',
          'La solicitud no contiene componentes temporales.',
        ),
      ],
    }
  }

  const orderedTemporalLines = orderTemporalComponents(temporalLines)
  const scheduleComponents = buildScheduleComponents(startsAt, orderedTemporalLines)

  if (scheduleComponents.issues.length > 0) {
    return { ok: false, issues: scheduleComponents.issues }
  }

  const totalDurationMinutes = scheduleComponents.components.reduce(
    (total, component) => total + component.durationMinutes,
    0,
  )

  if (totalDurationMinutes !== quote.estimate.totalDurationMinutes) {
    return {
      ok: false,
      issues: [
        makeScheduleIssue(
          'TOTAL_DURATION_MISMATCH',
          'La duracion total no coincide con el estimate autoritativo.',
        ),
      ],
    }
  }

  const endsAt = addMinutesToDate(startsAt, totalDurationMinutes)
  if (!endsAt) {
    return {
      ok: false,
      issues: [
        makeScheduleIssue(
          'INVALID_START_DATETIME',
          'No se pudo calcular el final del bloque continuo.',
        ),
      ],
    }
  }

  return {
    ok: true,
    schedule: {
      mode: CUSTOM_BUNDLE_SCHEDULE_MODE,
      timezone: CUSTOM_BUNDLE_SCHEDULE_TIMEZONE,
      utcOffset: CUSTOM_BUNDLE_SCHEDULE_UTC_OFFSET,
      eventDate: quote.submission.eventDate,
      startTime: quote.submission.startTime,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      totalDurationMinutes,
      components: scheduleComponents.components,
      excludedLines,
    },
  }
}

export function planCustomBundleContinuousSchedule(
  input: unknown,
): PlanCustomBundleContinuousScheduleResult {
  const repricingResult = repriceCustomBundleSubmission(input)

  if (!repricingResult.ok) {
    if (repricingResult.stage === 'contract') {
      return {
        ok: false,
        stage: 'contract',
        contractIssues: repricingResult.contractIssues,
      }
    }

    return {
      ok: false,
      stage: 'business_rules',
      businessIssues: repricingResult.businessIssues,
    }
  }

  const scheduleResult = buildCustomBundleContinuousSchedule(repricingResult.quote)
  if (!scheduleResult.ok) {
    return {
      ok: false,
      stage: 'schedule',
      scheduleIssues: scheduleResult.issues,
    }
  }

  return {
    ok: true,
    stage: 'scheduled',
    quote: repricingResult.quote,
    schedule: scheduleResult.schedule,
  }
}
