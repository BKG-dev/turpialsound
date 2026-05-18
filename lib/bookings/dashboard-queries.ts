import 'server-only'

import type { BookingStatus } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import {
  getOperationalStatus,
  getPaymentDeadline,
  type OperationalBookingStatus,
} from '@/lib/bookings/operations'

export type DashboardRangeKey = '7d' | '30d'

export interface DashboardRange {
  key: DashboardRangeKey
  from: Date
  to: Date
}

interface BookingLite {
  id: string
  publicCode: string
  requesterName: string
  status: BookingStatus
  internalNotes: string | null
  createdAt: Date
  eventDate: Date
  eventEndDate: Date | null
  estimatedTotal: unknown
  currency: string
  items: Array<{ resource: { id: string; name: string } | null; serviceVariant: { name: string; service: { name: string } } }>
  paymentProofs: Array<{ id: string; duplicateStatus: 'none' | 'same_booking' | 'other_booking'; isActive: boolean; uploadedAt: Date }>
}

export interface RevenueSnapshot {
  confirmedRevenueUsd: number
  pendingRevenueUsd: number
  activeHoldRevenueUsd: number
  paymentReportedToReviewCount: number
}

export interface StatusCounts {
  counts: Record<OperationalBookingStatus, number>
  total: number
}

export interface TodayBookingItem {
  id: string
  publicCode: string
  requesterName: string
  serviceName: string
  variantName: string
  resourceName: string | null
  eventDate: Date
  eventEndDate: Date | null
  operationalStatus: OperationalBookingStatus
}

export interface PaymentReviewQueueItem {
  id: string
  publicCode: string
  requesterName: string
  eventDate: Date
  eventEndDate: Date | null
  resourceName: string | null
  paymentProofId: string | null
  duplicateStatus: 'none' | 'same_booking' | 'other_booking' | null
}

export interface ResourceOccupancyItem {
  resourceId: string
  resourceName: string
  confirmedHours: number
  blockedPendingHours: number
  pendingReportedHours: number
  utilizationPct: number
}

export interface CriticalAlertItem {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
}

export interface RevenueHistoryPoint {
  dayLabel: string
  isoDate: string
  confirmedUsd: number
  pendingUsd: number
}

export interface AdminDashboardSnapshot {
  range: DashboardRange
  revenue: RevenueSnapshot
  statuses: StatusCounts
  todayBookings: TodayBookingItem[]
  paymentReviewQueue: PaymentReviewQueueItem[]
  occupancyByResource: ResourceOccupancyItem[]
  criticalAlerts: CriticalAlertItem[]
  revenueHistory: RevenueHistoryPoint[]
  upcomingWithoutConfirmedCount: number
  duplicateProofsCount: number
  overdueActiveHoldsCount: number
  bcvBadge: { label: string; tone: 'ok' | 'warning' | 'neutral' }
}

function parseAmount(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function computeHours(start: Date, end: Date | null): number {
  if (!end) return 1
  const ms = end.getTime() - start.getTime()
  if (ms <= 0) return 0
  return ms / (1000 * 60 * 60)
}

export function buildDashboardRange(key: string | null | undefined): DashboardRange {
  const now = new Date()
  const normalized: DashboardRangeKey = key === '30d' ? '30d' : '7d'
  const days = normalized === '30d' ? 30 : 7
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - (days - 1))
  const to = new Date(now)
  return { key: normalized, from, to }
}

