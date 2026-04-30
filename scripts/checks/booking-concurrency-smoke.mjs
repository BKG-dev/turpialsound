#!/usr/bin/env node

const SCRIPT_LABEL = 'booking-concurrency-smoke'
const DEFAULT_SERVICE_SLUG = 'grabacion'
const DEFAULT_START_TIME = '10:00'
const DEFAULT_DURATION_MINUTES = 60
const MAX_ATTEMPTS = 3
const RETRYABLE_CODES = new Set(['P2034', 'P2002', '40001', '40P01'])

function printHelp() {
  console.log(`
${SCRIPT_LABEL}

Smoke local para validar que dos solicitudes concurrentes no creen dos reservas activas
para el mismo recurso y bloque horario.

Uso:
  npx tsx scripts/checks/booking-concurrency-smoke.mjs --confirm-local-db

Opciones:
  --service=<slug>        Servicio a probar. Default: ${DEFAULT_SERVICE_SLUG}
  --variant=<slug>        Variante especifica. Default: primera variante activa del servicio.
  --date=<YYYY-MM-DD>     Fecha a probar. Default: +30 dias.
  --start=<HH:mm>         Hora local America/Caracas. Default: ${DEFAULT_START_TIME}
  --duration=<minutes>    Duracion en minutos. Default: ${DEFAULT_DURATION_MINUTES}
  --keep                  No limpia las reservas creadas por este script.
  --confirm-local-db      Requerido. Confirma que DATABASE_URL apunta a una DB local/test.
  --help                  Muestra esta ayuda.

Requisitos:
  - DATABASE_URL debe estar definido en el entorno, sin imprimir su valor.
  - No ejecutar contra produccion.
  - Ejecutar con tsx para que las importaciones TypeScript del repo funcionen.
`)
}

function parseArgs(argv) {
  const args = {
    serviceSlug: DEFAULT_SERVICE_SLUG,
    variantSlug: null,
    date: getDefaultDate(),
    startTime: DEFAULT_START_TIME,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    keep: false,
    confirmLocalDb: false,
    help: false,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      args.help = true
      continue
    }

    if (arg === '--keep') {
      args.keep = true
      continue
    }

    if (arg === '--confirm-local-db') {
      args.confirmLocalDb = true
      continue
    }

    if (arg.startsWith('--service=')) {
      args.serviceSlug = arg.slice('--service='.length).trim()
      continue
    }

    if (arg.startsWith('--variant=')) {
      args.variantSlug = arg.slice('--variant='.length).trim()
      continue
    }

    if (arg.startsWith('--date=')) {
      args.date = arg.slice('--date='.length).trim()
      continue
    }

    if (arg.startsWith('--start=')) {
      args.startTime = arg.slice('--start='.length).trim()
      continue
    }

    if (arg.startsWith('--duration=')) {
      args.durationMinutes = Number(arg.slice('--duration='.length))
      continue
    }

    throw new Error(`Argumento no reconocido: ${arg}`)
  }

  return args
}

function validateArgs(args) {
  if (!args.confirmLocalDb) {
    throw new Error('Falta --confirm-local-db. No se ejecuta ningun write sin confirmacion local/test.')
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Entorno production detectado. Este smoke solo puede correr local/test.')
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no esta definido en el entorno.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error('Formato invalido para --date. Usa YYYY-MM-DD.')
  }

  if (!/^\d{2}:\d{2}$/.test(args.startTime)) {
    throw new Error('Formato invalido para --start. Usa HH:mm.')
  }

  if (!Number.isInteger(args.durationMinutes) || args.durationMinutes <= 0) {
    throw new Error('Formato invalido para --duration. Usa minutos enteros positivos.')
  }
}

async function importProjectModules() {
  try {
    const [{ prisma }, { assignResourceForRequestedSlot }] = await Promise.all([
      import('../../lib/db.ts'),
      import('../../lib/bookings/availability.ts'),
    ])

    return { prisma, assignResourceForRequestedSlot }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes('Unknown file extension ".ts"') ||
      message.includes("Cannot find package '@/")
    ) {
      throw new Error(
        'No se pudieron importar modulos TypeScript del repo. Ejecuta con: npx tsx scripts/checks/booking-concurrency-smoke.mjs --confirm-local-db',
      )
    }

    throw error
  }
}

