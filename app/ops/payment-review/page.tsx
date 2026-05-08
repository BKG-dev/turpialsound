import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}
import { prisma } from '@/lib/db'
import {
  getOperationalStatus,
  getPaymentDeadline,
  mapOperationalStatusToBookingStatus,
  setOperationalStatusInInternalNotes,
  type OperationalBookingStatus,
} from '@/lib/bookings/operations'
import { sendBookingNotifications } from '@/lib/bookings/notifications'
import { syncBookingToGoogleCalendar } from '@/lib/bookings/google-calendar'
import { resolveReferenceRate } from '@/lib/bookings/reference-rate'
import { validatePaymentReviewAccessToken } from '@/lib/bookings/payment-review-access'
import {
  buildPaymentProofViewerUrl,
  getPaymentProofLinkReadiness,
} from '@/lib/bookings/operational-links'

interface PaymentReviewPageProps {
  searchParams?:
    | Promise<{
        token?: string
        result?: string
        intent?: string
      }>
    | {
        token?: string
        result?: string
        intent?: string
      }
}

type ReviewAction = 'confirm' | 'incidence'

function normalizeMethodLabel(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'pago_movil') return 'Pago Movil'
  if (normalized === 'transferencia') return 'Transferencia Bancaria'
  if (normalized === 'binance') return 'Binance Pay'
  if (normalized === 'efectivo') return 'Efectivo'
  return value?.trim() || 'No especificado'
}

function getOperationalStatusLabel(status: OperationalBookingStatus): string {
  if (status === 'payment_reported') return 'Pago reportado'
  if (status === 'confirmed') return 'Confirmada'
  if (status === 'expired') return 'Vencida'
  if (status === 'pending_payment') return 'Pendiente de pago'
  if (status === 'cancelled') return 'Cancelada'
  if (status === 'payment_verified') return 'Pago verificado'
  return 'En revision'
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
  }).format(date)
}

function formatTimeOnly(value: Date | string | null | undefined): string {
  if (!value) return 'Por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Por confirmar'
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    timeStyle: 'short',
  }).format(date)
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function computeTemporalStatus(input: {
  deadlineAt: Date | null
  paymentReportedAt: Date | null
}): string {
  if (!input.deadlineAt || !input.paymentReportedAt) {
    return 'Sin contexto temporal suficiente'
  }

  const deltaMs = input.paymentReportedAt.getTime() - input.deadlineAt.getTime()
  if (deltaMs <= 0) {
    return 'Reportado dentro del plazo'
  }

  const deltaMinutes = Math.round(deltaMs / 60000)
  return `Reportado ${deltaMinutes} min despues del vencimiento`
}

