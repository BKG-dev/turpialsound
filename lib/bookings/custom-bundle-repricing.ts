import { buildCustomBundleEstimate } from '@/lib/bookings/custom-bundle'
import {
  parseCustomBundleSubmissionInput,
  getCustomBundleServerIncludedItemSlugs,
  getCustomBundleSubmissionCatalogGaps,
  type CustomBundleServerIncludedItemSlug,
  type CustomBundleSubmissionContractIssue,
  type CustomBundleSubmissionInputV1,
  type CustomBundleSubmissionItemInputV1,
} from '@/lib/bookings/custom-bundle-submission'
import type {
  CustomBundleEstimate,
  CustomBundleEstimateIssue,
  CustomBundleSelection,
} from '@/lib/bookings/types'

export const CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE = 'server_catalog_v1' as const

export interface CustomBundleAuthoritativeQuote {
  pricingSource: typeof CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE
  submission: CustomBundleSubmissionInputV1
  estimate: CustomBundleEstimate
  catalogGaps: ReturnType<typeof getCustomBundleSubmissionCatalogGaps>
  persistenceReady: boolean
  serverIncludedItemSlugs: readonly CustomBundleServerIncludedItemSlug[]
}

export type CustomBundleAuthoritativeRepricingResult =
  | {
      ok: false
      stage: 'contract'
      contractIssues: CustomBundleSubmissionContractIssue[]
    }
  | {
      ok: false
      stage: 'business_rules'
      quote: CustomBundleAuthoritativeQuote
      businessIssues: CustomBundleEstimateIssue[]
    }
  | {
      ok: true
      stage: 'priced'
      quote: CustomBundleAuthoritativeQuote
    }

function cloneSubmission(submission: CustomBundleSubmissionInputV1): CustomBundleSubmissionInputV1 {
  return {
    ...submission,
    items: submission.items.map((item) => ({ ...item })),
    requester: { ...submission.requester },
  }
}

function mapSubmissionItemsToSelections(
  items: ReadonlyArray<CustomBundleSubmissionItemInputV1>,
): CustomBundleSelection[] {
  return items.map((item) => ({
    itemSlug: item.itemSlug,
    quantity: item.quantity,
    sessionDurationMinutes: item.sessionDurationMinutes,
  }))
}

export function buildCustomBundleAuthoritativeQuote(
  submission: CustomBundleSubmissionInputV1,
): CustomBundleAuthoritativeQuote {
  const clonedSubmission = cloneSubmission(submission)
  const selections = mapSubmissionItemsToSelections(clonedSubmission.items)
  const estimate = buildCustomBundleEstimate({
    selections,
    eventDate: clonedSubmission.eventDate,
  })
  const catalogGaps = getCustomBundleSubmissionCatalogGaps(clonedSubmission.items)
  const serverIncludedItemSlugs = [
    ...getCustomBundleServerIncludedItemSlugs(),
  ] as ReturnType<typeof getCustomBundleServerIncludedItemSlugs>

  return {
    pricingSource: CUSTOM_BUNDLE_AUTHORITATIVE_PRICING_SOURCE,
    submission: clonedSubmission,
    estimate,
    catalogGaps,
    persistenceReady: catalogGaps.length === 0,
    serverIncludedItemSlugs,
  }
}

export function repriceCustomBundleSubmission(
  input: unknown,
): CustomBundleAuthoritativeRepricingResult {
  const parsed = parseCustomBundleSubmissionInput(input)

  if (!parsed.ok) {
    return {
      ok: false,
      stage: 'contract',
      contractIssues: parsed.issues,
    }
  }

  const quote = buildCustomBundleAuthoritativeQuote(parsed.value)

  if (quote.estimate.isBlocked) {
    return {
      ok: false,
      stage: 'business_rules',
      quote,
      businessIssues: quote.estimate.blockingIssues,
    }
  }

  return {
    ok: true,
    stage: 'priced',
    quote,
  }
}
