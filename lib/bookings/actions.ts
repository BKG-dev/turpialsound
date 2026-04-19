'use server'

import { prisma } from '@/lib/db'
import { buildPublicCode } from '@/lib/bookings'
import { CATALOG_SERVICES } from '@/lib/bookings/catalog'
import { assignResourceForRequestedSlot } from '@/lib/bookings/availability'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import {
  getOperationalStatus,
  getPaymentDeadline,
  mapOperationalStatusToBookingStatus,
  setOperationalStatusInInternalNotes,
} from '@/lib/bookings/operations'
import { getEnabledPaymentMethods, type BookingPaymentMethodSlug } from '@/lib/bookings/payment-settings'
import {
  isAllowedPaymentProofMimeType,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  storePaymentProof,
} from '@/lib/bookings/payment-proof-storage'
import { sendBookingNotifications } from '@/lib/bookings/notifications'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^\+58(412|414|416|424|426)\d{7}$/

function normalizeWhatsappVe(value: string): string {
  const compact = value.replace(/[^\d+]/g, '')

  if (compact.startsWith('+58')) return compact
  if (compact.startsWith('58')) return `+${compact}`
  if (compact.startsWith('0')) return `+58${compact.slice(1)}`

  return compact
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
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
}

export interface SubmitBookingResult {
  success: boolean
  publicCode?: string
  assignedResourceName?: string | null
  paymentDeadlineIso?: string
  error?: string
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

    const year = new Date().getFullYear()
    const existing = await prisma.bookingRequest.count({
      where: { publicCode: { startsWith: `TUR-${year}-` } },
    })
    const publicCode = buildPublicCode(year, existing + 1)

    const eventDateTime = new Date(`${input.eventDate}T${input.startTime}:00`)
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

    const submitResult = await prisma.$transaction(async (tx) => {
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
          internalNotes: setOperationalStatusInInternalNotes(null, 'pending_payment'),
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
    })

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
      status: 'pending_payment',
    })

    return {
      success: true,
      publicCode: submitResult.publicCode,
      assignedResourceName: submitResult.resourceName,
      paymentDeadlineIso: paymentDeadline.toISOString(),
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
  paymentReportedAtIso?: string
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

    if (!(paymentProofFile instanceof File)) {
      return { success: false, error: 'Debes adjuntar el comprobante en JPG.' }
    }

    if (!isAllowedPaymentProofMimeType(paymentProofFile.type)) {
      return { success: false, error: 'Solo se acepta comprobante JPG/JPEG.' }
    }

    if (paymentProofFile.size <= 0) {
      return { success: false, error: 'El comprobante no puede estar vacio.' }
    }

    if (paymentProofFile.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
      return { success: false, error: 'El comprobante supera el maximo permitido de 5 MB.' }
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
          take: 1,
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

    if (currentOperationalStatus === 'payment_reported') {
      return { success: false, error: 'Esta solicitud ya tiene un pago reportado.' }
    }

    if (currentOperationalStatus !== 'pending_payment') {
      return {
        success: false,
        error: 'Solo puedes reportar pago cuando la solicitud esta en estado pendiente de pago.',
      }
    }

    const storedProof = await storePaymentProof({ file: paymentProofFile })
    const paymentReportedAt = new Date()
    const nextOperationalStatus = 'payment_reported' as const
    const nextBookingStatus = mapOperationalStatusToBookingStatus(nextOperationalStatus)
    const updatedInternalNotes = setOperationalStatusInInternalNotes(
      booking.internalNotes,
      nextOperationalStatus,
    )

    await prisma.$transaction([
      prisma.bookingRequest.update({
        where: { id: booking.id },
        data: {
          status: nextBookingStatus,
          internalNotes: updatedInternalNotes,
        },
      }),
      prisma.auditLog.create({
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
            paymentProofUrl: storedProof.proofUrl,
            paymentProofMimeType: storedProof.mimeType,
            paymentProofSizeBytes: storedProof.sizeBytes,
            paymentReportedAt: paymentReportedAt.toISOString(),
          },
        },
      }),
    ])

    const primaryItem = booking.items[0]
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
      paymentMethod,
      status: nextOperationalStatus,
    })

    return {
      success: true,
      operationalStatus: nextOperationalStatus,
      paymentReportedAtIso: paymentReportedAt.toISOString(),
    }
  } catch (error) {
    console.error('[reportBookingPayment]', error)
    return {
      success: false,
      error: 'No pudimos registrar tu reporte de pago. Intenta de nuevo.',
    }
  }
}
