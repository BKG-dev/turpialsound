import 'dotenv/config'

import { prisma } from '@/lib/db'
import type { Prisma } from '@/generated/prisma/client'
import { submitBookingRequest, type SubmitBookingInput } from '@/lib/bookings/actions'
import { CATALOG_SERVICES, getVariantsForService } from '@/lib/bookings/catalog'

type DateKind = 'weekday' | 'weekend'

interface ExtrasProfile {
  key: string
  extrasTechnician: boolean
  extrasBackline: boolean
  extrasNotes: string
}

interface Scenario {
  index: number
  label: string
  serviceSlug: string
  serviceName: string
  variantSlug: string
  variantName: string
  durationMinutes: number
  eventDate: string
  dateKind: DateKind
  startTime: string
  extrasProfile: ExtrasProfile
  requesterName: string
  requesterEmail: string
  requesterPhone: string
}

interface ScenarioResult {
  scenario: Scenario
  ok: boolean
  publicCode?: string
  persistedId?: string
  failure?: string
}

interface CatalogIntegrityReport {
  missing: string[]
  mismatched: string[]
}

type PersistedBookingWithItems = Prisma.BookingRequestGetPayload<{
  include: {
    items: {
      include: {
        serviceVariant: {
          select: {
            slug: true
          }
        }
      }
    }
  }
}>

const SCRIPT_LABEL = 'booking-persistence-validation'
const START_TIME = '10:00'
const DURATION_OPTIONS = [60, 90, 120, 180]
const EXTRAS_PROFILES: ExtrasProfile[] = [
  {
    key: 'none',
    extrasTechnician: false,
    extrasBackline: false,
    extrasNotes: '',
  },
  {
    key: 'technician',
    extrasTechnician: true,
    extrasBackline: false,
    extrasNotes: '',
  },
  {
    key: 'backline',
    extrasTechnician: false,
    extrasBackline: true,
    extrasNotes: '',
  },
  {
    key: 'both',
    extrasTechnician: true,
    extrasBackline: true,
    extrasNotes: '',
  },
  {
    key: 'notes-only',
    extrasTechnician: false,
    extrasBackline: false,
    extrasNotes: 'Validacion automatizada de persistencia.',
  },
  {
    key: 'both-with-notes',
    extrasTechnician: true,
    extrasBackline: true,
    extrasNotes: 'Validacion automatizada con multilinea controlada.',
  },
]

async function main() {
  const runId = `${Date.now()}`
  const cleanupQueue = new Set<string>()

  try {
    const catalogIntegrity = await getCatalogIntegrityReport()

    const dates = {
      weekday: getNextDateByKind('weekday'),
      weekend: getNextDateByKind('weekend'),
    }

    const scenarios = buildScenarios(runId, dates)

    console.log(`\n[${SCRIPT_LABEL}] Inicio`)
    console.log(`[${SCRIPT_LABEL}] Run ID: ${runId}`)
    console.log(
      `[${SCRIPT_LABEL}] Estrategia de aislamiento: insercion real via server action con requesterEmail unico por escenario y cleanup exacto por bookingRequestId.`,
    )
    console.log(
      `[${SCRIPT_LABEL}] Fecha weekday: ${dates.weekday} | Fecha weekend: ${dates.weekend}`,
    )
    console.log(
      `[${SCRIPT_LABEL}] Cobertura: ${scenarios.length} escenarios (todas las variantes del catalogo del wizard x 4 duraciones x weekday/weekend; perfiles de extras y telefono rotados para cubrir ramas reales sin inflar el grid).`,
    )
    if (catalogIntegrity.missing.length > 0 || catalogIntegrity.mismatched.length > 0) {
      console.log(
        `[${SCRIPT_LABEL}] Preflight catalogo/DB detecto diferencias: missing=${catalogIntegrity.missing.length}, mismatched=${catalogIntegrity.mismatched.length}`,
      )
    }

    const results: ScenarioResult[] = []

    for (const scenario of scenarios) {
      const result = await runScenario(scenario)
      results.push(result)

      if (result.persistedId) {
        cleanupQueue.add(result.persistedId)
      }

      const status = result.ok ? 'OK' : 'FAIL'
      const codeSuffix = result.publicCode ? ` | ${result.publicCode}` : ''
      const failureSuffix = result.failure ? ` | ${result.failure}` : ''
      console.log(`[${status}] ${scenario.label}${codeSuffix}${failureSuffix}`)

      if (result.persistedId) {
        await cleanupPersistedBooking(result.persistedId)
        cleanupQueue.delete(result.persistedId)
      }
    }

    printSummary(results, catalogIntegrity)

    const failed = results.filter((result) => !result.ok)
    if (failed.length > 0) {
      process.exitCode = 1
    }
  } finally {
    for (const bookingRequestId of cleanupQueue) {
      await cleanupPersistedBooking(bookingRequestId).catch((error) => {
        console.error(
          `[${SCRIPT_LABEL}] Cleanup pendiente para ${bookingRequestId}:`,
          error,
        )
      })
    }

    await prisma.$disconnect()
  }
}

