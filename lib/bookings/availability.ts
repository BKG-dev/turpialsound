import { Prisma } from '@/generated/prisma/client'
import { PAYMENT_WINDOW_MINUTES } from '@/lib/bookings/operations'

type ManagedServiceSlug = 'grabacion' | 'podcast-locucion' | 'sala-ensayo'
type ResourceSlug =
  | 'sala-1-grande'
  | 'sala-2-podcast-locucion'
  | 'sala-3-ensayo'

interface ResourceAssignmentResult {
  shouldBlockResource: boolean
  assignedResourceId: string | null
  available: boolean
  message?: string
}

const CANONICAL_RESOURCE_ORDER: ResourceSlug[] = [
  'sala-1-grande',
  'sala-2-podcast-locucion',
  'sala-3-ensayo',
]

const CANONICAL_RESOURCE_NAMES: Record<ResourceSlug, string> = {
  'sala-1-grande': 'Sala 1 Grande',
  'sala-2-podcast-locucion': 'Sala 2 Podcast / Locucion',
  'sala-3-ensayo': 'Sala 3 Ensayo',
}

const RESOURCE_ALIAS_FALLBACK: Partial<Record<ResourceSlug, string[]>> = {
  'sala-1-grande': ['estudio-grabacion', 'estudio de grabacion'],
  'sala-2-podcast-locucion': ['booth-voz', 'booth de voz'],
  'sala-3-ensayo': ['sala-ensayo-a', 'sala ensayo a'],
}

function isManagedServiceSlug(serviceSlug: string): serviceSlug is ManagedServiceSlug {
  return serviceSlug === 'grabacion' || serviceSlug === 'podcast-locucion' || serviceSlug === 'sala-ensayo'
}

function getResourcePriorityByService(serviceSlug: ManagedServiceSlug): ResourceSlug[] {
  if (serviceSlug === 'grabacion') {
    return ['sala-1-grande']
  }

  if (serviceSlug === 'podcast-locucion') {
    return ['sala-2-podcast-locucion']
  }

  return ['sala-3-ensayo', 'sala-1-grande']
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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

async function resourceHasCollision(
  tx: Prisma.TransactionClient,
  resourceId: string,
  start: Date,
  end: Date,
): Promise<boolean> {
  const pendingPaymentCutoff = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000)

  const count = await tx.bookingRequest.count({
    where: {
      OR: [
        { status: { in: ['approved', 'confirmed'] } },
        {
          status: 'under_review',
          createdAt: { gte: pendingPaymentCutoff },
        },
      ],
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

async function lockResourceRowsForAssignment(
  tx: Prisma.TransactionClient,
  resourceIds: string[],
): Promise<void> {
  if (resourceIds.length === 0) {
    return
  }

  await tx.$queryRaw`
    SELECT id
    FROM resources
    WHERE id IN (${Prisma.join(resourceIds)})
    ORDER BY id
    FOR UPDATE
  `
}

async function resolveResourceIdsByCanonicalSlug(
  tx: Prisma.TransactionClient,
): Promise<Record<ResourceSlug, string | null>> {
  const activeResources = await tx.resource.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })

  const bySlug = new Map(activeResources.map((resource) => [normalizeText(resource.slug), resource.id]))
  const byName = new Map(activeResources.map((resource) => [normalizeText(resource.name), resource.id]))
  const resolved: Record<ResourceSlug, string | null> = {
    'sala-1-grande': null,
    'sala-2-podcast-locucion': null,
    'sala-3-ensayo': null,
  }

  for (const canonicalSlug of CANONICAL_RESOURCE_ORDER) {
    const canonicalId = bySlug.get(normalizeText(canonicalSlug))
    if (canonicalId) {
      resolved[canonicalSlug] = canonicalId
      continue
    }

    const canonicalNameId = byName.get(normalizeText(CANONICAL_RESOURCE_NAMES[canonicalSlug]))
    if (canonicalNameId) {
      resolved[canonicalSlug] = canonicalNameId
      continue
    }

    const aliasFallback = RESOURCE_ALIAS_FALLBACK[canonicalSlug] ?? []
    const fallbackId =
      aliasFallback
        .map((alias) => bySlug.get(normalizeText(alias)) ?? byName.get(normalizeText(alias)))
        .find((id) => Boolean(id)) ?? null
    resolved[canonicalSlug] = fallbackId
  }

  return resolved
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

  const resourcesByCanonicalSlug = await resolveResourceIdsByCanonicalSlug(tx)
  const orderedResourceIds = getResourcePriorityByService(params.serviceSlug)
    .map((slug) => resourcesByCanonicalSlug[slug])
    .filter((value): value is string => Boolean(value))

  if (orderedResourceIds.length === 0) {
    const requiredSlugs = getResourcePriorityByService(params.serviceSlug).join(', ')
    return {
      shouldBlockResource: true,
      assignedResourceId: null,
      available: false,
      message:
        `No se encontraron recursos operativos activos para: ${requiredSlugs}. Verifica seed y slugs canónicos.`,
    }
  }

  await lockResourceRowsForAssignment(tx, orderedResourceIds)

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