function readStringField(source: unknown, field: string): string | null {
  if (!source || typeof source !== 'object') return null
  const value = (source as Record<string, unknown>)[field]
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function readDateField(source: unknown, field: string): Date | null {
  const raw = readStringField(source, field)
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function readJsonObject(source: unknown): Record<string, unknown> | null {
  if (!source || typeof source !== 'object') return null
  return source as Record<string, unknown>
}

function extractActionContext(nextState: unknown): {
  reviewAction: string | null
  reviewTokenJti: string | null
} {
  const object = readJsonObject(nextState)
  if (!object) {
    return { reviewAction: null, reviewTokenJti: null }
  }

  const reviewAction = typeof object.reviewAction === 'string' ? object.reviewAction : null
  const reviewTokenJti = typeof object.reviewTokenJti === 'string' ? object.reviewTokenJti : null
  return { reviewAction, reviewTokenJti }
}

function buildResultLabel(result: string | null): string | null {
  if (!result) return null
  if (result === 'confirmed') return 'Pago confirmado correctamente.'
  if (result === 'incidence_marked') return 'Incidencia marcada para revision interna.'
  if (result === 'already_resolved')
    return 'La solicitud ya estaba resuelta. No se aplicaron cambios.'
  if (result === 'token_used') return 'Este enlace ya fue usado para esta accion.'
  if (result === 'invalid_action') return 'Accion invalida.'
  if (result === 'invalid_token') return 'Token invalido.'
  if (result === 'expired_token') return 'El enlace ya expiro.'
  if (result === 'error') return 'No pudimos completar la accion.'
  return null
}

async function handlePaymentReviewAction(formData: FormData) {
  'use server'

  const token = formData.get('token')?.toString().trim() ?? ''
  const action = formData.get('action')?.toString().trim() ?? ''

  if (!token) {
    redirect('/ops/payment-review?result=invalid_token')
  }

  const tokenValidation = validatePaymentReviewAccessToken(token)
  if (!tokenValidation.ok) {
    const result = tokenValidation.error === 'expired_token' ? 'expired_token' : 'invalid_token'
    redirect(`/ops/payment-review?result=${result}`)
  }

  const reviewAction: ReviewAction | null =
    action === 'confirm' || action === 'incidence' ? action : null
  if (!reviewAction) {
    redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=invalid_action`)
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { publicCode: tokenValidation.payload.bookingPublicCode },
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
      notes: true,
      paymentProofs: {
        where: { id: tokenValidation.payload.paymentProofId },
        take: 1,
        select: { id: true, isActive: true },
      },
      items: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: {
          serviceVariant: {
            select: {
              name: true,
              service: { select: { name: true } },
            },
          },
          resource: { select: { name: true } },
        },
      },
      auditLogs: {
        where: {
          action: {
            in: ['ops_payment_review_confirmed', 'ops_payment_review_incidence_marked'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          nextState: true,
        },
      },
    },
  })

  if (!booking || booking.paymentProofs.length === 0 || !booking.paymentProofs[0]?.isActive) {
    redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=invalid_token`)
  }

  const alreadyUsed = booking.auditLogs.some((entry) => {
    const context = extractActionContext(entry.nextState)
    return (
      context.reviewTokenJti === tokenValidation.payload.jti &&
      context.reviewAction === reviewAction
    )
  })

  if (alreadyUsed) {
    await prisma.auditLog.create({
      data: {
        bookingRequestId: booking.id,
        action: 'ops_payment_review_replay_detected',
        nextState: {
          reviewAction,
          reviewTokenJti: tokenValidation.payload.jti,
        },
      },
    })
    redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=token_used`)
  }

  const currentOperationalStatus = getOperationalStatus(booking)
  const primaryItem = booking.items[0]

  if (reviewAction === 'confirm') {
    if (currentOperationalStatus !== 'payment_reported') {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'ops_payment_review_confirm_noop',
          previousState: {
            operationalStatus: currentOperationalStatus,
            bookingStatus: booking.status,
          },
          nextState: {
            operationalStatus: currentOperationalStatus,
            bookingStatus: booking.status,
            reviewAction,
            reviewTokenJti: tokenValidation.payload.jti,
            reason: 'already_resolved_or_not_reported',
          },
        },
      })
      redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=already_resolved`)
    }

    const nextOperationalStatus: OperationalBookingStatus = 'confirmed'
    const nextBookingStatus = mapOperationalStatusToBookingStatus(nextOperationalStatus)
    const updatedInternalNotes = setOperationalStatusInInternalNotes(
      booking.internalNotes,
      nextOperationalStatus,
    )

    const updateResult = await prisma.$transaction(async (tx) => {
      const bookingUpdate = await tx.bookingRequest.updateMany({
        where: {
          id: booking.id,
          status: booking.status,
        },
        data: {
          status: nextBookingStatus,
          internalNotes: updatedInternalNotes,
        },
      })

      if (bookingUpdate.count === 0) {
        return { changed: false }
      }

      await tx.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'ops_payment_review_confirmed',
          previousState: {
            operationalStatus: currentOperationalStatus,
            bookingStatus: booking.status,
          },
          nextState: {
            operationalStatus: nextOperationalStatus,
            bookingStatus: nextBookingStatus,
            reviewAction,
            reviewTokenJti: tokenValidation.payload.jti,
          },
        },
      })

      return { changed: true }
    })

    if (!updateResult.changed) {
      redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=already_resolved`)
    }

    await sendBookingNotifications('booking.confirmed', {
      publicCode: booking.publicCode,
      clientName: booking.requesterName,
      clientEmail: booking.requesterEmail,
      clientWhatsapp: booking.requesterPhone,
      serviceName: primaryItem?.serviceVariant.service.name ?? null,
      variantName: primaryItem?.serviceVariant.name ?? null,
      resourceName: primaryItem?.resource?.name ?? null,
      startAt: booking.eventDate,
      endAt: booking.eventEndDate,
      deadlineAt: null,
      estimatedTotal: parseOptionalAmount(booking.estimatedTotal),
      currency: booking.currency,
      status: nextOperationalStatus,
      notes: booking.notes,
    })

    const calendarSync = await syncBookingToGoogleCalendar({
      publicCode: booking.publicCode,
      paymentProofId: booking.paymentProofs[0].id,
      serviceName: primaryItem?.serviceVariant.service.name ?? 'Sin servicio',
      variantName: primaryItem?.serviceVariant.name ?? 'Sin modalidad',
      resourceName: primaryItem?.resource?.name ?? null,
      requesterName: booking.requesterName,
      requesterPhone: booking.requesterPhone,
      eventDate: booking.eventDate,
      eventEndDate: booking.eventEndDate,
      paymentDeadline: null,
      operationalStatus: nextOperationalStatus,
      existingCalendarEventId: booking.calendarEventId,
    })

    if (!calendarSync.ok) {
      await prisma.auditLog.create({
        data: {
          bookingRequestId: booking.id,
          action: 'calendar_sync_failed_on_ops_payment_review_confirmed',
          nextState: {
            operationalStatus: nextOperationalStatus,
            reason: calendarSync.reason ?? 'unknown',
          },
        },
      })
    } else if (calendarSync.eventId !== booking.calendarEventId) {
      await prisma.bookingRequest.update({
        where: { id: booking.id },
        data: { calendarEventId: calendarSync.eventId },
      })
    }

    redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=confirmed`)
  }

  await prisma.auditLog.create({
    data: {
      bookingRequestId: booking.id,
      action: 'ops_payment_review_incidence_marked',
      previousState: {
        operationalStatus: currentOperationalStatus,
        bookingStatus: booking.status,
      },
      nextState: {
        operationalStatus: currentOperationalStatus,
        bookingStatus: booking.status,
        reviewAction,
        reviewTokenJti: tokenValidation.payload.jti,
      },
    },
  })

  redirect(`/ops/payment-review?token=${encodeURIComponent(token)}&result=incidence_marked`)
}

