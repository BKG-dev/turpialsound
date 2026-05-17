import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeStyle: 'short',
    timeZone: 'America/Caracas',
  }).format(date)
}

export function TodayOperationsPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Reservas de hoy</h2>
      <div className="mt-3 space-y-2">
        {snapshot.todayBookings.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No hay reservas para hoy.
          </p>
        ) : (
          snapshot.todayBookings.slice(0, 10).map((booking) => (
            <article key={booking.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{booking.publicCode}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                  {booking.operationalStatus}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 break-words">
                {booking.serviceName} · {booking.variantName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {booking.resourceName ?? 'Sala por confirmar'} · {formatTime(booking.eventDate)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
