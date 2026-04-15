import type { BookingStatus, Prisma } from '@/generated/prisma/client'

const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ['under_review', 'approved', 'confirmed']

type ManagedServiceSlug = 'grabacion' | 'podcast-locucion' | 'sala-ensayo'
type ResourceSlot = 'sala1' | 'sala2' | 'sala3'

interface ResourceRecord {
  id: string
  slug: string
  name: string
}

interface ResourceAssignmentResult {
  shouldBlockResource: boolean
  assignedResourceId: string | null
  available: boolean
  message?: string
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isManagedServiceSlug(serviceSlug: string): serviceSlug is ManagedServiceSlug {
  return serviceSlug === 'grabacion' || serviceSlug === 'podcast-locucion' || serviceSlug === 'sala-ensayo'
}

function slotMatchesResource(slot: ResourceSlot, resource: ResourceRecord): boolean {
  const slug = normalizeText(resource.slug)
  const name = normalizeText(resource.name)
  const text = `${slug} ${name}`

  if (slot === 'sala1') {
    return text.includes('sala-1') || text.includes('sala 1') || text.includes('sala1')
  }

  if (slot === 'sala2') {
    return text.includes('sala-2') || text.includes('sala 2') || text.includes('sala2')
  }

  return text.includes('sala-3') || text.includes('sala 3') || text.includes('sala3')
}

function getSlotPriorityByService(serviceSlug: ManagedServiceSlug): ResourceSlot[] {
  if (serviceSlug === 'grabacion') {
    return ['sala1']
  }

  if (serviceSlug === 'podcast-locucion') {
    return ['sala2']
  }

  return ['sala3', 'sala1']
}

function getServiceUnavailableMessage(serviceSlug: ManagedServiceSlug): string {
  if (serviceSlug === 'podcast-locucion') {
    return 'El bloque seleccionado no esta disponible para Podcast/Locucion. Elige otro horario.'
  }

  if (serviceSlug === 'grabacion') {
    return 'El bloque seleccionado no esta disponible para Grabacion. Elige otro horario.'
  }

  return 'No hay salas disponibles para Sala de Ensayo en ese bloque. Elige otro horario.'
}

async function resourceHasCollision(
  tx: Prisma.TransactionClient,
  resourceId: string,
  start: Date,
  end: Date,
): Promise<boolean> {
  const count = await tx.bookingRequest.count({
    where: {
      status: { in: BLOCKING_BOOKING_STATUSES },
      eventDate: { lt: end },
      AND: [
        {
          OR: [
            { eventEndDate: { gt: start } },
            {
              eventEndDate: null,
              eventDate: { gte: start },
            },
          ],
        },
      ],
      items: {
        some: {
          resourceId,
        },
      },
    },
  })

  return count > 0
}

export async function assignResourceForRequestedSlot(
  tx: Prisma.TransactionClient,
  params: {
    serviceSlug: string
    eventDate: Date
    eventEndDate: Date
  },
): Promise<ResourceAssignmentResult> {
  if (!isManagedServiceSlug(params.serviceSlug)) {
    return {
      shouldBlockResource: false,
      assignedResourceId: null,
      available: true,
    }
  }

  const activeResources = await tx.resource.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })

  const slotPriority = getSlotPriorityByService(params.serviceSlug)
  const slotToResourceId: Partial<Record<ResourceSlot, string>> = {}

  for (const slot of slotPriority) {
    const found = activeResources.find((resource) => slotMatchesResource(slot, resource))
    if (found) {
      slotToResourceId[slot] = found.id
    }
  }

  const orderedResourceIds = slotPriority
    .map((slot) => slotToResourceId[slot])
    .filter((value): value is string => Boolean(value))

  if (orderedResourceIds.length === 0) {
    return {
      shouldBlockResource: true,
      assignedResourceId: null,
      available: false,
      message: 'No se encontraron salas operativas configuradas para este servicio.',
    }
  }

  for (const resourceId of orderedResourceIds) {
    const hasCollision = await resourceHasCollision(
      tx,
      resourceId,
      params.eventDate,
      params.eventEndDate,
    )

    if (!hasCollision) {
      return {
        shouldBlockResource: true,
        assignedResourceId: resourceId,
        available: true,
      }
    }
  }

  return {
    shouldBlockResource: true,
    assignedResourceId: null,
    available: false,
    message: getServiceUnavailableMessage(params.serviceSlug),
  }
}
