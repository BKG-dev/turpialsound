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
  getOperationalStatusFromInternalNotes,
  getPaymentDeadline,
  getOperationalStatus,
  isOperationalBookingStatus,
  mapOperationalStatusToBookingStatus,
  OPERATIONAL_BOOKING_STATUSES,
  OPERATIONAL_STATUS_LABELS,
  PAYMENT_WINDOW_MINUTES,
  setOperationalStatusInInternalNotes,
  type OperationalBookingStatus,
} from '@/lib/bookings/operations'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import {
  getBookingNotificationEventForOperationalStatus,
  sendBookingNotifications,
} from '@/lib/bookings/notifications'

type SearchParamValue = string | string[] | undefined

interface AdminPageProps {
  searchParams?:
    | Promise<{
        date?: SearchParamValue
        status?: SearchParamValue
        calendarSync?: SearchParamValue
      }>
    | {
        date?: SearchParamValue
        status?: SearchParamValue
        calendarSync?: SearchParamValue
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

function formatPaymentDeadline(createdAt: Date): string {
  return formatDateTime(getPaymentDeadline(createdAt))
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

async function expireOverduePendingPayments() {
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000)
  const overdueBookings = await prisma.bookingRequest.findMany({
    where: {
      status: 'under_review',
      createdAt: { lt: cutoff },
    },
    include: {
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        include: {
          resource: {
            select: {
              name: true,
            },
          },
          serviceVariant: {
            include: {
              service: true,
            },
          },
        },
      },
    },
    take: 200,
  })

  for (const booking of overdueBookings) {
    const taggedStatus = getOperationalStatusFromInternalNotes(booking.internalNotes)
    if (taggedStatus && taggedStatus !== 'pending_payment' && taggedStatus !== 'payment_reported') {
      continue
    }

    const updatedInternalNotes = setOperationalStatusInInternalNotes(
      booking.internalNotes,
      'expired',
    )

    const expireResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.bookingRequest.updateMany({
        where: {
          id: booking.id,
          status: 'under_review',
        },
        data: {
          status: 'rejected',
          internalNotes: updatedInternalNotes,
        },
      })

      if (updateResult.count === 0) {
        return { changed: false }
      }

      await tx.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'booking_expired_payment_window',
          nextState: {
            operationalStatus: 'expired',
          },
        },
      })

      return { changed: true }
    })

    if (!expireResult.changed) {
      continue
    }

    const primaryItem = booking.items[0]
    await sendBookingNotifications('booking.expired', {
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
      status: 'expired',
      notes: booking.notes,
    })

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
      operationalStatus: 'expired',
      existingCalendarEventId: booking.calendarEventId,
    })

    if (calendarSync.ok && calendarSync.eventId !== booking.calendarEventId) {
      await prisma.bookingRequest.update({
        where: { id: booking.id },
        data: {
          calendarEventId: calendarSync.eventId,
        },
      })
    }
  }
}

function withQueryParam(path: string, key: string, value: string): string {
  const [basePath, queryString = ''] = path.split('?')
  const params = new URLSearchParams(queryString)
  params.set(key, value)
  const serialized = params.toString()
  return serialized ? `${basePath}?${serialized}` : basePath
}