async function findServiceVariant(prisma, args) {
  const where = {
    isActive: true,
    service: {
      slug: args.serviceSlug,
      isActive: true,
    },
  }

  if (args.variantSlug) {
    where.slug = args.variantSlug
  }

  const serviceVariant = await prisma.serviceVariant.findFirst({
    where,
    include: {
      service: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (!serviceVariant) {
    throw new Error(
      `No se encontro variante activa para service=${args.serviceSlug}` +
        (args.variantSlug ? ` variant=${args.variantSlug}` : ''),
    )
  }

  return serviceVariant
}

function buildCaracasSlotDateTime(eventDate, startTime) {
  const [year, month, day] = eventDate.split('-').map(Number)
  const [hours, minutes] = startTime.split(':').map(Number)
  const caracasUtcOffsetMinutes = -4 * 60
  const epochMs =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    caracasUtcOffsetMinutes * 60 * 1000

  return new Date(epochMs)
}

function getDefaultDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createBarrier(size) {
  let count = 0
  let release = null
  const promise = new Promise((resolve) => {
    release = resolve
  })

  return {
    async wait() {
      count += 1
      if (count === size && release) {
        release()
      }

      await promise
    },
  }
}

function getUnknownErrorCode(error) {
  if (!error || typeof error !== 'object') {
    return null
  }

  if (typeof error.code === 'string') {
    return error.code
  }

  if (error.meta && typeof error.meta === 'object' && typeof error.meta.code === 'string') {
    return error.meta.code
  }

  return null
}

function isRetryable(error) {
  const code = getUnknownErrorCode(error)
  return code !== null && RETRYABLE_CODES.has(code)
}

async function createBookingAttempt(input) {
  const {
    prisma,
    assignResourceForRequestedSlot,
    serviceVariant,
    eventDateTime,
    eventEndDateTime,
    runId,
    workerIndex,
    cleanupIds,
  } = input

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const assignment = await assignResourceForRequestedSlot(tx, {
            serviceSlug: serviceVariant.service.slug,
            eventDate: eventDateTime,
            eventEndDate: eventEndDateTime,
          })

          if (!assignment.available || !assignment.assignedResourceId) {
            return {
              outcome: 'unavailable',
              attempt,
              message: assignment.message ?? 'slot unavailable',
            }
          }

          const publicCode = `QA-CONC-${runId}-${workerIndex}`
          const booking = await tx.bookingRequest.create({
            data: {
              publicCode,
              status: 'under_review',
              source: 'qa-concurrency-smoke',
              requesterName: `QA ${SCRIPT_LABEL} ${workerIndex}`,
              requesterEmail: `${SCRIPT_LABEL}+${runId}-${workerIndex}@turpial.test`,
              requesterPhone: '+584120000001',
              eventTitle: `QA Concurrency Smoke - ${serviceVariant.service.name}`,
              eventDate: eventDateTime,
              eventEndDate: eventEndDateTime,
              notes: `${SCRIPT_LABEL}; cleanup by bookingRequestId`,
              internalNotes: '[ops_status:pending_payment]\n[qa:booking-concurrency-smoke]',
              submittedAt: new Date(),
            },
          })

          await tx.bookingRequestItem.create({
            data: {
              bookingRequestId: booking.id,
              serviceVariantId: serviceVariant.id,
              resourceId: assignment.assignedResourceId,
              quantity: 1,
            },
          })

          return {
            outcome: 'created',
            attempt,
            bookingId: booking.id,
            publicCode,
            resourceId: assignment.assignedResourceId,
          }
        },
        { isolationLevel: 'Serializable' },
      )

      if (result.outcome === 'created') {
        cleanupIds.add(result.bookingId)
      }

      return result
    } catch (error) {
      if (isRetryable(error) && attempt < MAX_ATTEMPTS) {
        continue
      }

      if (isRetryable(error)) {
        return {
          outcome: 'retry_failed',
          attempt,
          code: getUnknownErrorCode(error),
        }
      }

      return {
        outcome: 'error',
        attempt,
        code: getUnknownErrorCode(error),
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return {
    outcome: 'retry_failed',
    attempt: MAX_ATTEMPTS,
  }
}

async function cleanupBookings(prisma, cleanupIds) {
  if (cleanupIds.size === 0) {
    return
  }

  const ids = [...cleanupIds]
  await prisma.$transaction(async (tx) => {
    await tx.bookingRequestItem.deleteMany({
      where: {
        bookingRequestId: {
          in: ids,
        },
      },
    })

    await tx.bookingRequest.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  validateArgs(args)

  const runId = `${Date.now()}`
  const cleanupIds = new Set()
  let prisma = null

  try {
    const modules = await importProjectModules()
    prisma = modules.prisma
    const { assignResourceForRequestedSlot } = modules
    const serviceVariant = await findServiceVariant(prisma, args)
    const eventDateTime = buildCaracasSlotDateTime(args.date, args.startTime)
    const eventEndDateTime = new Date(
      eventDateTime.getTime() + args.durationMinutes * 60 * 1000,
    )

    const preflight = await prisma.$transaction(
      async (tx) =>
        assignResourceForRequestedSlot(tx, {
          serviceSlug: serviceVariant.service.slug,
          eventDate: eventDateTime,
          eventEndDate: eventEndDateTime,
        }),
      { isolationLevel: 'Serializable' },
    )

    if (!preflight.available || !preflight.assignedResourceId) {
      throw new Error(
        `Preflight sin slot libre para service=${serviceVariant.service.slug} date=${args.date} start=${args.startTime}. Cambia fecha/hora.`,
      )
    }

    const barrier = createBarrier(2)
    const attemptInput = {
      prisma,
      assignResourceForRequestedSlot,
      serviceVariant,
      eventDateTime,
      eventEndDateTime,
      runId,
      cleanupIds,
    }

    const [left, right] = await Promise.all([
      barrier.wait().then(() =>
        createBookingAttempt({
          ...attemptInput,
          workerIndex: 1,
        }),
      ),
      barrier.wait().then(() =>
        createBookingAttempt({
          ...attemptInput,
          workerIndex: 2,
        }),
      ),
    ])

    const results = [left, right]
    const created = results.filter((result) => result.outcome === 'created')
    const errors = results.filter((result) => result.outcome === 'error')
    const createdRows =
      cleanupIds.size > 0
        ? await prisma.bookingRequest.findMany({
            where: {
              id: {
                in: [...cleanupIds],
              },
            },
            include: {
              items: {
                select: {
                  resourceId: true,
                },
              },
            },
          })
        : []

    const activeSameResourceRows = createdRows.filter((booking) =>
      booking.items.some((item) => item.resourceId === preflight.assignedResourceId),
    )

    console.log(`[${SCRIPT_LABEL}] Run ID: ${runId}`)
    console.log(
      `[${SCRIPT_LABEL}] Slot: service=${serviceVariant.service.slug} variant=${serviceVariant.slug} date=${args.date} start=${args.startTime} duration=${args.durationMinutes}`,
    )
    console.table(
      results.map((result, index) => ({
        worker: index + 1,
        outcome: result.outcome,
        attempt: result.attempt,
        publicCode: result.publicCode ?? '',
        resourceId: result.resourceId ?? '',
        code: result.code ?? '',
        message: result.message ?? '',
      })),
    )
    console.table([
      { metric: 'created_results', value: created.length },
      { metric: 'test_rows_same_resource', value: activeSameResourceRows.length },
      { metric: 'unexpected_errors', value: errors.length },
    ])

    const passed =
      created.length === 1 &&
      activeSameResourceRows.length === 1 &&
      errors.length === 0 &&
      results.length === 2

    if (!passed) {
      process.exitCode = 1
      console.error(
        `[${SCRIPT_LABEL}] FAIL: se esperaba exactamente 1 reserva creada y 0 errores inesperados.`,
      )
      return
    }

    console.log(`[${SCRIPT_LABEL}] OK: no se crearon dos reservas activas para el mismo recurso/slot.`)
  } finally {
    if (prisma) {
      if (!args?.keep) {
        await cleanupBookings(prisma, cleanupIds)
      }

      await prisma.$disconnect()
    }
  }
}

void main().catch((error) => {
  console.error(`[${SCRIPT_LABEL}] Error fatal`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
