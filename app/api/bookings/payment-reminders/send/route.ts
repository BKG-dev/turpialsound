import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOperationalStatus } from '@/lib/bookings/operations'
import {
  sendPaymentReminderWhatsapp,
  type PaymentReminderKind,
} from '@/lib/bookings/payment-reminders'
import { validatePaymentRecoveryToken } from '@/lib/bookings/payment-recovery-token'

const REMINDER_SECRET_ENV = 'BOOKINGS_PAYMENT_REMINDER_SECRET'

interface PaymentReminderPayload {
  publicCode?: string
  token?: string
  reminderKind?: PaymentReminderKind
}

function isAuthorizedReminderRequest(request: NextRequest): boolean {
  const secret = process.env[REMINDER_SECRET_ENV]?.trim()
  if (!secret) return false
  const authorization = request.headers.get('authorization')?.trim()
  return authorization === `Bearer ${secret}`
}

function isReminderKind(value: string | undefined): value is PaymentReminderKind {
  return value === 'payment_reminder_10m' || value === 'payment_reminder_50m'
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isAuthorizedReminderRequest(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as PaymentReminderPayload | null
  const publicCode = payload?.publicCode?.trim().toUpperCase() ?? ''
  const token = payload?.token?.trim() ?? ''
  const reminderKind = payload?.reminderKind

  if (!publicCode || !token || !isReminderKind(reminderKind)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const tokenValidation = validatePaymentRecoveryToken(token, publicCode)
  if (!tokenValidation.ok) {
    return NextResponse.json({ ok: true, status: 'skipped', reason: tokenValidation.error })
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { publicCode },
    select: {
      id: true,
      publicCode: true,
      status: true,
      internalNotes: true,
      createdAt: true,
      requesterName: true,
      requesterPhone: true,
    },
  })

  if (!booking) {
    return NextResponse.json({ ok: true, status: 'skipped', reason: 'booking_not_found' })
  }

  const operationalStatus = getOperationalStatus(booking)
  if (operationalStatus !== 'pending_payment') {
    await prisma.auditLog
      .create({
        data: {
          bookingRequestId: booking.id,
          action: 'payment_reminder_skipped_state',
          nextState: {
            reminderKind,
            operationalStatus,
          },
        },
      })
      .catch(() => {})

    return NextResponse.json({
      ok: true,
      status: 'skipped',
      reason: 'non_pending_status',
      operationalStatus,
    })
  }

  if (!booking.requesterPhone) {
    await prisma.auditLog
      .create({
        data: {
          bookingRequestId: booking.id,
          action: 'payment_reminder_failed',
          nextState: {
            reminderKind,
            reason: 'missing_phone',
          },
        },
      })
      .catch(() => {})
    return NextResponse.json({ ok: true, status: 'failed', reason: 'missing_phone' })
  }

  const sendResult = await sendPaymentReminderWhatsapp({
    reminderKind,
    phone: booking.requesterPhone,
    clientName: booking.requesterName,
    publicCode: booking.publicCode,
    token,
  })

  const action =
    sendResult.status === 'sent'
      ? 'payment_reminder_sent'
      : sendResult.status === 'skipped'
        ? 'payment_reminder_skipped_state'
        : 'payment_reminder_failed'

  await prisma.auditLog
    .create({
      data: {
        bookingRequestId: booking.id,
        action,
        nextState: {
          reminderKind,
          operationalStatus,
          sent: sendResult.sent,
          status: sendResult.status,
          reason: sendResult.reason ?? null,
          provider: sendResult.provider ?? null,
          messageId: sendResult.messageId ?? null,
          responseStatus: sendResult.responseStatus ?? null,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({
    ok: true,
    status: sendResult.status,
    reason: sendResult.reason ?? null,
    operationalStatus,
  })
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
