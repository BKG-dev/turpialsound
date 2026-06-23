const CUSTOM_BUNDLE_OPERATIONAL_TAG_PATTERN = /\[ops_status:([A-Za-z_]+)\]/gi

export const CUSTOM_BUNDLE_OPERATIONAL_STATUSES = [
  'submitted',
  'pending_payment',
  'payment_reported',
  'payment_verified',
  'confirmed',
  'cancelled',
  'expired',
] as const

export type CustomBundleOperationalStatusTag =
  (typeof CUSTOM_BUNDLE_OPERATIONAL_STATUSES)[number]

export type CustomBundleHoldReplayOperationalState = 'pending_hold' | 'expired_hold'

const CUSTOM_BUNDLE_OPERATIONAL_STATUS_SET = new Set<string>(CUSTOM_BUNDLE_OPERATIONAL_STATUSES)

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

export function extractCustomBundleOperationalTags(
  internalNotes: string | null | undefined,
): string[] {
  const notes = typeof internalNotes === 'string' ? internalNotes : ''
  const tags: string[] = []
  let match: RegExpExecArray | null

  CUSTOM_BUNDLE_OPERATIONAL_TAG_PATTERN.lastIndex = 0
  while ((match = CUSTOM_BUNDLE_OPERATIONAL_TAG_PATTERN.exec(notes))) {
    tags.push(match[1].toLowerCase())
  }

  return tags
}

export function stripCustomBundleOperationalTags(
  internalNotes: string | null | undefined,
): string {
  const notes = typeof internalNotes === 'string' ? internalNotes : ''
  return notes.replace(/\s*\[ops_status:[^\]]+\]\s*/gi, ' ').replace(/\s+/g, ' ').trim()
}

export function setCustomBundleExpiredOperationalStatus(
  internalNotes: string | null | undefined,
): string {
  const preservedNotes = stripCustomBundleOperationalTags(internalNotes)
  return preservedNotes ? `[ops_status:expired]\n${preservedNotes}` : '[ops_status:expired]'
}

function isKnownOperationalStatusTag(value: string): value is CustomBundleOperationalStatusTag {
  return CUSTOM_BUNDLE_OPERATIONAL_STATUS_SET.has(value)
}

export function validateCustomBundleHoldReplayOperationalNotes(input: {
  status: string | null | undefined
  internalNotes: string | null | undefined
  holdExpiresAt: Date | null | undefined
  now: Date
}): {
  ok: true
  state: CustomBundleHoldReplayOperationalState
  tags: string[]
} | {
  ok: false
} {
  const holdExpiresAt = input.holdExpiresAt

  if (
    !isValidDate(input.now) ||
    !(holdExpiresAt instanceof Date && Number.isFinite(holdExpiresAt.getTime()))
  ) {
    return {
      ok: false,
    }
  }

  const tags = extractCustomBundleOperationalTags(input.internalNotes)
  if (!tags.every((tag) => isKnownOperationalStatusTag(tag))) {
    return {
      ok: false,
    }
  }

  if (input.status === 'under_review') {
    if (tags.length === 0) {
      return {
        ok: true,
        state: 'pending_hold',
        tags,
      }
    }

    if (tags.length === 1 && tags[0] === 'pending_payment') {
      return {
        ok: true,
        state: 'pending_hold',
        tags,
      }
    }

    return {
      ok: false,
    }
  }

  if (input.status === 'rejected') {
    if (tags.length === 1 && tags[0] === 'expired' && holdExpiresAt.getTime() <= input.now.getTime()) {
      return {
        ok: true,
        state: 'expired_hold',
        tags,
      }
    }

    return {
      ok: false,
    }
  }

  return {
    ok: false,
  }
}
