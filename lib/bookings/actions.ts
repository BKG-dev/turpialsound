'use server'

import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { buildPublicCode } from '@/lib/bookings'
import { CATALOG_SERVICES } from '@/lib/bookings/catalog'
import { assignResourceForRequestedSlot, resourceHasCollision } from '@/lib/bookings/availability'
import { buildBookingEstimate } from '@/lib/bookings/estimate'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import {
  getOperationalStatus,
  getPaymentDeadline,
  mapOperationalStatusToBookingStatus,
  setOperationalStatusInInternalNotes,
} from '@/lib/bookings/operations'
import { getEnabledPaymentMethods } from '@/lib/bookings/payment-settings'
import type { BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings.types'
import {
  type PaymentProofDuplicateStatus,
  PaymentProofValidationError,
  uploadPaymentProofToBlob,
} from '@/lib/bookings/payment-proof-upload'
import { sendBookingNotifications } from '@/lib/bookings/notifications'
import {
  buildPaymentRecoveryPath,
  buildPaymentRecoveryToken,
} from '@/lib/bookings/payment-recovery-token'
import { buildScheduledPaymentReminderJobs } from '@/lib/bookings/payment-reminders'
import { resolveReferenceRate } from '@/lib/bookings/reference-rate'
import { sendBookingWhatsappNotification } from '@/lib/bookings/whatsapp-notifications'
import { isLabPhoneVerifiedRecently } from '@/lib/whatsapp/lab-token-store'
import { isSecureLinkPhoneVerifiedRecently } from '@/lib/whatsapp/secure-link-store'
import { sendBookingWhatsapp } from '@/lib/whatsapp/booking-notifications'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^\+58(412|414|416|424|426)\d{7}$/
const WHATSAPP_CONSENT_ACCEPTED_TAG = '[wa_consent:accepted]'
const WHATSAPP_CONSENT_AT_PREFIX = '[wa_consent_at:'
const CARACAS_UTC_OFFSET_MINUTES = -4 * 60
const BOOKING_SUBMIT_MAX_ATTEMPTS = 3
const RETRYABLE_BOOKING_SUBMIT_ERROR_CODES = new Set(['P2034', 'P2002', '40001', '40P01'])
const ACTIVE_HOLD_BLOCKING_ERROR =
  'Ya tienes una solicitud pendiente de pago o revision. Completa esa solicitud antes de crear una nueva.'
const PAYMENT_REMINDER_SCHEDULER_URL_ENV = 'BOOKINGS_PAYMENT_REMINDER_SCHEDULER_URL'
const PAYMENT_REMINDER_SCHEDULER_SECRET_ENV = 'BOOKINGS_PAYMENT_REMINDER_SCHEDULER_SECRET'
const PAYMENT_REMINDER_CALLBACK_SECRET_ENV = 'BOOKINGS_PAYMENT_REMINDER_SECRET'
const PAYMENT_REMINDER_CALLBACK_PATH = '/api/bookings/payment-reminders/send'

class PaymentReportSlotTakenError extends Error {
  constructor() {
    super('El bloque ya fue tomado por otro cliente que reporto pago primero.')
    this.name = 'PaymentReportSlotTakenError'
  }
}

function getUnknownErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const code = (error as { code?: unknown }).code
  if (typeof code === 'string') {
    return code
  }

  const meta = (error as { meta?: unknown }).meta
  if (typeof meta !== 'object' || meta === null) {
    return null
  }

  const metaCode = (meta as { code?: unknown }).code
  return typeof metaCode === 'string' ? metaCode : null
}

function isRetryableBookingSubmitError(error: unknown): boolean {
  const code = getUnknownErrorCode(error)
  return code !== null && RETRYABLE_BOOKING_SUBMIT_ERROR_CODES.has(code)
}

function buildCaracasSlotDateTime(eventDate: string, startTime: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(startTime)

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN)
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  const hasInvalidDateParts =
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59

  if (hasInvalidDateParts) {
    return new Date(Number.NaN)
  }

  const caracasEpochMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    CARACAS_UTC_OFFSET_MINUTES * 60 * 1000

  return new Date(caracasEpochMs)
}

