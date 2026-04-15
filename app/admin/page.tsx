import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  ADMIN_LOGIN_PATH,
  SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
  isValidAdminSessionValue,
} from '@/lib/auth/session'
import {
  getOperationalStatus,
  isOperationalBookingStatus,
  mapOperationalStatusToBookingStatus,
  OPERATIONAL_BOOKING_STATUSES,
  OPERATIONAL_STATUS_LABELS,
  setOperationalStatusInInternalNotes,
  type OperationalBookingStatus,
} from '@/lib/bookings/operations'

type SearchParamValue = string | string[] | undefined

interface AdminPageProps {
  searchParams?:
    | Promise<{
        date?: SearchParamValue
        status?: SearchParamValue
      }>
    | {
        date?: SearchParamValue
        status?: SearchParamValue
      }
}

function getSingleValue(value: SearchParamValue): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return null
}

function getDateRangeFromInput(dateInput: string | null): { gte: Date; lt: Date } | null {
  if (!dateInput) {
    return null
  }

  const date = new Date(`${dateInput}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  return { gte: date, lt: nextDay }
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function formatSchedule(eventDate: Date, eventEndDate: Date | null): string {
  const start = formatDateTime(eventDate)
  if (!eventEndDate) {
    return start
  }

  const end = new Intl.DateTimeFormat('es-VE', {
    timeStyle: 'short',
  }).format(eventEndDate)
  return `${start} - ${end}`
}

async function updateOperationalStatus(formData: FormData) {
  'use server'

  const bookingRequestId = formData.get('bookingRequestId')?.toString().trim()
  const nextStatus = formData.get('nextStatus')?.toString().trim()
  const returnPath = formData.get('returnPath')?.toString().trim() || '/admin'

  if (!bookingRequestId || !nextStatus || !isOperationalBookingStatus(nextStatus)) {
    redirect(returnPath)
  }

  const current = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    select: {
      status: true,
      internalNotes: true,
    },
  })

  if (!current) {
    redirect(returnPath)
  }

  const currentOperationalStatus = getOperationalStatus(current)
  const mappedBookingStatus = mapOperationalStatusToBookingStatus(nextStatus)
  const updatedInternalNotes = setOperationalStatusInInternalNotes(
    current.internalNotes,
    nextStatus,
  )

  await prisma.$transaction([
    prisma.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        status: mappedBookingStatus,
        internalNotes: updatedInternalNotes,
      },
    }),
    prisma.auditLog.create({
      data: {
        bookingRequestId,
        action: 'operational_status_changed',
        previousState: {
          operationalStatus: currentOperationalStatus,
          bookingStatus: current.status,
        },
        nextState: {
          operationalStatus: nextStatus,
          bookingStatus: mappedBookingStatus,
        },
      },
    }),
  ])

  revalidatePath('/admin')
  redirect(returnPath)
}

async function logoutAdminSession() {
  'use server'

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  })

  redirect(ADMIN_LOGIN_PATH)
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies()
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!isValidAdminSessionValue(existingSession)) {
    redirect(ADMIN_LOGIN_PATH)
  }

  const params = (await searchParams) ?? {}
  const dateFilter = getSingleValue(params.date)
  const requestedStatus = getSingleValue(params.status)
  const statusFilter: OperationalBookingStatus | 'all' =
    requestedStatus && isOperationalBookingStatus(requestedStatus) ? requestedStatus : 'all'

  const eventDateRange = getDateRangeFromInput(dateFilter)
  const rows = await prisma.bookingRequest.findMany({
    where: eventDateRange ? { eventDate: eventDateRange } : undefined,
    include: {
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        include: {
          serviceVariant: {
            include: {
              service: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  })

  const bookings = rows
    .map((booking) => {
      const primaryItem = booking.items[0]
      const operationalStatus = getOperationalStatus(booking)
      return {
        id: booking.id,
        publicCode: booking.publicCode,
        createdAt: booking.createdAt,
        requesterName: booking.requesterName,
        requesterPhone: booking.requesterPhone,
        serviceName: primaryItem?.serviceVariant.service.name ?? 'Sin servicio',
        variantName: primaryItem?.serviceVariant.name ?? 'Sin modalidad',
        eventDate: booking.eventDate,
        eventEndDate: booking.eventEndDate,
        operationalStatus,
      }
    })
    .filter((booking) => statusFilter === 'all' || booking.operationalStatus === statusFilter)

  const returnPath = (() => {
    const nextParams = new URLSearchParams()
    if (dateFilter) {
      nextParams.set('date', dateFilter)
    }
    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter)
    }
    const encoded = nextParams.toString()
    return encoded ? `/admin?${encoded}` : '/admin'
  })()

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Booking Command Center</h1>
              <p className="mt-2 text-sm text-slate-600">
                Vista interna minima para revisar solicitudes y verificar pago manualmente.
              </p>
            </div>

            <form action={logoutAdminSession}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <form className="grid gap-4 md:grid-cols-[220px_220px_auto] md:items-end">
            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="font-medium">Fecha solicitada</span>
              <input
                type="date"
                name="date"
                defaultValue={dateFilter ?? ''}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="font-medium">Estado</span>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="all">Todos</option>
                {OPERATIONAL_BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {OPERATIONAL_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Filtrar
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Creada</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Telefono</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Fecha y horario</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No hay solicitudes para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{booking.publicCode}</td>
                      <td className="px-4 py-3">{formatDateTime(booking.createdAt)}</td>
                      <td className="px-4 py-3">{booking.requesterName}</td>
                      <td className="px-4 py-3">{booking.requesterPhone ?? '-'}</td>
                      <td className="px-4 py-3">{booking.serviceName}</td>
                      <td className="px-4 py-3">{booking.variantName}</td>
                      <td className="px-4 py-3">
                        {formatSchedule(booking.eventDate, booking.eventEndDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {OPERATIONAL_STATUS_LABELS[booking.operationalStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={updateOperationalStatus} className="flex items-center gap-2">
                          <input type="hidden" name="bookingRequestId" value={booking.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <select
                            name="nextStatus"
                            defaultValue={booking.operationalStatus}
                            className="w-44 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                          >
                            <option value="pending_payment">
                              {OPERATIONAL_STATUS_LABELS.pending_payment}
                            </option>
                            <option value="payment_verified">
                              {OPERATIONAL_STATUS_LABELS.payment_verified}
                            </option>
                            <option value="confirmed">{OPERATIONAL_STATUS_LABELS.confirmed}</option>
                            <option value="cancelled">{OPERATIONAL_STATUS_LABELS.cancelled}</option>
                          </select>
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Guardar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}
