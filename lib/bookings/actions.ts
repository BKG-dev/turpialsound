'use server'

// Turpial Sound - Server Actions del modulo de reservas
// Fase 1B.5c - Persistencia minima de la solicitud publica
//
// RIESGO documentado: publicCode se genera con COUNT + 1.
// No es atomico: bajo concurrencia alta puede generar colisiones.
// El constraint @unique de la DB rechazara duplicados y el catch lo reportara.
// Solucion definitiva (secuencia atomica o UUID) se implementa en una fase posterior.

import { prisma } from '@/lib/db'
import { buildPublicCode } from '@/lib/bookings'
import { CATALOG_SERVICES } from '@/lib/bookings/catalog'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const requesterPhone = input.requesterPhone.trim()

    if (!requesterName || !requesterEmail) {
      return { success: false, error: 'El nombre y el correo son obligatorios.' }
    }

    if (!EMAIL_REGEX.test(requesterEmail)) {
      return { success: false, error: 'El correo electronico no es valido.' }
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

    await prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.create({
        data: {
          publicCode,
          status: 'submitted',
          source: 'web',
          requesterName,
          requesterEmail,
          requesterPhone: requesterPhone || null,
          eventTitle,
          eventDate: eventDateTime,
          eventEndDate: eventEndDateTime,
          notes,
          submittedAt: new Date(),
        },
      })

      await tx.bookingRequestItem.create({
        data: {
          bookingRequestId: booking.id,
          serviceVariantId: serviceVariant.id,
          quantity: 1,
        },
      })
    })

    return { success: true, publicCode }
  } catch (error) {
    console.error('[submitBookingRequest]', error)
    return {
      success: false,
      error: 'Error al enviar la solicitud. Por favor intenta de nuevo.',
    }
  }
}