async function updateOperationalStatus(formData: FormData) {
  'use server'

  const bookingRequestId = formData.get('bookingRequestId')?.toString().trim()
  const nextStatus = formData.get('nextStatus')?.toString().trim()
  const returnPath = formData.get('returnPath')?.toString().trim() || '/admin'

  if (!bookingRequestId || !nextStatus || !isOperationalBookingStatus(nextStatus)) {
    redirect(returnPath)
  }
  const effectiveNextStatus: OperationalBookingStatus =
    nextStatus === 'payment_verified' ? 'confirmed' : nextStatus

  const current = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    select: {
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
      notes: true,
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

  if (!current) {
    redirect(returnPath)
  }

  const currentOperationalStatus = getOperationalStatus(current)
  const hasOperationalStatusChanged = currentOperationalStatus !== effectiveNextStatus

  if (!hasOperationalStatusChanged) {
    revalidatePath('/admin')
    redirect(returnPath)
  }

  const mappedBookingStatus = mapOperationalStatusToBookingStatus(effectiveNextStatus)
  const updatedInternalNotes = setOperationalStatusInInternalNotes(
    current.internalNotes,
    effectiveNextStatus,
  )

  const updateResult = await prisma.$transaction(async (tx) => {
    const bookingUpdate = await tx.bookingRequest.updateMany({
      where: {
        id: bookingRequestId,
        status: current.status,
      },
      data: {
        status: mappedBookingStatus,
        internalNotes: updatedInternalNotes,
      },
    })

    if (bookingUpdate.count === 0) {
      return { changed: false }
    }

    await tx.auditLog.create({
      data: {
        bookingRequestId,
        action: 'operational_status_changed',
        previousState: {
          operationalStatus: currentOperationalStatus,
          bookingStatus: current.status,
        },
        nextState: {
          operationalStatus: effectiveNextStatus,
          bookingStatus: mappedBookingStatus,
        },
      },
    })

    return { changed: true }
  })

  if (!updateResult.changed) {
    revalidatePath('/admin')
    redirect(returnPath)
  }

  const notificationEvent =
    effectiveNextStatus === 'pending_payment'
      ? null
      : getBookingNotificationEventForOperationalStatus(effectiveNextStatus)
  const primaryItem = current.items[0]

  if (notificationEvent) {
    await sendBookingNotifications(notificationEvent, {
      publicCode: current.publicCode,
      clientName: current.requesterName,
      clientEmail: current.requesterEmail,
      serviceName: primaryItem?.serviceVariant.service.name ?? null,
      variantName: primaryItem?.serviceVariant.name ?? null,
      resourceName: primaryItem?.resource?.name ?? null,
      startAt: current.eventDate,
      endAt: current.eventEndDate,
      deadlineAt: getPaymentDeadline(current.createdAt),
      estimatedTotal: parseOptionalAmount(current.estimatedTotal),
      currency: current.currency,
      status: effectiveNextStatus,
      notes: current.notes,
    })
  }

  const calendarSync = await syncBookingToGoogleCalendar({
    publicCode: current.publicCode,
    serviceName: primaryItem?.serviceVariant.service.name ?? 'Sin servicio',
    variantName: primaryItem?.serviceVariant.name ?? 'Sin modalidad',
    resourceName: primaryItem?.resource?.name ?? null,
    requesterName: current.requesterName,
    requesterPhone: current.requesterPhone,
    eventDate: current.eventDate,
    eventEndDate: current.eventEndDate,
    paymentDeadline: getPaymentDeadline(current.createdAt),
    operationalStatus: effectiveNextStatus,
    existingCalendarEventId: current.calendarEventId,
  })

  if (!calendarSync.ok) {
    await prisma.auditLog.create({
      data: {
        bookingRequestId,
        action: 'calendar_sync_failed',
        nextState: {
          operationalStatus: effectiveNextStatus,
          reason: calendarSync.reason ?? 'unknown',
        },
      },
    })

    const syncState =
      calendarSync.reason?.startsWith('missing_env:') === true ? 'missing_config' : 'error'
    revalidatePath('/admin')
    redirect(withQueryParam(returnPath, 'calendarSync', syncState))
  }

  if (calendarSync.eventId !== current.calendarEventId) {
    await prisma.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        calendarEventId: calendarSync.eventId,
      },
    })
  }

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
  const calendarSyncState = getSingleValue(params.calendarSync)
  const statusFilter: OperationalBookingStatus | 'all' =
    requestedStatus && isOperationalBookingStatus(requestedStatus) ? requestedStatus : 'all'

  await expireOverduePendingPayments()

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
          resource: {
            select: {
              name: true,
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
      const operationalStatusLabel =
        operationalStatus === 'payment_verified'
          ? OPERATIONAL_STATUS_LABELS.confirmed
          : OPERATIONAL_STATUS_LABELS[operationalStatus]
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
        resourceName: primaryItem?.resource?.name ?? null,
        paymentDeadline: getPaymentDeadline(booking.createdAt),
        operationalStatus,
        operationalStatusLabel,
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

        {calendarSyncState === 'error' ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            El estado se guardo, pero falló la sincronizacion con Google Calendar. Revisa la
            configuracion o intenta de nuevo.
          </section>
        ) : null}

        {calendarSyncState === 'missing_config' ? (
          <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            El estado se guardo, pero falta configurar variables de Google Calendar en el entorno
            interno.
          </section>
        ) : null}

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
                  <th className="px-3 py-2.5">Solicitud</th>
                  <th className="px-3 py-2.5">Operacion</th>
                  <th className="px-3 py-2.5">Pago/Estado</th>
                  <th className="px-3 py-2.5">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No hay solicitudes para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">{booking.publicCode}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(booking.createdAt)}</p>
                        <p className="mt-1 text-sm text-slate-800">{booking.requesterName}</p>
                        <p className="text-xs text-slate-500">{booking.requesterPhone ?? '-'}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium text-slate-900">{booking.serviceName}</p>
                        <p className="text-xs text-slate-600">{booking.variantName}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Sala: <span className="font-medium text-slate-700">{booking.resourceName ?? '-'}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatSchedule(booking.eventDate, booking.eventEndDate)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-slate-500">
                          Limite: <span className="font-medium text-slate-700">{formatPaymentDeadline(booking.createdAt)}</span>
                        </p>
                        <div className="mt-1.5">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {booking.operationalStatusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <form action={updateOperationalStatus} className="flex min-w-[12rem] flex-col gap-1.5">
                          <input type="hidden" name="bookingRequestId" value={booking.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <select
                            name="nextStatus"
                            defaultValue={booking.operationalStatus}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                          >
                            <option value="pending_payment">
                              {OPERATIONAL_STATUS_LABELS.pending_payment}
                            </option>
                            <option value="payment_reported">
                              {OPERATIONAL_STATUS_LABELS.payment_reported}
                            </option>
                            <option value="payment_verified">
                              Verificar pago (confirmar)
                            </option>
                            <option value="confirmed">{OPERATIONAL_STATUS_LABELS.confirmed}</option>
                            <option value="cancelled">{OPERATIONAL_STATUS_LABELS.cancelled}</option>
                          </select>
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
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