function normalizeWhatsappVe(value: string): string {
  const compact = value.replace(/[^\d+]/g, '')

  if (compact.startsWith('+58')) return compact
  if (compact.startsWith('58')) return `+${compact}`
  if (compact.startsWith('0')) return `+58${compact.slice(1)}`

  return compact
}

function getQaHoldBypassPhones(): Set<string> {
  const raw = process.env.BOOKINGS_QA_HOLD_BYPASS_PHONES?.trim() ?? ''
  if (!raw) {
    return new Set()
  }

  const normalizedPhones = raw
    .split(',')
    .map((value) => normalizeWhatsappVe(value.trim()))
    .filter(Boolean)

  return new Set(normalizedPhones)
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function withWhatsappConsentTags(baseInternalNotes: string, acceptedAt: Date): string {
  const withoutConsentTags = baseInternalNotes
    .replace(/\[wa_consent:accepted\]/gi, '')
    .replace(/\[wa_consent_at:[^\]]+\]/gi, '')
    .trim()

  const consentLines = [
    WHATSAPP_CONSENT_ACCEPTED_TAG,
    `${WHATSAPP_CONSENT_AT_PREFIX}${acceptedAt.toISOString()}]`,
  ]

  return [withoutConsentTags, ...consentLines].filter(Boolean).join('\n')
}

function hasWhatsappConsentAccepted(internalNotes: string | null | undefined): boolean {
  return (internalNotes ?? '').toLowerCase().includes(WHATSAPP_CONSENT_ACCEPTED_TAG)
}

function formatPaymentMethodLabel(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'pago_movil') return 'Pago Móvil'
  if (normalized === 'transferencia') return 'Transferencia Bancaria'
  if (normalized === 'binance') return 'Binance Pay'
  if (normalized === 'efectivo') return 'Efectivo'
  return 'Por confirmar'
}

function getPaymentProofDuplicateWarning(
  duplicateStatus: PaymentProofDuplicateStatus | null | undefined,
): string | null {
  if (!duplicateStatus || duplicateStatus === 'none') {
    return null
  }

  if (duplicateStatus === 'same_booking') {
    return 'Advertencia: este comprobante coincide con otro ya cargado en esta misma solicitud.'
  }

  return 'Advertencia: este comprobante coincide con uno ya registrado en otra solicitud.'
}

export interface SubmitBookingInput {
  serviceSlug: string
  variantSlug: string
  eventDate: string
  startTime: string
  durationMinutes: number
  extrasNotes: string
  extrasTechnician: boolean
  extrasBackline: boolean
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  whatsappConsentAccepted?: boolean
}

export interface SubmitBookingResult {
  success: boolean
  publicCode?: string
  assignedResourceName?: string | null
  paymentDeadlineIso?: string
  paymentRecoveryPath?: string | null
  error?: string
}

function resolvePublicBaseUrl(): string {
  return (process.env.APP_URL?.trim() || 'https://turpialsong.com').replace(/\/+$/, '')
}

