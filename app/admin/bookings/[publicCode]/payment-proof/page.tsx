import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ADMIN_LOGIN_PATH, SESSION_COOKIE_NAME, isValidAdminSessionValue } from '@/lib/auth/session'
import { getOperationalStatus } from '@/lib/bookings/operations'

interface PaymentProofPageProps {
  params: Promise<{
    publicCode: string
  }>
}

function normalizePaymentReference(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'No disponible'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function parseOptionalAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatAmount(value: unknown, currency: string | null | undefined): string {
  const amount = parseOptionalAmount(value)
  if (amount === null) return 'Por confirmar'
  const currencyLabel = currency?.trim().toUpperCase() || 'USD'
  return `${currencyLabel} ${amount.toFixed(2)}`
}

function readStringField(source: unknown, field: string): string | null {
  if (!source || typeof source !== 'object') {
    return null
  }

  const value = (source as Record<string, unknown>)[field]
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export default async function PaymentProofPage({ params }: PaymentProofPageProps) {
  const cookieStore = await cookies()
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!isValidAdminSessionValue(existingSession)) {
    redirect(ADMIN_LOGIN_PATH)
  }

  const { publicCode } = await params
  const normalizedPublicCode = publicCode.trim().toUpperCase()

  if (!normalizedPublicCode) {
    redirect('/admin')
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { publicCode: normalizedPublicCode },
    select: {
      id: true,
      publicCode: true,
      requesterName: true,
      requesterEmail: true,
      estimatedTotal: true,
      currency: true,
      status: true,
      internalNotes: true,
      createdAt: true,
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
        },
      },
      auditLogs: {
        where: {
          action: 'payment_reported_by_customer',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          createdAt: true,
          nextState: true,
        },
      },
    },
  })

  if (!booking) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Comprobante no encontrado</h1>
          <p className="mt-2 text-sm text-slate-600">
            No encontramos una solicitud con ese codigo.
          </p>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Volver al Command Center
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const paymentReportAudit = booking.auditLogs[0] ?? null
  const paymentProofUrl = readStringField(paymentReportAudit?.nextState, 'paymentProofUrl')
  const paymentMethod = readStringField(paymentReportAudit?.nextState, 'paymentMethod')
  const paymentReference = readStringField(paymentReportAudit?.nextState, 'paymentReference')
  const paymentReportedAt =
    readStringField(paymentReportAudit?.nextState, 'paymentReportedAt') ??
    paymentReportAudit?.createdAt?.toISOString() ??
    null
  const normalizedReference = normalizePaymentReference(paymentReference ?? booking.publicCode)
  const primaryItem = booking.items[0]
  const operationalStatus = getOperationalStatus(booking)

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Comprobante de pago</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{booking.publicCode}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Vista de solo lectura para verificacion operativa.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/admin"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Abrir solicitud
              </Link>
              <Link
                href="/admin"
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Volver
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Comprobante</h2>
            {paymentProofUrl ? (
              <img
                src={paymentProofUrl}
                alt={`Comprobante de ${booking.publicCode}`}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
              />
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No hay comprobante de imagen disponible para esta solicitud.
              </div>
            )}
          </article>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Datos operativos</h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Cliente</dt>
                <dd>{booking.requesterName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                <dd>{booking.requesterEmail}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Servicio</dt>
                <dd>{primaryItem?.serviceVariant.service.name ?? 'Por confirmar'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Modalidad</dt>
                <dd>{primaryItem?.serviceVariant.name ?? 'Por confirmar'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Metodo reportado</dt>
                <dd>{paymentMethod ?? 'No especificado'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Monto</dt>
                <dd>{formatAmount(booking.estimatedTotal, booking.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Estado actual</dt>
                <dd>{operationalStatus}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Referencia operativa
                </dt>
                <dd>{normalizedReference}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Reportado</dt>
                <dd>{formatDateTime(paymentReportedAt)}</dd>
              </div>
            </dl>
          </aside>
        </section>
      </section>
    </main>
  )
}
