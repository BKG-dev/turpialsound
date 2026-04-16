import type { BookingStatus } from '@/generated/prisma/client'

export type OperationalBookingStatus =
  | 'submitted'
  | 'pending_payment'
  | 'payment_verified'
  | 'confirmed'
  | 'cancelled'
  | 'expired'

export const OPERATIONAL_BOOKING_STATUSES: OperationalBookingStatus[] = [
  'submitted',
  'pending_payment',
  'payment_verified',
  'confirmed',
  'cancelled',
  'expired',
]

export const OPERATIONAL_STATUS_LABELS: Record<OperationalBookingStatus, string> = {
  submitted: 'Enviada',
  pending_payment: 'Pendiente de pago',
  payment_verified: 'Pago verificado',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
}

const OPERATIONAL_STATUS_PATTERN =
  /\[ops_status:(submitted|pending_payment|payment_verified|confirmed|cancelled|expired)\]/i

export const PAYMENT_WINDOW_MINUTES = 60

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