export default async function OpsPaymentReviewPage({ searchParams }: PaymentReviewPageProps) {
  const params = (await searchParams) ?? {}
  const token = params.token?.trim() ?? ''
  const result = buildResultLabel(params.result?.trim() ?? null)
  const intent = params.intent?.trim() ?? null

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Enlace invalido</h1>
          <p className="mt-2 text-sm text-slate-600">Falta el token de revision operativa.</p>
        </section>
      </main>
    )
  }

  const tokenValidation = validatePaymentReviewAccessToken(token)
  if (!tokenValidation.ok) {
    const message =
      tokenValidation.error === 'misconfigured_secret'
        ? 'Configuracion incompleta: falta PAYMENT_PROOF_ACCESS_SECRET.'
        : tokenValidation.error === 'expired_token'
          ? 'El enlace de revision ha expirado.'
          : 'Token de revision invalido.'

    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-semibold text-slate-900">No pudimos abrir la revision</h1>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </section>
      </main>
    )
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { publicCode: tokenValidation.payload.bookingPublicCode },
    select: {
      id: true,
      publicCode: true,
      status: true,
      internalNotes: true,
      requesterName: true,
      requesterEmail: true,
      requesterPhone: true,
      createdAt: true,
      eventDate: true,
      eventEndDate: true,
      estimatedTotal: true,
      currency: true,
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
      paymentProofs: {
        where: { id: tokenValidation.payload.paymentProofId },
        take: 1,
        select: {
          id: true,
          isActive: true,
          uploadedAt: true,
          reportedReference: true,
          normalizedReference: true,
          duplicateStatus: true,
        },
      },
      auditLogs: {
        where: {
          action: 'payment_reported_by_customer',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
          nextState: true,
        },
      },
    },
  })

  if (!booking || booking.paymentProofs.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Comprobante no disponible</h1>
          <p className="mt-2 text-sm text-slate-600">
            El enlace no corresponde a una reserva valida o el comprobante ya no existe.
          </p>
        </section>
      </main>
    )
  }

  const paymentProof = booking.paymentProofs[0]
  if (!paymentProof?.isActive) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Comprobante inactivo</h1>
          <p className="mt-2 text-sm text-slate-600">
            Este comprobante fue desactivado y no puede revisarse desde este enlace.
          </p>
        </section>
      </main>
    )
  }

  const operationalStatus = getOperationalStatus(booking)
  const primaryItem = booking.items[0]
  const paymentAuditLog = booking.auditLogs[0]
  const paymentMethod = normalizeMethodLabel(
    readStringField(paymentAuditLog?.nextState, 'paymentMethod'),
  )
  const paymentReportedAt =
    readDateField(paymentAuditLog?.nextState, 'paymentReportedAt') ?? paymentProof.uploadedAt
  const paymentDeadline = getPaymentDeadline(booking.createdAt)
  const temporalStatus = computeTemporalStatus({
    deadlineAt: paymentDeadline,
    paymentReportedAt,
  })

  const estimatedTotal = parseOptionalAmount(booking.estimatedTotal)
  const currency = booking.currency?.trim().toUpperCase() || 'USD'
  const usdAmount =
    typeof estimatedTotal === 'number'
      ? `${currency} ${estimatedTotal.toFixed(2)}`
      : 'Por confirmar'

  let bcvRateLabel = 'Por confirmar'
  let bsExpectedLabel = 'Por confirmar'
  if (currency === 'USD' && typeof estimatedTotal === 'number') {
    try {
      const rate = await resolveReferenceRate()
      bcvRateLabel = `Bs. ${rate.rate.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} (asOf: ${formatDateTime(rate.asOf)})`
      bsExpectedLabel = `Bs. ${(estimatedTotal * rate.rate).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    } catch {
      bcvRateLabel = 'No disponible'
      bsExpectedLabel = 'No disponible'
    }
  }

  const proofViewerUrl = buildPaymentProofViewerUrl(booking.publicCode, paymentProof.id)
  const proofLinkReadiness = getPaymentProofLinkReadiness()
  const canConfirm = operationalStatus === 'payment_reported'

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revision operativa</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{booking.publicCode}</h1>
          <p className="mt-2 text-sm text-slate-700">
            Estado:{' '}
            <span className="font-medium">{getOperationalStatusLabel(operationalStatus)}</span>
          </p>
          {result ? (
            <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {result}
            </p>
          ) : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Comprobante</h2>
            {proofViewerUrl ? (
              <img
                src={proofViewerUrl}
                alt={`Comprobante ${booking.publicCode}`}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
              />
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No pudimos generar el visor seguro del comprobante. Revisa la configuracion de{' '}
                {proofLinkReadiness.missing.join(' y ') || 'enlaces operativos'}.
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Referencia:{' '}
              {paymentProof.normalizedReference ??
                paymentProof.reportedReference ??
                'No especificada'}
            </p>
          </article>

          <aside className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Cliente</h2>
              <p className="mt-2 text-sm text-slate-800">{booking.requesterName}</p>
              <p className="text-sm text-slate-600">{booking.requesterEmail}</p>
              {booking.requesterPhone ? (
                <p className="text-sm text-slate-600">WhatsApp: {booking.requesterPhone}</p>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Reserva</h2>
              <dl className="mt-2 space-y-1 text-sm text-slate-700">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Servicio</dt>
                  <dd>{primaryItem?.serviceVariant.service.name ?? 'Por confirmar'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Modalidad</dt>
                  <dd>{primaryItem?.serviceVariant.name ?? 'Por confirmar'}</dd>
                </div>
                {primaryItem?.resource?.name ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Sala / recurso
                    </dt>
                    <dd>{primaryItem.resource.name}</dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Sala / recurso
                    </dt>
                    <dd>Por confirmar</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Fecha reservada
                  </dt>
                  <dd>{formatDateOnly(booking.eventDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Bloque horario</dt>
                  <dd>
                    {formatTimeOnly(booking.eventDate)} - {formatTimeOnly(booking.eventEndDate)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Pago y tiempo</h2>
              <dl className="mt-2 space-y-1 text-sm text-slate-700">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Metodo reportado
                  </dt>
                  <dd>{paymentMethod}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Monto USD</dt>
                  <dd>{usdAmount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Tasa usada</dt>
                  <dd>{bcvRateLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Monto esperado Bs
                  </dt>
                  <dd>{bsExpectedLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Solicitud creada
                  </dt>
                  <dd>{formatDateTime(booking.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Vencimiento de pago
                  </dt>
                  <dd>{formatDateTime(paymentDeadline)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Pago reportado</dt>
                  <dd>{formatDateTime(paymentReportedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Estado temporal
                  </dt>
                  <dd>{temporalStatus}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Acciones</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={handlePaymentReviewAction}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="action" value="confirm" />
                  <button
                    type="submit"
                    disabled={!canConfirm}
                    className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Confirmar pago
                  </button>
                </form>
                <form action={handlePaymentReviewAction}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="action" value="incidence" />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Marcar incidencia
                  </button>
                </form>
                {proofViewerUrl ? (
                  <a
                    href={proofViewerUrl}
                    className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver comprobante
                  </a>
                ) : null}
              </div>
              {!canConfirm ? (
                <p className="mt-2 text-xs text-slate-500">
                  Esta solicitud ya no esta en estado Pago reportado; no se puede confirmar desde
                  este enlace.
                </p>
              ) : intent === 'confirm' ? (
                <p className="mt-2 text-xs text-slate-500">
                  Esta vista esta lista para confirmar el pago de forma segura.
                </p>
              ) : intent === 'incidence' ? (
                <p className="mt-2 text-xs text-slate-500">
                  Esta vista esta lista para marcar incidencia sin cambiar estados automaticamente.
                </p>
              ) : null}
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}