async function fetchBookingsForRange(range: DashboardRange): Promise<BookingLite[]> {
  return prisma.bookingRequest.findMany({
    where: {
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    },
    select: {
      id: true,
      publicCode: true,
      requesterName: true,
      status: true,
      internalNotes: true,
      createdAt: true,
      eventDate: true,
      eventEndDate: true,
      estimatedTotal: true,
      currency: true,
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: {
          resource: { select: { id: true, name: true } },
          serviceVariant: { select: { name: true, service: { select: { name: true } } } },
        },
      },
      paymentProofs: {
        where: { isActive: true },
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          duplicateStatus: true,
          isActive: true,
          uploadedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1200,
  }) as Promise<BookingLite[]>
}

async function fetchTodayBookings(): Promise<TodayBookingItem[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const rows = await prisma.bookingRequest.findMany({
    where: {
      eventDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      publicCode: true,
      requesterName: true,
      status: true,
      internalNotes: true,
      createdAt: true,
      eventDate: true,
      eventEndDate: true,
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: {
          resource: { select: { name: true } },
          serviceVariant: { select: { name: true, service: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ eventDate: 'asc' }],
    take: 300,
  })

  return rows.map((row) => {
    const item = row.items[0]
    return {
      id: row.id,
      publicCode: row.publicCode,
      requesterName: row.requesterName,
      serviceName: item?.serviceVariant.service.name ?? 'Sin servicio',
      variantName: item?.serviceVariant.name ?? 'Sin modalidad',
      resourceName: item?.resource?.name ?? null,
      eventDate: row.eventDate,
      eventEndDate: row.eventEndDate,
      operationalStatus: getOperationalStatus(row),
    }
  })
}

function getStatusCounts(bookings: BookingLite[]): StatusCounts {
  const counts: Record<OperationalBookingStatus, number> = {
    submitted: 0,
    pending_payment: 0,
    payment_reported: 0,
    payment_verified: 0,
    confirmed: 0,
    cancelled: 0,
    expired: 0,
  }

  for (const booking of bookings) {
    counts[getOperationalStatus(booking)] += 1
  }

  return { counts, total: bookings.length }
}

function getRevenueSnapshot(bookings: BookingLite[]): RevenueSnapshot {
  let confirmedRevenueUsd = 0
  let pendingRevenueUsd = 0
  let activeHoldRevenueUsd = 0
  let paymentReportedToReviewCount = 0

  for (const booking of bookings) {
    const status = getOperationalStatus(booking)
    const amount = booking.currency?.toUpperCase() === 'USD' ? parseAmount(booking.estimatedTotal) : 0

    if (status === 'confirmed') {
      confirmedRevenueUsd += amount
    }

    if (status === 'pending_payment' || status === 'payment_reported') {
      pendingRevenueUsd += amount
    }

    if (status === 'pending_payment' && getPaymentDeadline(booking.createdAt).getTime() > Date.now()) {
      activeHoldRevenueUsd += amount
    }

    if (status === 'payment_reported') {
      paymentReportedToReviewCount += 1
    }
  }

  return {
    confirmedRevenueUsd,
    pendingRevenueUsd,
    activeHoldRevenueUsd,
    paymentReportedToReviewCount,
  }
}

function getPaymentReviewQueue(bookings: BookingLite[]): PaymentReviewQueueItem[] {
  return bookings
    .filter((booking) => getOperationalStatus(booking) === 'payment_reported')
    .map((booking) => {
      const latestProof = booking.paymentProofs[0] ?? null
      return {
        id: booking.id,
        publicCode: booking.publicCode,
        requesterName: booking.requesterName,
        eventDate: booking.eventDate,
        eventEndDate: booking.eventEndDate,
        resourceName: booking.items[0]?.resource?.name ?? null,
        paymentProofId: latestProof?.id ?? null,
        duplicateStatus: latestProof?.duplicateStatus ?? null,
      }
    })
}

function getOccupancyByResource(bookings: BookingLite[]): ResourceOccupancyItem[] {
  const byResource = new Map<string, ResourceOccupancyItem>()

  for (const booking of bookings) {
    const resource = booking.items[0]?.resource
    if (!resource) continue

    const hours = computeHours(booking.eventDate, booking.eventEndDate)
    const status = getOperationalStatus(booking)

    if (!byResource.has(resource.id)) {
      byResource.set(resource.id, {
        resourceId: resource.id,
        resourceName: resource.name,
        confirmedHours: 0,
        blockedPendingHours: 0,
        pendingReportedHours: 0,
        utilizationPct: 0,
      })
    }

    const row = byResource.get(resource.id)
    if (!row) continue

    if (status === 'confirmed') row.confirmedHours += hours
    if (status === 'pending_payment') row.blockedPendingHours += hours
    if (status === 'payment_reported') row.pendingReportedHours += hours
  }

  const totalRangeDays = 7
  const baselineHours = totalRangeDays * 12

  for (const row of byResource.values()) {
    const used = row.confirmedHours + row.blockedPendingHours + row.pendingReportedHours
    row.utilizationPct = baselineHours > 0 ? Math.min(100, (used / baselineHours) * 100) : 0
  }

  return Array.from(byResource.values()).sort((a, b) => a.resourceName.localeCompare(b.resourceName))
}

function getRevenueHistory(bookings: BookingLite[], days: number): RevenueHistoryPoint[] {
  const map = new Map<string, RevenueHistoryPoint>()
  const now = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const key = day.toISOString().slice(0, 10)
    map.set(key, {
      dayLabel: key.slice(5),
      isoDate: key,
      confirmedUsd: 0,
      pendingUsd: 0,
    })
  }

  for (const booking of bookings) {
    const key = booking.createdAt.toISOString().slice(0, 10)
    const point = map.get(key)
    if (!point) continue

    const amount = booking.currency?.toUpperCase() === 'USD' ? parseAmount(booking.estimatedTotal) : 0
    const status = getOperationalStatus(booking)
    if (status === 'confirmed') point.confirmedUsd += amount
    if (status === 'pending_payment' || status === 'payment_reported') point.pendingUsd += amount
  }

  return Array.from(map.values())
}

async function getBcvBadge(): Promise<{ label: string; tone: 'ok' | 'warning' | 'neutral' }> {
  const latest = await prisma.auditLog.findFirst({
    where: { bookingRequestId: null, action: 'reference_rate.last_good_consensus' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, nextState: true },
  })

  if (!latest) return { label: 'BCV: no disponible', tone: 'neutral' }

  const asOfRaw =
    latest.nextState && typeof latest.nextState === 'object'
      ? (latest.nextState as Record<string, unknown>).asOf
      : null
  const asOf = typeof asOfRaw === 'string' ? new Date(asOfRaw) : latest.createdAt
  const ageHours = (Date.now() - asOf.getTime()) / (1000 * 60 * 60)

  if (!Number.isFinite(ageHours)) return { label: 'BCV: estado no disponible', tone: 'neutral' }
  if (ageHours > 24) return { label: 'BCV: stale', tone: 'warning' }
  return { label: 'BCV: reciente', tone: 'ok' }
}

function getCriticalAlerts(input: {
  paymentReviewQueueCount: number
  duplicateProofsCount: number
  overdueActiveHoldsCount: number
  upcomingWithoutConfirmedCount: number
  bcvBadge: { label: string; tone: 'ok' | 'warning' | 'neutral' }
}): CriticalAlertItem[] {
  const alerts: CriticalAlertItem[] = []

  if (input.paymentReviewQueueCount > 0) {
    alerts.push({
      id: 'payments_review',
      severity: 'high',
      title: 'Pagos por revisar',
      description: 'Reservas con pago reportado esperando validacion humana.',
      count: input.paymentReviewQueueCount,
    })
  }

  if (input.overdueActiveHoldsCount > 0) {
    alerts.push({
      id: 'overdue_holds',
      severity: 'high',
      title: 'Hold vencido sin liberar',
      description: 'Reservas bajo revision fuera de ventana y sin comprobante activo.',
      count: input.overdueActiveHoldsCount,
    })
  }

  if (input.duplicateProofsCount > 0) {
    alerts.push({
      id: 'duplicate_proofs',
      severity: 'medium',
      title: 'Comprobantes duplicados',
      description: 'Hay comprobantes marcados como same_booking u other_booking.',
      count: input.duplicateProofsCount,
    })
  }

  if (input.upcomingWithoutConfirmedCount > 0) {
    alerts.push({
      id: 'upcoming_unconfirmed',
      severity: 'medium',
      title: 'Proximas sin pago confirmado',
      description: 'Eventos proximos que aun no estan confirmados.',
      count: input.upcomingWithoutConfirmedCount,
    })
  }

  if (input.bcvBadge.tone === 'warning') {
    alerts.push({
      id: 'bcv_stale',
      severity: 'low',
      title: 'BCV stale',
      description: 'La referencia BCV guardada tiene mas de 24h.',
      count: 1,
    })
  }

  return alerts
}

export async function getAdminDashboardSnapshot(range: DashboardRange): Promise<AdminDashboardSnapshot> {
  const [rangeBookings, todayBookings, bcvBadge] = await Promise.all([
    fetchBookingsForRange(range),
    fetchTodayBookings(),
    getBcvBadge(),
  ])

  const statuses = getStatusCounts(rangeBookings)
  const revenue = getRevenueSnapshot(rangeBookings)
  const paymentReviewQueue = getPaymentReviewQueue(rangeBookings)
  const occupancyByResource = getOccupancyByResource(rangeBookings)
  const revenueHistory = getRevenueHistory(rangeBookings, range.key === '30d' ? 30 : 7)

  const now = new Date()
  const upcomingWithoutConfirmedCount = rangeBookings.filter((booking) => {
    const status = getOperationalStatus(booking)
    return booking.eventDate >= now && status !== 'confirmed'
  }).length

  const duplicateProofsCount = rangeBookings.filter((booking) => {
    const latest = booking.paymentProofs[0]
    return latest && latest.duplicateStatus !== 'none'
  }).length

  const overdueActiveHoldsCount = rangeBookings.filter((booking) => {
    if (booking.status !== 'under_review') return false
    const hasProof = booking.paymentProofs.some((proof) => proof.isActive)
    if (hasProof) return false
    return getPaymentDeadline(booking.createdAt).getTime() <= Date.now()
  }).length

  const criticalAlerts = getCriticalAlerts({
    paymentReviewQueueCount: paymentReviewQueue.length,
    duplicateProofsCount,
    overdueActiveHoldsCount,
    upcomingWithoutConfirmedCount,
    bcvBadge,
  })

  return {
    range,
    revenue,
    statuses,
    todayBookings,
    paymentReviewQueue,
    occupancyByResource,
    criticalAlerts,
    revenueHistory,
    upcomingWithoutConfirmedCount,
    duplicateProofsCount,
    overdueActiveHoldsCount,
    bcvBadge,
  }
}