async function schedulePendingPaymentReminderJobs(input: {
  bookingRequestId: string
  publicCode: string
  token: string
  createdAt: Date
}): Promise<void> {
  const schedulerUrl = process.env[PAYMENT_REMINDER_SCHEDULER_URL_ENV]?.trim() ?? ''
  const callbackSecret = process.env[PAYMENT_REMINDER_CALLBACK_SECRET_ENV]?.trim() ?? ''

  if (!schedulerUrl || !callbackSecret) {
    await prisma.auditLog
      .create({
        data: {
          bookingRequestId: input.bookingRequestId,
          action: 'payment_reminders_schedule_pending_config',
          nextState: {
            hasSchedulerUrl: Boolean(schedulerUrl),
            hasReminderSecret: Boolean(callbackSecret),
          },
        },
      })
      .catch(() => {})
    return
  }

  const callbackUrl = `${resolvePublicBaseUrl()}${PAYMENT_REMINDER_CALLBACK_PATH}`
  const reminders = buildScheduledPaymentReminderJobs(input.createdAt)

  const schedulerAuth = process.env[PAYMENT_REMINDER_SCHEDULER_SECRET_ENV]?.trim() ?? ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (schedulerAuth) {
    headers.Authorization = `Bearer ${schedulerAuth}`
  }

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 1800)

  try {
    const response = await fetch(schedulerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'turpialsound_bookings',
        callback: {
          method: 'POST',
          url: callbackUrl,
          headers: {
            authorization: `Bearer ${callbackSecret}`,
          },
        },
        reminders: reminders.map((reminder) => ({
          reminderKind: reminder.reminderKind,
          dueAt: reminder.dueAtIso,
          payload: {
            publicCode: input.publicCode,
            token: input.token,
            reminderKind: reminder.reminderKind,
          },
        })),
      }),
      cache: 'no-store',
      signal: abortController.signal,
    })

    if (!response.ok) {
      await prisma.auditLog
        .create({
          data: {
            bookingRequestId: input.bookingRequestId,
            action: 'payment_reminders_schedule_failed',
            nextState: {
              reason: 'scheduler_rejected',
              responseStatus: response.status,
            },
          },
        })
        .catch(() => {})
      return
    }

    await prisma.auditLog
      .create({
        data: {
          bookingRequestId: input.bookingRequestId,
          action: 'payment_reminders_schedule_requested',
          nextState: {
            callbackUrl,
            reminders: reminders.map((reminder) => ({
              reminderKind: reminder.reminderKind,
              dueAt: reminder.dueAtIso,
            })),
          },
        },
      })
      .catch(() => {})
  } catch {
    await prisma.auditLog
      .create({
        data: {
          bookingRequestId: input.bookingRequestId,
          action: 'payment_reminders_schedule_failed',
          nextState: {
            reason:
              abortController.signal.aborted
                ? 'scheduler_timeout'
                : 'scheduler_network_error',
          },
        },
      })
      .catch(() => {})
  } finally {
    clearTimeout(timeout)
  }
}

