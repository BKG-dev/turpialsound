import type { BookingStatus } from '@/generated/prisma/client'

export type OperationalBookingStatus =
  | 'submitted'
  | 'pending_payment'
  | 'payment_verified'
  | 'confirmed'
  | 'cancelled'

export const OPERATIONAL_BOOKING_STATUSES: OperationalBookingStatus[] = [
  'submitted',
  'pending_payment',
  'payment_verified',
  'confirmed',
  'cancelled',
]

export const OPERATIONAL_STATUS_LABELS: Record<OperationalBookingStatus, string> = {
  submitted: 'Enviada',
  pending_payment: 'Pendiente de pago',
  payment_verified: 'Pago verificado',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

const OPERATIONAL_STATUS_PATTERN =
  /\[ops_status:(submitted|pending_payment|payment_verified|confirmed|cancelled)\]/i

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
  status: BookingStatus,
): OperationalBookingStatus {
  switch (status) {
    case 'under_review':
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
  },
): OperationalBookingStatus {
  return (
    getOperationalStatusFromInternalNotes(booking.internalNotes) ??
    inferOperationalStatusFromBookingStatus(booking.status)
  )
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
