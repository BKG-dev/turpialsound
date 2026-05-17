import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOperationalStatus, type OperationalBookingStatus } from '@/lib/bookings/operations'

export const dynamic = 'force-dynamic'

const SLOT_START_TIMES: string[] = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

const CARACAS_UTC_OFFSET_MINUTES = -4 * 60
const STRONG_BLOCKING_OPERATIONAL_STATUSES = new Set<OperationalBookingStatus>([
  'payment_reported',
  'payment_verified',
  'confirmed',
])

type ManagedServiceSlug = 'grabacion' | 'podcast-locucion' | 'sala-ensayo'
type ResourceSlug = 'sala-1-grande' | 'sala-2-podcast-locucion' | 'sala-3-ensayo'
type SlotState =
  | 'available'
  | 'pending_payment'
  | 'payment_reported'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'past'

interface SlotResourceSnapshot {
  strong: boolean
  weak: boolean
  observedOperationalStatuses: Set<OperationalBookingStatus>
}

const CANONICAL_RESOURCE_ORDER: ResourceSlug[] = [
  'sala-1-grande',
  'sala-2-podcast-locucion',
  'sala-3-ensayo',
]

const CANONICAL_RESOURCE_NAMES: Record<ResourceSlug, string> = {
  'sala-1-grande': 'Sala 1 Grande',
  'sala-2-podcast-locucion': 'Sala 2 Podcast / Locucion',
  'sala-3-ensayo': 'Sala 3 Ensayo',
}

const RESOURCE_ALIAS_FALLBACK: Partial<Record<ResourceSlug, string[]>> = {
  'sala-1-grande': ['estudio-grabacion', 'estudio de grabacion'],
  'sala-2-podcast-locucion': ['booth-voz', 'booth de voz'],
  'sala-3-ensayo': ['sala-ensayo-a', 'sala ensayo a'],
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function isManagedServiceSlug(serviceSlug: string): serviceSlug is ManagedServiceSlug {
  return serviceSlug === 'grabacion' || serviceSlug === 'podcast-locucion' || serviceSlug === 'sala-ensayo'
}

function getResourcePriorityByService(serviceSlug: ManagedServiceSlug): ResourceSlug[] {
  if (serviceSlug === 'grabacion') {
    return ['sala-1-grande']
  }

  if (serviceSlug === 'podcast-locucion') {
    return ['sala-2-podcast-locucion']
  }

  return ['sala-3-ensayo', 'sala-1-grande']
}

function buildCaracasDateTime(date: string, time: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN)
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return new Date(Number.NaN)
  }

  const caracasEpochMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    CARACAS_UTC_OFFSET_MINUTES * 60 * 1000

  return new Date(caracasEpochMs)
}

function getCaracasDateStart(date: string): Date {
  return buildCaracasDateTime(date, '00:00')
}

function overlapsRange(
  bookingStart: Date,
  bookingEnd: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  if (!bookingEnd) {
    return bookingStart < rangeEnd
  }

  return bookingStart < rangeEnd && bookingEnd > rangeStart
}

