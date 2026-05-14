import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Caracas',
  }).format(date)
}

export function PaymentReviewQueuePanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Pagos por revisar</h2>
      <p className="mt-1 text-xs text-slate-500">Cola operativa con estado pago reportado.</p>

      <div className="mt-3 space-y-2">
        {snapshot.paymentReviewQueue.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No hay pagos pendientes de revision.
          </p>
        ) : (
          snapshot.paymentReviewQueue.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.publicCode}</p>
                {item.duplicateStatus && item.duplicateStatus !== 'none' ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                    {item.duplicateStatus}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.requesterName || 'Cliente no disponible'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.resourceName ?? 'Sala por confirmar'} · {formatDateTime(item.eventDate)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
