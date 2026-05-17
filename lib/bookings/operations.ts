import type { BookingStatus } from '@/generated/prisma/client'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import { sendBookingNotifications } from '@/lib/bookings/notifications'
import { getPaymentWindowMinutes } from '@/lib/bookings/payment-settings'
import { sendBookingWhatsapp } from '@/lib/whatsapp/booking-notifications'
import { prisma } from '@/lib/db'

export type OperationalBookingStatus =
  | 'submitted'
  | 'pending_payment'
  | 'payment_reported'
  | 'payment_verified'
  | 'confirmed'
  | 'cancelled'
  | 'expired'

export const OPERATIONAL_BOOKING_STATUSES: OperationalBookingStatus[] = [
  'submitted',
  'pending_payment',
  'payment_reported',
  'payment_verified',
  'confirmed',
  'cancelled',
  'expired',
]

export const OPERATIONAL_STATUS_LABELS: Record<OperationalBookingStatus, string> = {
  submitted: 'Enviada',
  pending_payment: 'Pendiente de pago',
  payment_reported: 'Pago reportado',
  payment_verified: 'Pago verificado',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
}

const OPERATIONAL_STATUS_PATTERN =
  /\[ops_status:(submitted|pending_payment|payment_reported|payment_verified|confirmed|cancelled|expired)\]/i

export const PAYMENT_WINDOW_MINUTES = getPaymentWindowMinutes()

export interface ExpireOverduePendingPaymentsResult {
  scanned: number
  expired: number
  skipped: number
  calendarSynced: number
  calendarFailed: number
}

interface JsonObject {
  [key: string]: unknown
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function resolvePaymentReportedAt(input: {
  paymentReportAuditState?: unknown
  paymentProofUploadedAt?: Date | null
}): Date | null {
  const auditState =
    input.paymentReportAuditState && typeof input.paymentReportAuditState === 'object'
      ? (input.paymentReportAuditState as JsonObject)
      : null
  const rawFromAudit = auditState?.paymentReportedAt
  const fromAudit =
    typeof rawFromAudit === 'string' && rawFromAudit.trim()
      ? new Date(rawFromAudit)
      : null

  if (fromAudit && !Number.isNaN(fromAudit.getTime())) {
    return fromAudit
  }

  if (input.paymentProofUploadedAt && !Number.isNaN(input.paymentProofUploadedAt.getTime())) {
    return input.paymentProofUploadedAt
  }

  return null
}

export function isPaymentReportedWithinWindow(input: {
  createdAt: Date
  paymentReportedAt: Date | null
}): boolean {
  if (!input.paymentReportedAt) {
    return false
  }

  return input.paymentReportedAt.getTime() <= getPaymentDeadline(input.createdAt).getTime()
}

export function getPaymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000)
}

export function isPaymentWindowExpired(createdAt: Date, referenceDate = new Date()): boolean {
  return getPaymentDeadline(createdAt).getTime() <= referenceDate.getTime()
}

export function isOperationalBookingStatus(value: string): value is OperationalBookingStatus {
  return OPERATIONAL_BOOKING_STATUSES.includes(value as OperationalBookingStatus)
}

export function getOperationalStatusFromInternalNotes(
  internalNotes: string | null | undefined,
): OperationalBookingStatus | null {
  if (!internalNotes) {
    return null
  }

  const match = internalNotes.match(OPERATIONAL_STATUS_PATTERN)
  if (!match) {
    return null
  }

  const candidate = match[1].toLowerCase()
  return isOperationalBookingStatus(candidate) ? candidate : null
}

export function inferOperationalStatusFromBookingStatus(
  booking: {
    status: BookingStatus
    createdAt?: Date
  },
): OperationalBookingStatus {
  switch (booking.status) {
    case 'under_review':
      if (booking.createdAt && isPaymentWindowExpired(booking.createdAt)) {
        return 'expired'
      }
      return 'pending_payment'
    case 'approved':
      return 'payment_verified'
    case 'confirmed':
      return 'confirmed'
    case 'rejected':
      return 'cancelled'
    default:
      return 'submitted'
  }
}

export function getOperationalStatus(
  booking: {
    status: BookingStatus
    internalNotes?: string | null
    createdAt?: Date
  },
): OperationalBookingStatus {
  const taggedStatus = getOperationalStatusFromInternalNotes(booking.internalNotes)
  if (taggedStatus) {
    if (
      taggedStatus === 'pending_payment' &&
      booking.createdAt &&
      isPaymentWindowExpired(booking.createdAt)
    ) {
      return 'expired'
    }

    return taggedStatus
  }

  return inferOperationalStatusFromBookingStatus(booking)
}