function classifyStrongState(statuses: Set<OperationalBookingStatus>): SlotState {
  if (statuses.has('confirmed')) {
    return 'confirmed'
  }

  return 'payment_reported'
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? ''
  const variantSlug = request.nextUrl.searchParams.get('variantSlug')?.trim() ?? ''
  const serviceSlugFromQuery = request.nextUrl.searchParams.get('serviceSlug')?.trim() ?? ''

  if (!date) {
    return NextResponse.json({ ok: false, error: 'date_required' }, { status: 400 })
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(date)) {
    return NextResponse.json({ ok: false, error: 'invalid_date' }, { status: 400 })
  }

  let effectiveServiceSlug = serviceSlugFromQuery
  if (variantSlug) {
    const variant = await prisma.serviceVariant.findUnique({
      where: { slug: variantSlug },
      select: {
        slug: true,
        service: {
          select: {
            slug: true,
          },
        },
      },
    })

    if (!variant) {
      return NextResponse.json({ ok: false, error: 'variant_not_found' }, { status: 404 })
    }

    effectiveServiceSlug = variant.service.slug
  }

  if (!effectiveServiceSlug) {
    return NextResponse.json(
      { ok: false, error: 'service_slug_or_variant_slug_required' },
      { status: 400 },
    )
  }

  const slotStarts = SLOT_START_TIMES.map((time) => ({
    time,
    start: buildCaracasDateTime(date, time),
  }))

  if (slotStarts.some((slot) => Number.isNaN(slot.start.getTime()))) {
    return NextResponse.json({ ok: false, error: 'invalid_slot_time' }, { status: 400 })
  }

  const now = new Date()
  const dayStart = getCaracasDateStart(date)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const isManagedService = isManagedServiceSlug(effectiveServiceSlug)

  let candidateResourceIds: string[] = []
  if (isManagedService) {
    const managedServiceSlug = effectiveServiceSlug as ManagedServiceSlug
    const activeResources = await prisma.resource.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    })

    const bySlug = new Map(activeResources.map((resource) => [normalizeText(resource.slug), resource.id]))
    const byName = new Map(activeResources.map((resource) => [normalizeText(resource.name), resource.id]))
    const resourcesByCanonicalSlug: Record<ResourceSlug, string | null> = {
      'sala-1-grande': null,
      'sala-2-podcast-locucion': null,
      'sala-3-ensayo': null,
    }

    for (const canonicalSlug of CANONICAL_RESOURCE_ORDER) {
      const canonicalId = bySlug.get(normalizeText(canonicalSlug))
      if (canonicalId) {
        resourcesByCanonicalSlug[canonicalSlug] = canonicalId
        continue
      }

      const canonicalNameId = byName.get(normalizeText(CANONICAL_RESOURCE_NAMES[canonicalSlug]))
      if (canonicalNameId) {
        resourcesByCanonicalSlug[canonicalSlug] = canonicalNameId
        continue
      }

      const aliases = RESOURCE_ALIAS_FALLBACK[canonicalSlug] ?? []
      const fallbackId =
        aliases
          .map((alias) => bySlug.get(normalizeText(alias)) ?? byName.get(normalizeText(alias)))
          .find((value) => Boolean(value)) ?? null
      resourcesByCanonicalSlug[canonicalSlug] = fallbackId
    }

    candidateResourceIds = getResourcePriorityByService(managedServiceSlug)
      .map((canonicalSlug) => resourcesByCanonicalSlug[canonicalSlug])
      .filter((resourceId): resourceId is string => Boolean(resourceId))

    if (candidateResourceIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'managed_resources_not_available',
          slots: slotStarts.map((slot) => ({
            time: slot.time,
            state: 'confirmed' as SlotState,
            isSelectable: false,
            isStrongBlocked: true,
            observedOperationalStatuses: [] as OperationalBookingStatus[],
          })),
        },
        { status: 409 },
      )
    }
  }

  const overlappingBookings = isManagedService
    ? await prisma.bookingRequest.findMany({
        where: {
          eventDate: { lt: dayEnd },
          AND: [{ eventEndDate: { gt: dayStart } }],
          status: { in: ['under_review', 'approved', 'confirmed', 'rejected'] },
          items: {
            some: {
              resourceId: { in: candidateResourceIds },
            },
          },
        },
        select: {
          id: true,
          status: true,
          internalNotes: true,
          createdAt: true,
          eventDate: true,
          eventEndDate: true,
          items: {
            select: {
              resourceId: true,
            },
          },
          paymentProofs: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      })
    : []

  const slots = slotStarts.map((slot) => {
    const slotEnd = new Date(slot.start.getTime() + 60 * 60 * 1000)
    const isPast = slot.start.getTime() <= now.getTime()

    if (isPast) {
      return {
        time: slot.time,
        state: 'past' as SlotState,
        isSelectable: false,
        isStrongBlocked: true,
        observedOperationalStatuses: [] as OperationalBookingStatus[],
      }
    }

    if (!isManagedService || candidateResourceIds.length === 0) {
      return {
        time: slot.time,
        state: 'available' as SlotState,
        isSelectable: true,
        isStrongBlocked: false,
        observedOperationalStatuses: [] as OperationalBookingStatus[],
      }
    }

    const resourceSnapshots = new Map<string, SlotResourceSnapshot>()
    for (const resourceId of candidateResourceIds) {
      resourceSnapshots.set(resourceId, {
        strong: false,
        weak: false,
        observedOperationalStatuses: new Set(),
      })
    }

    for (const booking of overlappingBookings) {
      if (!overlapsRange(booking.eventDate, booking.eventEndDate, slot.start, slotEnd)) {
        continue
      }

      const operationalStatus = getOperationalStatus({
        status: booking.status,
        internalNotes: booking.internalNotes,
        createdAt: booking.createdAt,
      })

      for (const item of booking.items) {
        if (!item.resourceId || !resourceSnapshots.has(item.resourceId)) {
          continue
        }

        const snapshot = resourceSnapshots.get(item.resourceId)
        if (!snapshot) continue
        snapshot.observedOperationalStatuses.add(operationalStatus)

        if (STRONG_BLOCKING_OPERATIONAL_STATUSES.has(operationalStatus)) {
          snapshot.strong = true
          continue
        }

        if (
          operationalStatus === 'pending_payment' ||
          (operationalStatus === 'payment_reported' && booking.paymentProofs.length > 0)
        ) {
          snapshot.weak = true
        }
      }
    }

    let hasFreeResource = false
    let hasWeakCandidate = false
    const slotStrongStatuses = new Set<OperationalBookingStatus>()
    const observedOperationalStatuses = new Set<OperationalBookingStatus>()

    for (const snapshot of resourceSnapshots.values()) {
      for (const observedStatus of snapshot.observedOperationalStatuses) {
        observedOperationalStatuses.add(observedStatus)
      }

      if (!snapshot.strong && !snapshot.weak) {
        hasFreeResource = true
      } else if (!snapshot.strong && snapshot.weak) {
        hasWeakCandidate = true
      }

      if (snapshot.strong) {
        for (const observedStatus of snapshot.observedOperationalStatuses) {
          if (STRONG_BLOCKING_OPERATIONAL_STATUSES.has(observedStatus)) {
            slotStrongStatuses.add(observedStatus)
          }
        }
      }
    }

    if (hasFreeResource) {
      return {
        time: slot.time,
        state: 'available' as SlotState,
        isSelectable: true,
        isStrongBlocked: false,
        observedOperationalStatuses: Array.from(observedOperationalStatuses),
      }
    }

    if (hasWeakCandidate) {
      return {
        time: slot.time,
        state: 'pending_payment' as SlotState,
        isSelectable: true,
        isStrongBlocked: false,
        observedOperationalStatuses: Array.from(observedOperationalStatuses),
      }
    }

    return {
      time: slot.time,
      state: classifyStrongState(slotStrongStatuses),
      isSelectable: false,
      isStrongBlocked: true,
      observedOperationalStatuses: Array.from(observedOperationalStatuses),
    }
  })

  return NextResponse.json({
    ok: true,
    date,
    serviceSlug: effectiveServiceSlug,
    timezone: 'America/Caracas',
    slotMinutes: 60,
    policy: 'pay_first',
    slots,
  })
}