async function getCatalogIntegrityReport(): Promise<CatalogIntegrityReport> {
  const dbVariants = await prisma.serviceVariant.findMany({
    select: {
      slug: true,
      service: {
        select: {
          slug: true,
        },
      },
    },
  })

  const dbVariantMap = new Map(
    dbVariants.map((variant) => [variant.slug, variant.service.slug]),
  )

  const missing: string[] = []
  const mismatched: string[] = []

  for (const service of CATALOG_SERVICES) {
    for (const variant of getVariantsForService(service.slug)) {
      const dbServiceSlug = dbVariantMap.get(variant.slug)

      if (!dbServiceSlug) {
        missing.push(variant.slug)
        continue
      }

      if (dbServiceSlug !== service.slug) {
        mismatched.push(`${variant.slug}=>${dbServiceSlug}`)
      }
    }
  }

  return { missing, mismatched }
}

function buildScenarios(
  runId: string,
  dates: Record<DateKind, string>,
): Scenario[] {
  const scenarios: Scenario[] = []
  let index = 0

  for (const service of CATALOG_SERVICES) {
    for (const variant of getVariantsForService(service.slug)) {
      for (const dateKind of ['weekday', 'weekend'] as const) {
        for (const durationMinutes of DURATION_OPTIONS) {
          const extrasProfile = EXTRAS_PROFILES[index % EXTRAS_PROFILES.length]
          const withPhone = index % 2 === 0

          scenarios.push({
            index,
            label:
              `${String(index + 1).padStart(3, '0')} ` +
              `${service.slug}/${variant.slug} ` +
              `${dateKind} ${durationMinutes}m extras=${extrasProfile.key} ` +
              `phone=${withPhone ? 'yes' : 'no'}`,
            serviceSlug: service.slug,
            serviceName: service.name,
            variantSlug: variant.slug,
            variantName: variant.name,
            durationMinutes,
            eventDate: dates[dateKind],
            dateKind,
            startTime: START_TIME,
            extrasProfile,
            requesterName: `Codex ${SCRIPT_LABEL} ${index + 1}`,
            requesterEmail: `${SCRIPT_LABEL}+${runId}-${index + 1}@turpial.test`,
            requesterPhone: withPhone ? `+58 412 000 ${String(index + 1).padStart(4, '0')}` : '',
          })

          index += 1
        }
      }
    }
  }

  return scenarios
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const payload: SubmitBookingInput = {
    serviceSlug: scenario.serviceSlug,
    variantSlug: scenario.variantSlug,
    eventDate: scenario.eventDate,
    startTime: scenario.startTime,
    durationMinutes: scenario.durationMinutes,
    extrasNotes: scenario.extrasProfile.extrasNotes,
    extrasTechnician: scenario.extrasProfile.extrasTechnician,
    extrasBackline: scenario.extrasProfile.extrasBackline,
    requesterName: scenario.requesterName,
    requesterEmail: scenario.requesterEmail,
    requesterPhone: scenario.requesterPhone,
  }

  const submitResult = await submitBookingRequest(payload)
  if (!submitResult.success || !submitResult.publicCode) {
    return {
      scenario,
      ok: false,
      failure: `submitBookingRequest devolvio error: ${submitResult.error ?? 'sin detalle'}`,
    }
  }

  const persisted = await prisma.bookingRequest.findFirst({
    where: { requesterEmail: scenario.requesterEmail },
    include: {
      items: {
        include: {
          serviceVariant: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!persisted) {
    return {
      scenario,
      ok: false,
      publicCode: submitResult.publicCode,
      failure: `submit exitoso pero no se encontro bookingRequest por requesterEmail=${scenario.requesterEmail}`,
    }
  }

  const validationErrors = validatePersistedBooking({
    scenario,
    publicCode: submitResult.publicCode,
    persisted,
  })

  return {
    scenario,
    ok: validationErrors.length === 0,
    publicCode: submitResult.publicCode,
    persistedId: persisted.id,
    failure: validationErrors.length > 0 ? validationErrors.join(' | ') : undefined,
  }
}

function validatePersistedBooking(input: {
  scenario: Scenario
  publicCode: string
  persisted: PersistedBookingWithItems | null
}) {
  const { scenario, publicCode, persisted } = input
  const errors: string[] = []

  if (!persisted) {
    return ['bookingRequest no encontrado']
  }

  const expectedNotes = buildExpectedNotes(scenario.extrasProfile)
  const expectedEventDate = new Date(`${scenario.eventDate}T${scenario.startTime}:00`)
  const expectedEventEndDate = new Date(
    expectedEventDate.getTime() + scenario.durationMinutes * 60 * 1000,
  )
  const expectedEventTitle = `Solicitud - ${scenario.serviceName}`
  const persistedItem = persisted.items[0]

  if (persisted.publicCode !== publicCode) {
    errors.push(
      `publicCode persistido distinto (${persisted.publicCode} != ${publicCode})`,
    )
  }

  if (persisted.status !== 'submitted') {
    errors.push(`status inesperado (${persisted.status})`)
  }

  if (persisted.source !== 'web') {
    errors.push(`source inesperado (${persisted.source})`)
  }

  if (persisted.requesterName !== scenario.requesterName) {
    errors.push('requesterName no coincide')
  }

  if (persisted.requesterEmail !== scenario.requesterEmail) {
    errors.push('requesterEmail no coincide')
  }

  const expectedPhone = scenario.requesterPhone.trim() || null
  if ((persisted.requesterPhone ?? null) !== expectedPhone) {
    errors.push(
      `requesterPhone inesperado (${String(persisted.requesterPhone)} != ${String(expectedPhone)})`,
    )
  }

  if (persisted.eventTitle !== expectedEventTitle) {
    errors.push(`eventTitle inesperado (${persisted.eventTitle})`)
  }

  if (persisted.eventDate.getTime() !== expectedEventDate.getTime()) {
    errors.push(
      `eventDate inesperado (${persisted.eventDate.toISOString()} != ${expectedEventDate.toISOString()})`,
    )
  }

  if (!persisted.eventEndDate) {
    errors.push('eventEndDate no persistido')
  } else if (persisted.eventEndDate.getTime() !== expectedEventEndDate.getTime()) {
    errors.push(
      `eventEndDate inesperado (${persisted.eventEndDate.toISOString()} != ${expectedEventEndDate.toISOString()})`,
    )
  }

  if ((persisted.notes ?? null) !== expectedNotes) {
    errors.push(`notes inesperado (${String(persisted.notes)} != ${String(expectedNotes)})`)
  }

  if (!persisted.submittedAt) {
    errors.push('submittedAt no persistido')
  }

  if (persisted.items.length !== 1) {
    errors.push(`cantidad de items inesperada (${persisted.items.length})`)
  } else {
    if (persistedItem.serviceVariant.slug !== scenario.variantSlug) {
      errors.push(
        `serviceVariant persistido distinto (${persistedItem.serviceVariant.slug} != ${scenario.variantSlug})`,
      )
    }

    if (persistedItem.quantity !== 1) {
      errors.push(`quantity inesperado (${persistedItem.quantity})`)
    }
  }

  return errors
}

function buildExpectedNotes(extrasProfile: ExtrasProfile): string | null {
  const notesParts: string[] = []
  if (extrasProfile.extrasTechnician) notesParts.push('Tecnico de sonido: requerido')
  if (extrasProfile.extrasBackline) {
    notesParts.push('Backline / equipamiento adicional: requerido')
  }
  if (extrasProfile.extrasNotes.trim()) notesParts.push(extrasProfile.extrasNotes.trim())
  return notesParts.length > 0 ? notesParts.join('\n') : null
}

async function cleanupPersistedBooking(bookingRequestId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.bookingRequestItem.deleteMany({
      where: {
        bookingRequestId,
      },
    })

    await tx.bookingRequest.delete({
      where: {
        id: bookingRequestId,
      },
    })
  })
}

function getNextDateByKind(kind: DateKind) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + 1)

  while (true) {
    const day = date.getDay()
    const isWeekend = day === 0 || day === 6

    if ((kind === 'weekend' && isWeekend) || (kind === 'weekday' && !isWeekend)) {
      return formatDateInput(date)
    }

    date.setDate(date.getDate() + 1)
  }
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function printSummary(results: ScenarioResult[], catalogIntegrity: CatalogIntegrityReport) {
  const okResults = results.filter((result) => result.ok)
  const failedResults = results.filter((result) => !result.ok)

  console.log('\nResumen general')
  console.table([
    { metric: 'Escenarios totales', value: results.length },
    { metric: 'OK', value: okResults.length },
    { metric: 'FAIL', value: failedResults.length },
  ])

  const byService = [...new Set(results.map((result) => result.scenario.serviceSlug))].map(
    (serviceSlug) => {
      const serviceResults = results.filter(
        (result) => result.scenario.serviceSlug === serviceSlug,
      )
      return {
        serviceSlug,
        total: serviceResults.length,
        ok: serviceResults.filter((result) => result.ok).length,
        fail: serviceResults.filter((result) => !result.ok).length,
      }
    },
  )

  console.log('Resumen por servicio')
  console.table(byService)

  if (catalogIntegrity.missing.length > 0 || catalogIntegrity.mismatched.length > 0) {
    console.log('Preflight catalogo vs DB')
    console.table([
      {
        issue: 'missing_variants',
        count: catalogIntegrity.missing.length,
        values: catalogIntegrity.missing.join(', '),
      },
      {
        issue: 'mismatched_variants',
        count: catalogIntegrity.mismatched.length,
        values: catalogIntegrity.mismatched.join(', '),
      },
    ])
  }

  if (failedResults.length === 0) {
    console.log('Sin fallos detectados.')
    return
  }

  console.log('Fallos detectados')
  console.table(
    failedResults.map((result) => ({
      scenario: result.scenario.label,
      serviceSlug: result.scenario.serviceSlug,
      variantSlug: result.scenario.variantSlug,
      eventDate: result.scenario.eventDate,
      durationMinutes: result.scenario.durationMinutes,
      extrasProfile: result.scenario.extrasProfile.key,
      requesterPhone: result.scenario.requesterPhone ? 'yes' : 'no',
      failure: result.failure ?? 'sin detalle',
      payload: JSON.stringify({
        serviceSlug: result.scenario.serviceSlug,
        variantSlug: result.scenario.variantSlug,
        eventDate: result.scenario.eventDate,
        startTime: result.scenario.startTime,
        durationMinutes: result.scenario.durationMinutes,
        extrasTechnician: result.scenario.extrasProfile.extrasTechnician,
        extrasBackline: result.scenario.extrasProfile.extrasBackline,
        extrasNotes: result.scenario.extrasProfile.extrasNotes,
        requesterPhone: result.scenario.requesterPhone,
      }),
    })),
  )
}

void main().catch((error) => {
  console.error(`\n[${SCRIPT_LABEL}] Error fatal`)
  console.error(error)
  process.exit(1)
})