export async function submitBookingRequest(
  input: SubmitBookingInput,
): Promise<SubmitBookingResult> {
  try {
    if (
      !input.serviceSlug ||
      !input.variantSlug ||
      !input.eventDate ||
      !input.startTime ||
      !input.durationMinutes
    ) {
      return { success: false, error: 'Faltan datos obligatorios en la solicitud.' }
    }

    const requesterName = input.requesterName.trim()
    const requesterEmail = input.requesterEmail.trim().toLowerCase()
    const requesterPhone = normalizeWhatsappVe(input.requesterPhone)

    if (!requesterName || !requesterEmail || !requesterPhone) {
      return { success: false, error: 'El nombre, el correo y el WhatsApp son obligatorios.' }
    }

    if (!EMAIL_REGEX.test(requesterEmail)) {
      return { success: false, error: 'El correo electronico no es valido.' }
    }

    if (!WHATSAPP_REGEX.test(requesterPhone)) {
      return { success: false, error: 'El numero de WhatsApp no es valido.' }
    }

    if (!input.whatsappConsentAccepted) {
      return {
        success: false,
        error: 'Debes autorizar el seguimiento operativo por WhatsApp para continuar.',
      }
    }

    const whatsappLabVerification = await isLabPhoneVerifiedRecently(requesterPhone)
    const whatsappSecureLinkVerification = whatsappLabVerification.ok
      ? { ok: true, reason: null as 'not_found' | 'not_verified' | 'expired' | null }
      : await isSecureLinkPhoneVerifiedRecently(requesterPhone)

    if (!whatsappLabVerification.ok && !whatsappSecureLinkVerification.ok) {
      return {
        success: false,
        error:
          whatsappLabVerification.reason === 'expired' ||
          whatsappSecureLinkVerification.reason === 'expired'
            ? 'Tu verificacion de WhatsApp vencio. Verifica nuevamente antes de crear la reserva.'
            : 'Debes verificar tu WhatsApp antes de crear la solicitud de reserva.',
      }
    }

    const serviceVariant = await prisma.serviceVariant.findUnique({
      where: { slug: input.variantSlug },
      include: { service: true },
    })

    if (!serviceVariant) {
      return { success: false, error: 'Modalidad no encontrada. Intenta de nuevo.' }
    }

    if (serviceVariant.service.slug !== input.serviceSlug) {
      return {
        success: false,
        error: 'La modalidad seleccionada no corresponde al servicio elegido.',
      }
    }

    const eventDateTime = buildCaracasSlotDateTime(input.eventDate, input.startTime)
    const eventEndDateTime = new Date(
      eventDateTime.getTime() + input.durationMinutes * 60 * 1000,
    )

    if (Number.isNaN(eventDateTime.getTime()) || Number.isNaN(eventEndDateTime.getTime())) {
      return { success: false, error: 'La fecha u hora seleccionada no es valida.' }
    }

    const notesParts: string[] = []
    if (input.extrasTechnician) notesParts.push('Tecnico de sonido: requerido')
    if (input.extrasBackline) notesParts.push('Backline / equipamiento adicional: requerido')
    if (input.extrasNotes.trim()) notesParts.push(input.extrasNotes.trim())
    const notes = notesParts.length > 0 ? notesParts.join('\n') : null

    const serviceName =
      CATALOG_SERVICES.find((service) => service.slug === input.serviceSlug)?.name ?? 'Servicio'
    const eventTitle = `Solicitud - ${serviceName}`
    const bookingEstimate = buildBookingEstimate({
      selectedItems: [
        {
          serviceSlug: input.serviceSlug,
          variantSlug: input.variantSlug,
          quantity: 1,
        },
      ],
      eventDate: input.eventDate,
      durationMinutes: input.durationMinutes,
      extrasTechnician: input.extrasTechnician,
      extrasBackline: input.extrasBackline,
    })
    const estimatedTotalUsd = bookingEstimate.estimatedTotalUsd
    const internalNotesWithStatus = setOperationalStatusInInternalNotes(null, 'pending_payment')
    const internalNotes = withWhatsappConsentTags(internalNotesWithStatus, new Date())
    // QA bypass list for hold anti-abuse tests (CSV via env); bypasses only active-hold guard.
    const shouldBypassActiveHoldGuard = getQaHoldBypassPhones().has(requesterPhone)

    let submitResult:
      | SubmitBookingResult
      | (SubmitBookingResult & {
          bookingId: string
          createdAt: Date
          resourceName: string | null
        })
      | null = null

    for (let attempt = 1; attempt <= BOOKING_SUBMIT_MAX_ATTEMPTS; attempt += 1) {
      try {
        submitResult = await prisma.$transaction(
          async (tx) => {
            if (!shouldBypassActiveHoldGuard) {
              const existingActiveHolds = await tx.bookingRequest.count({
                where: {
                  status: 'under_review',
                  AND: [
                    {
                      OR: [{ requesterEmail }, { requesterPhone }],
                    },
                    {
                      internalNotes: { contains: '[ops_status:payment_reported]' },
                    },
                  ],
                },
              })

              if (existingActiveHolds > 0) {
                return {
                  success: false,
                  error: ACTIVE_HOLD_BLOCKING_ERROR,
                } satisfies SubmitBookingResult
              }
            }

            const year = new Date().getFullYear()
            const existing = await tx.bookingRequest.count({
              where: { publicCode: { startsWith: `TUR-${year}-` } },
            })
            const publicCode = buildPublicCode(year, existing + 1)

            const resourceAssignment = await assignResourceForRequestedSlot(tx, {
              serviceSlug: input.serviceSlug,
              eventDate: eventDateTime,
              eventEndDate: eventEndDateTime,
            })

            if (!resourceAssignment.available) {
              return {
                success: false,
                error:
                  resourceAssignment.message ??
                  'El bloque seleccionado no esta disponible. Elige otro horario.',
              } satisfies SubmitBookingResult
            }

            const assignedResource = resourceAssignment.assignedResourceId
              ? await tx.resource.findUnique({
                  where: { id: resourceAssignment.assignedResourceId },
                  select: { id: true, name: true },
                })
              : null

            const booking = await tx.bookingRequest.create({
              data: {
                publicCode,
                status: 'under_review',
                source: 'web',
                requesterName,
                requesterEmail,
                requesterPhone,
                eventTitle,
                eventDate: eventDateTime,
                eventEndDate: eventEndDateTime,
                notes,
                estimatedTotal: estimatedTotalUsd,
                internalNotes,
                submittedAt: new Date(),
              },
            })

            await tx.bookingRequestItem.create({
              data: {
                bookingRequestId: booking.id,
                serviceVariantId: serviceVariant.id,
                resourceId: resourceAssignment.assignedResourceId,
                quantity: 1,
              },
            })

            return {
              success: true,
              publicCode,
              bookingId: booking.id,
              createdAt: booking.createdAt,
              resourceName: assignedResource?.name ?? null,
            } satisfies SubmitBookingResult & {
              bookingId: string
              createdAt: Date
              resourceName: string | null
            }
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
        break
      } catch (error) {
        if (isRetryableBookingSubmitError(error) && attempt < BOOKING_SUBMIT_MAX_ATTEMPTS) {
          continue
        }

        if (isRetryableBookingSubmitError(error)) {
          return {
            success: false,
            error: 'No pudimos asegurar el bloque por una solicitud simultanea. Intenta de nuevo.',
          }
        }

        throw error
      }
    }

    if (!submitResult) {
      return {
        success: false,
        error: 'No pudimos procesar la solicitud. Intenta de nuevo.',
      }
    }

    if (!submitResult.success || !submitResult.publicCode || !('bookingId' in submitResult)) {
      return submitResult
    }

    const paymentDeadline = getPaymentDeadline(submitResult.createdAt)
    const calendarSync = await syncBookingToGoogleCalendar({
      publicCode: submitResult.publicCode,
      serviceName,
      variantName: serviceVariant.name,
      resourceName: submitResult.resourceName,
      requesterName,
      requesterPhone,
      eventDate: eventDateTime,
      eventEndDate: eventEndDateTime,
      paymentDeadline,
      operationalStatus: 'pending_payment',
      existingCalendarEventId: null,
    })

    if (calendarSync.ok) {
      await prisma.bookingRequest.update({
        where: { id: submitResult.bookingId },
        data: {
          calendarEventId: calendarSync.eventId,
        },
      })
    } else {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: submitResult.bookingId,
          action: 'calendar_sync_failed_on_submit',
          nextState: {
            operationalStatus: 'pending_payment',
            reason: calendarSync.reason ?? 'unknown',
          },
        },
      })
    }

    await sendBookingNotifications('booking.pending_payment.created', {
      publicCode: submitResult.publicCode,
      clientName: requesterName,
      clientEmail: requesterEmail,
      serviceName,
      variantName: serviceVariant.name,
      resourceName: submitResult.resourceName,
      startAt: eventDateTime,
      endAt: eventEndDateTime,
      deadlineAt: paymentDeadline,
      estimatedTotal: estimatedTotalUsd,
      currency: 'USD',
      status: 'pending_payment',
    })

    const paymentRecoveryToken = buildPaymentRecoveryToken({
      bookingPublicCode: submitResult.publicCode,
      expiresAt: paymentDeadline,
    })
    const paymentRecoveryPath = paymentRecoveryToken
      ? buildPaymentRecoveryPath({
          publicCode: submitResult.publicCode,
          token: paymentRecoveryToken,
        })
      : null

    if (paymentRecoveryToken) {
      await schedulePendingPaymentReminderJobs({
        bookingRequestId: submitResult.bookingId,
        publicCode: submitResult.publicCode,
        token: paymentRecoveryToken,
        createdAt: submitResult.createdAt,
      })
    } else {
      await prisma.auditLog
        .create({
          data: {
            bookingRequestId: submitResult.bookingId,
            action: 'payment_recovery_token_not_generated',
            nextState: {
              reason: 'missing_or_invalid_secret',
            },
          },
        })
        .catch(() => {})
    }

    return {
      success: true,
      publicCode: submitResult.publicCode,
      assignedResourceName: submitResult.resourceName,
      paymentDeadlineIso: paymentDeadline.toISOString(),
      paymentRecoveryPath,
    }
  } catch (error) {
    console.error('[submitBookingRequest]', error)
    return {
      success: false,
      error: 'Error al enviar la solicitud. Por favor intenta de nuevo.',
    }
  }
}

