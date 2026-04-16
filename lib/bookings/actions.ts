'use server'

import { prisma } from '@/lib/db'
import { buildPublicCode } from '@/lib/bookings'
import { CATALOG_SERVICES } from '@/lib/bookings/catalog'
import { assignResourceForRequestedSlot } from '@/lib/bookings/availability'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import { getPaymentDeadline, setOperationalStatusInInternalNotes } from '@/lib/bookings/operations'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^\+58(412|414|416|424|426)\d{7}$/

function normalizeWhatsappVe(value: string): string {
  const compact = value.replace(/[^\d+]/g, '')

  if (compact.startsWith('+58')) return compact
  if (compact.startsWith('58')) return `+${compact}`
  if (compact.startsWith('0')) return `+58${compact.slice(1)}`

  return compact
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
