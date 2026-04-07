'use server'

// Turpial Sound — Server Actions del módulo de reservas
// Fase 1B.5 — Envío de solicitud pública al wizard
//
// RIESGO documentado: publicCode se genera con COUNT + 1.
// No es atómico: bajo concurrencia alta puede generar colisiones.
// El constraint @unique de la DB rechazará duplicados y el catch lo reportará.
// Solución definitiva (secuencia atómica o UUID) se implementa en una fase posterior.

import { prisma } from '@/lib/db'
import { buildPublicCode } from '@/lib/bookings'
import { CATALOG_SERVICES } from '@/lib/bookings/catalog'

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

export interface SubmitBookingInput {
  serviceSlug: string
  variantSlug: string
  eventDate: string        // "YYYY-MM-DD"
  startTime: string        // "HH:MM"
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

// ─────────────────────────────────────────────────────────────────
// ACTION
// ─────────────────────────────────────────────────────────────────

export async function submitBookingRequest(
  input: SubmitBookingInput,
): Promise<SubmitBookingResult> {
  try {
    // Validaciones mínimas de seguridad (el wizard ya valida en cliente)
    if (
      !input.serviceSlug ||
      !input.variantSlug ||
      !input.eventDate ||
      !input.startTime ||
      !input.durationMinutes
    ) {
      return { success: false, error: 'Faltan datos obligatorios en la solicitud.' }
    }
    if (!input.requesterName.trim() || !input.requesterEmail.trim()) {
      return { success: false, error: 'El nombre y el correo son obligatorios.' }
    }

    // Buscar ServiceVariant por slug
    const serviceVariant = await prisma.serviceVariant.findUnique({
      where: { slug: input.variantSlug },
    })
    if (!serviceVariant) {
      return { success: false, error: 'Modalidad no encontrada. Intenta de nuevo.' }
    }

    // Generar publicCode secuencial por año (ver riesgo documentado arriba)
    const year = new Date().getFullYear()
    const existing = await prisma.bookingRequest.count({
      where: { publicCode: { startsWith: `TUR-${year}-` } },
    })
    const publicCode = buildPublicCode(year, existing + 1)

    // Construir DateTimes
    // NOTA: se usa la hora local del servidor. Timezone del cliente no se transmite en esta fase.
    const eventDateTime = new Date(`${input.eventDate}T${input.startTime}:00`)
    const eventEndDateTime = new Date(
      eventDateTime.getTime() + input.durationMinutes * 60 * 1000,
    )

    // Construir notas a partir de extras
    const notesParts: string[] = []
    if (input.extrasTechnician) notesParts.push('Técnico de sonido: requerido')
    if (input.extrasBackline) notesParts.push('Backline / equipamiento adicional: requerido')
    if (input.extrasNotes.trim()) notesParts.push(input.extrasNotes.trim())
    const notes = notesParts.length > 0 ? notesParts.join('\n') : null

    // Derivar título del evento
    const serviceName =
      CATALOG_SERVICES.find((s) => s.slug === input.serviceSlug)?.name ?? 'Servicio'
    const eventTitle = `Solicitud — ${serviceName}`

    // Crear BookingRequest + BookingRequestItem en una transacción
    await prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.create({
        data: {
          publicCode,
          status: 'submitted',
          source: 'web',
          requesterName: input.requesterName.trim(),
          requesterEmail: input.requesterEmail.trim().toLowerCase(),
          requesterPhone: input.requesterPhone.trim() || null,
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