export function mapOperationalStatusToBookingStatus(
  status: OperationalBookingStatus,
): BookingStatus {
  switch (status) {
    case 'pending_payment':
    case 'payment_reported':
      return 'under_review'
    case 'payment_verified':
      return 'approved'
    case 'confirmed':
      return 'confirmed'
    case 'cancelled':
      return 'rejected'
    case 'expired':
      return 'rejected'
    case 'submitted':
    default:
      return 'submitted'
  }
}

export function setOperationalStatusInInternalNotes(
  internalNotes: string | null | undefined,
  nextStatus: OperationalBookingStatus,
): string {
  const withoutTag = (internalNotes ?? '').replace(OPERATIONAL_STATUS_PATTERN, '').trim()
  const tag = `[ops_status:${nextStatus}]`
  return withoutTag ? `${tag}\n${withoutTag}` : tag
}

export async function expireOverduePendingPayments(options?: {
  now?: Date
  take?: number
}): Promise<ExpireOverduePendingPaymentsResult> {
  const referenceDate = options?.now ?? new Date()
  const take = Math.max(1, Math.min(options?.take ?? 200, 500))
  const cutoff = new Date(referenceDate.getTime() - PAYMENT_WINDOW_MINUTES * 60 * 1000)
  const overdueBookings = await prisma.bookingRequest.findMany({
    where: {
      status: 'under_review',
      createdAt: { lt: cutoff },
      paymentProofs: {
        none: {
          isActive: true,
        },
      },
    },
    include: {
      paymentProofs: {
        where: {
          isActive: true,
        },
        take: 1,
        select: {
          id: true,
        },
      },
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        include: {
          resource: {
            select: {
              name: true,
            },
          },
          serviceVariant: {
            include: {
              service: true,
            },
          },
        },
      },
    },
    take,
  })

  const result: ExpireOverduePendingPaymentsResult = {
    scanned: overdueBookings.length,
    expired: 0,
    skipped: 0,
    calendarSynced: 0,
    calendarFailed: 0,
  }

  const now = referenceDate
  const halfWindowCutoff = new Date(now.getTime() - (PAYMENT_WINDOW_MINUTES / 2) * 60 * 1000)

  const pendingReminders = await prisma.bookingRequest.findMany({
    where: {
      status: 'under_review',
      createdAt: {
        gte: new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60 * 1000),
      },
      OR: [
        { internalNotes: null },
        { internalNotes: { not: { contains: '[ops_status:payment_reported]' } } },
      ],
      paymentProofs: { none: { isActive: true } },
    },
    select: {
      id: true,
      publicCode: true,
      requesterName: true,
      requesterPhone: true,
      createdAt: true,
      auditLogs: {
        where: {
          action: {
            in: ['whatsapp_reminder_1_sent', 'whatsapp_reminder_2_sent'],
          },
        },
        select: {
          action: true,
        },
        take: 50,
      },
    },
    take: 100,
  })

  for (const pending of pendingReminders) {
    const deadline = getPaymentDeadline(pending.createdAt)
    const reminder2Threshold = new Date(deadline.getTime() - 10 * 60 * 1000)
    const isWithinReminder2Window =
      now.getTime() >= reminder2Threshold.getTime() && now.getTime() < deadline.getTime()
    const reminder1AlreadySent = pending.auditLogs.some(
      (entry) => entry.action === 'whatsapp_reminder_1_sent',
    )
    const reminder2AlreadySent = pending.auditLogs.some(
      (entry) => entry.action === 'whatsapp_reminder_2_sent',
    )

    if (!reminder1AlreadySent && pending.createdAt.getTime() <= halfWindowCutoff.getTime()) {
      if (pending.requesterPhone) {
        const reminderResult = await sendBookingWhatsapp(
          'reminder_1_half_window',
          { phone: pending.requesterPhone, name: pending.requesterName },
          { publicCode: pending.publicCode },
        )

        await prisma.auditLog.create({
          data: {
            bookingRequestId: pending.id,
            action: 'whatsapp_reminder_1_sent',
            nextState: {
              event: 'reminder_1_half_window',
              sent: reminderResult.sent,
              provider: reminderResult.provider,
              reason: reminderResult.reason ?? null,
              messageId: reminderResult.messageId ?? null,
            },
          },
        })
      }
    }

    if (!reminder2AlreadySent && isWithinReminder2Window) {
      if (pending.requesterPhone) {
        const reminderResult = await sendBookingWhatsapp(
          'reminder_2_10min',
          { phone: pending.requesterPhone, name: pending.requesterName },
          { publicCode: pending.publicCode },
        )

        await prisma.auditLog.create({
          data: {
            bookingRequestId: pending.id,
            action: 'whatsapp_reminder_2_sent',
            nextState: {
              event: 'reminder_2_10min',
              sent: reminderResult.sent,
              provider: reminderResult.provider,
              reason: reminderResult.reason ?? null,
              messageId: reminderResult.messageId ?? null,
            },
          },
        })
      }
    }
  }

  for (const booking of overdueBookings) {
    const taggedStatus = getOperationalStatusFromInternalNotes(booking.internalNotes)
    const hasActivePaymentProof = booking.paymentProofs.length > 0
    if (taggedStatus !== null && taggedStatus !== 'pending_payment') {
      result.skipped += 1
      continue
    }

    if (hasActivePaymentProof) {
      result.skipped += 1
      continue
    }

    const updatedInternalNotes = setOperationalStatusInInternalNotes(
      booking.internalNotes,
      'expired',
    )

    const expireResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.bookingRequest.updateMany({
        where: {
          id: booking.id,
          status: 'under_review',
          createdAt: { lt: cutoff },
          paymentProofs: {
            none: {
              isActive: true,
            },
          },
          OR: [
            { internalNotes: null },
            { internalNotes: { not: { contains: '[ops_status:payment_reported]' } } },
          ],
        },
        data: {
          status: 'rejected',
          internalNotes: updatedInternalNotes,
        },
      })

      if (updateResult.count === 0) {
        return { changed: false }
      }

      await tx.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'booking_expired_payment_window',
          nextState: {
            operationalStatus: 'expired',
          },
        },
      })

      return { changed: true }
    })

    if (!expireResult.changed) {
      result.skipped += 1
      continue
    }

    result.expired += 1
    const primaryItem = booking.items[0]
    await sendBookingNotifications('booking.expired', {
      publicCode: booking.publicCode,
      clientName: booking.requesterName,
      clientEmail: booking.requesterEmail,
      serviceName: primaryItem?.serviceVariant.service.name ?? null,
      variantName: primaryItem?.serviceVariant.name ?? null,
      resourceName: primaryItem?.resource?.name ?? null,
      startAt: booking.eventDate,
      endAt: booking.eventEndDate,
      deadlineAt: getPaymentDeadline(booking.createdAt),
      estimatedTotal: parseOptionalAmount(booking.estimatedTotal),
      currency: booking.currency,
      status: 'expired',
      notes: booking.notes,
    })

    if (booking.requesterPhone) {
      sendBookingWhatsapp(
        'booking_expired',
        { phone: booking.requesterPhone, name: booking.requesterName },
        {
          publicCode: booking.publicCode,
          serviceName: primaryItem?.serviceVariant.service.name ?? null,
          variantName: primaryItem?.serviceVariant.name ?? null,
        },
      ).catch(() => {})
    }

    const calendarSync = await syncBookingToGoogleCalendar({
      publicCode: booking.publicCode,
      serviceName: primaryItem?.serviceVariant.service.name ?? 'Sin servicio',
      variantName: primaryItem?.serviceVariant.name ?? 'Sin modalidad',
      resourceName: primaryItem?.resource?.name ?? null,
      requesterName: booking.requesterName,
      requesterPhone: booking.requesterPhone,
      eventDate: booking.eventDate,
      eventEndDate: booking.eventEndDate,
      paymentDeadline: getPaymentDeadline(booking.createdAt),
      operationalStatus: 'expired',
      existingCalendarEventId: booking.calendarEventId,
    })

    if (calendarSync.ok) {
      result.calendarSynced += 1
      if (calendarSync.eventId !== booking.calendarEventId) {
        await prisma.bookingRequest.update({
          where: { id: booking.id },
          data: {
            calendarEventId: calendarSync.eventId,
          },
        })
      }
    } else {
      result.calendarFailed += 1
      await prisma.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'calendar_sync_failed_on_expiration',
          nextState: {
            operationalStatus: 'expired',
            reason: calendarSync.reason ?? 'unknown',
          },
        },
      })
    }
  }

  return result
}