export interface ReportBookingPaymentResult {
  success: boolean
  operationalStatus?: 'payment_reported'
  bookingStatus?: 'under_review'
  paymentReportedAtIso?: string
  paymentProofId?: string
  duplicateStatus?: PaymentProofDuplicateStatus
  warning?: string
  error?: string
}

function isBookingPaymentMethodSlug(value: string): value is BookingPaymentMethodSlug {
  return getEnabledPaymentMethods().some((method) => method.slug === value)
}

export async function reportBookingPayment(
  formData: FormData,
): Promise<ReportBookingPaymentResult> {
  try {
    const publicCode = formData.get('publicCode')?.toString().trim().toUpperCase() ?? ''
    const paymentReference = formData.get('paymentReference')?.toString().trim() ?? ''
    const paymentMethod = formData.get('paymentMethod')?.toString().trim() ?? ''
    const paymentProofFile = formData.get('paymentProofFile')

    if (!publicCode) {
      return { success: false, error: 'No pudimos identificar la solicitud.' }
    }

    if (!isBookingPaymentMethodSlug(paymentMethod)) {
      return { success: false, error: 'Metodo de pago invalido.' }
    }

    if (!paymentReference) {
      return { success: false, error: 'La referencia de pago es obligatoria.' }
    }

    const requiresPaymentProofFile = paymentMethod !== 'efectivo'

    if (requiresPaymentProofFile && !(paymentProofFile instanceof File)) {
      return { success: false, error: 'Sube tu comprobante en JPG, PNG, WEBP o AVIF.' }
    }

    const booking = await prisma.bookingRequest.findUnique({
      where: { publicCode },
      select: {
        id: true,
        status: true,
        internalNotes: true,
        publicCode: true,
        requesterName: true,
        requesterEmail: true,
        requesterPhone: true,
        eventDate: true,
        eventEndDate: true,
        estimatedTotal: true,
        currency: true,
        createdAt: true,
        calendarEventId: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            serviceVariant: {
              select: {
                name: true,
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            resource: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return { success: false, error: 'Solicitud no encontrada.' }
    }

    const currentOperationalStatus = getOperationalStatus(booking)
    const primaryItem = booking.items[0]
    const assignedResourceNames = Array.from(
      new Set(
        booking.items
          .map((item) => item.resource?.name?.trim() ?? '')
          .filter((name) => name.length > 0),
      ),
    )
    const resolvedResourceName =
      assignedResourceNames.length > 0 ? assignedResourceNames.join(', ') : null

    if (currentOperationalStatus === 'payment_reported') {
      return { success: false, error: 'Esta solicitud ya tiene un pago reportado.' }
    }

    if (currentOperationalStatus === 'expired') {
      return {
        success: false,
        error: 'La solicitud esta expirada y ya no admite reporte de pago.',
      }
    }

    if (currentOperationalStatus !== 'pending_payment') {
      return {
        success: false,
        error: 'Solo puedes reportar pago cuando la solicitud esta en estado pendiente de pago.',
      }
    }

    let uploadedPaymentProof:
      | Awaited<ReturnType<typeof uploadPaymentProofToBlob>>
      | null = null

    if (paymentProofFile instanceof File) {
      try {
        uploadedPaymentProof = await uploadPaymentProofToBlob({
          file: paymentProofFile,
          bookingId: booking.id,
          bookingPublicCode: booking.publicCode,
          reportedReference: paymentReference,
        })
      } catch (error) {
        if (error instanceof PaymentProofValidationError) {
          return { success: false, error: error.message }
        }

        console.error('[reportBookingPayment.uploadPaymentProofToBlob]', error)
        return {
          success: false,
          error: 'No pudimos subir el comprobante al storage privado. Intenta de nuevo.',
        }
      }
    }

    if (requiresPaymentProofFile && !uploadedPaymentProof) {
      return { success: false, error: 'Sube tu comprobante en JPG, PNG, WEBP o AVIF.' }
    }

    const paymentReportedAt = new Date()
    const nextOperationalStatus = 'payment_reported' as const
    const nextBookingStatus = mapOperationalStatusToBookingStatus(nextOperationalStatus)
    const updatedInternalNotes = setOperationalStatusInInternalNotes(
      booking.internalNotes,
      nextOperationalStatus,
    )
    let paymentProofId: string | null = null

    try {
      await prisma.$transaction(async (tx) => {
        if (uploadedPaymentProof) {
          const paymentProof = await tx.paymentProof.create({
            data: {
              bookingRequestId: booking.id,
              blobPathname: uploadedPaymentProof.blobPathname,
              sha256: uploadedPaymentProof.sha256,
              mimeType: uploadedPaymentProof.mimeType,
              sizeBytes: uploadedPaymentProof.sizeBytes,
              originalFilename: uploadedPaymentProof.originalFilename,
              uploadedAt: uploadedPaymentProof.uploadedAt,
              reportedReference: uploadedPaymentProof.reportedReference,
              normalizedReference: uploadedPaymentProof.normalizedReference,
              duplicateStatus: uploadedPaymentProof.duplicateStatus,
            },
            select: { id: true },
          })

          paymentProofId = paymentProof.id
        }

        const resourceId = booking.items[0]?.resource?.id ?? null

        if (resourceId && booking.eventDate && booking.eventEndDate) {
          const slotTaken = await resourceHasCollision(
            tx,
            resourceId,
            booking.eventDate,
            booking.eventEndDate,
            { excludeBookingId: booking.id },
          )

          if (slotTaken) {
            throw new PaymentReportSlotTakenError()
          }
        }

        await tx.bookingRequest.update({
          where: { id: booking.id },
          data: {
            status: nextBookingStatus,
            internalNotes: updatedInternalNotes,
          },
        })

        await tx.auditLog.create({
          data: {
            bookingRequestId: booking.id,
            action: 'payment_reported_by_customer',
            previousState: {
              operationalStatus: currentOperationalStatus,
              bookingStatus: booking.status,
            },
            nextState: {
              operationalStatus: nextOperationalStatus,
              bookingStatus: nextBookingStatus,
              paymentMethod,
              paymentReference,
              paymentReportedAt: paymentReportedAt.toISOString(),
              ...(uploadedPaymentProof
                ? {
                    paymentProofId,
                    paymentProofPathname: uploadedPaymentProof.blobPathname,
                    paymentProofSha256: uploadedPaymentProof.sha256,
                    paymentProofMimeType: uploadedPaymentProof.mimeType,
                    paymentProofSizeBytes: uploadedPaymentProof.sizeBytes,
                    paymentProofDuplicateStatus: uploadedPaymentProof.duplicateStatus,
                  }
                : {}),
            },
          },
        })
      })
    } catch (error) {
      if (error instanceof PaymentReportSlotTakenError) {
        await prisma.auditLog.create({
          data: {
            bookingRequestId: booking.id,
            action: 'payment_report_slot_taken',
            nextState: {
              operationalStatus: currentOperationalStatus,
              reason: 'slot_taken_by_other_payment',
            },
          },
        })

        if (booking.requesterPhone) {
          sendBookingWhatsapp(
            'incidence',
            { phone: booking.requesterPhone, name: booking.requesterName },
            {
              publicCode: booking.publicCode,
              incidenceReason: 'slot_taken_by_other_payment',
            },
          ).catch(() => {})
        }

        return {
          success: false,
          error:
            'El bloque ya fue tomado por otro cliente que reporto pago primero. Lamentamos el inconveniente. El equipo te contactara para ayudarte a reprogramar.',
        }
      }

      if (booking.requesterPhone) {
        sendBookingWhatsapp(
          'incidence',
          { phone: booking.requesterPhone, name: booking.requesterName },
          {
            publicCode: booking.publicCode,
            incidenceReason: 'slot_taken_by_other_payment',
          },
        ).catch(() => {})
      }

      return {
        success: false,
        error: 'No pudimos persistir el reporte de pago. Intenta de nuevo.',
      }
    }

    const calendarSync = await syncBookingToGoogleCalendar({
      publicCode: booking.publicCode,
      paymentProofId,
      serviceName: primaryItem?.serviceVariant.service.name ?? 'Sin servicio',
      variantName: primaryItem?.serviceVariant.name ?? 'Sin modalidad',
      resourceName: primaryItem?.resource?.name ?? null,
      requesterName: booking.requesterName,
      requesterPhone: booking.requesterPhone,
      eventDate: booking.eventDate,
      eventEndDate: booking.eventEndDate,
      paymentDeadline: getPaymentDeadline(booking.createdAt),
      operationalStatus: nextOperationalStatus,
      existingCalendarEventId: booking.calendarEventId,
    })

    if (!calendarSync.ok) {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'calendar_sync_failed_on_payment_reported',
          nextState: {
            operationalStatus: nextOperationalStatus,
            reason: calendarSync.reason ?? 'unknown',
          },
        },
      })
    } else if (calendarSync.eventId !== booking.calendarEventId) {
      await prisma.bookingRequest.update({
        where: { id: booking.id },
        data: {
          calendarEventId: calendarSync.eventId,
        },
      })
    }

    await sendBookingNotifications('booking.payment_reported', {
      publicCode: booking.publicCode,
      paymentProofId,
      clientName: booking.requesterName,
      clientEmail: booking.requesterEmail,
      clientWhatsapp: booking.requesterPhone,
      serviceName: primaryItem?.serviceVariant.service.name ?? null,
      variantName: primaryItem?.serviceVariant.name ?? null,
      resourceName: resolvedResourceName,
      requestCreatedAt: booking.createdAt,
      startAt: booking.eventDate,
      endAt: booking.eventEndDate,
      deadlineAt: getPaymentDeadline(booking.createdAt),
      paymentReportedAt,
      estimatedTotal: parseOptionalAmount(booking.estimatedTotal),
      currency: booking.currency,
      paymentMethod,
      paymentReference,
      status: nextOperationalStatus,
    })

    if (hasWhatsappConsentAccepted(booking.internalNotes) && booking.requesterPhone) {
      const serviceName = primaryItem?.serviceVariant.service.name ?? 'Por confirmar'
      const variantName = primaryItem?.serviceVariant.name ?? 'Por confirmar'
      const estimatedTotal = parseOptionalAmount(booking.estimatedTotal)
      const amountUsd =
        typeof estimatedTotal === 'number' && Number.isFinite(estimatedTotal)
          ? estimatedTotal.toFixed(2)
          : 'Por confirmar'
      let amountBs = 'No disponible'

      if (typeof estimatedTotal === 'number' && Number.isFinite(estimatedTotal)) {
        try {
          const referenceRate = await resolveReferenceRate()
          const computedBs = estimatedTotal * referenceRate.rate
          if (Number.isFinite(computedBs)) {
            amountBs = computedBs.toLocaleString('es-VE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }
        } catch {
          amountBs = 'No disponible'
        }
      }

      const paymentMethodLabel = formatPaymentMethodLabel(paymentMethod)
      const clientName = booking.requesterName?.trim() || 'cliente'
      const whatsappMessage = [
        `Hola, ${clientName}. Ya reportaste el pago de tu solicitud en Turpial Sound.`,
        `Código: ${booking.publicCode}`,
        `Servicio: ${serviceName}`,
        `Modalidad: ${variantName}`,
        `Monto: USD ${amountUsd}`,
        `Monto referencial: Bs. ${amountBs}`,
        `Método: ${paymentMethodLabel}`,
        'Atento a las actualizaciones de tu reserva por parte de nuestro equipo.',
      ].join('\n')

      try {
        const whatsappResult = await sendBookingWhatsappNotification({
          phone: booking.requesterPhone,
          publicCode: booking.publicCode,
          event: 'payment_reported',
          message: whatsappMessage,
        })

        if (whatsappResult.status === 'failed') {
          await prisma.auditLog
            .create({
              data: {
                bookingRequestId: booking.id,
                action: 'whatsapp_bridge_failed_on_payment_reported',
                nextState: {
                  operationalStatus: nextOperationalStatus,
                  reason: whatsappResult.reason ?? 'unknown',
                  responseStatus: whatsappResult.responseStatus ?? null,
                },
              },
            })
            .catch(() => {})
        }
      } catch {
        await prisma.auditLog
          .create({
            data: {
              bookingRequestId: booking.id,
              action: 'whatsapp_bridge_failed_on_payment_reported',
              nextState: {
                operationalStatus: nextOperationalStatus,
                reason: 'unexpected_error',
              },
            },
          })
          .catch(() => {})
      }
    }

    return {
      success: true,
      operationalStatus: nextOperationalStatus,
      bookingStatus: 'under_review',
      paymentReportedAtIso: paymentReportedAt.toISOString(),
      paymentProofId: paymentProofId ?? undefined,
      duplicateStatus: uploadedPaymentProof?.duplicateStatus,
      warning: getPaymentProofDuplicateWarning(uploadedPaymentProof?.duplicateStatus) ?? undefined,
    }
  } catch (error) {
    console.error('[reportBookingPayment]', error)
    return {
      success: false,
      error: 'No pudimos registrar tu reporte de pago. Intenta de nuevo.',
    }
  }
}
