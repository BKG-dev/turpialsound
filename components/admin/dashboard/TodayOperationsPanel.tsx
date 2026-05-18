import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeStyle: 'short',
    timeZone: 'America/Caracas',
  }).format(date)
}

export function TodayOperationsPanel({ snapshot, todayLink }: { snapshot: AdminDashboardSnapshot; todayLink?: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Reservas de hoy</h2>
      <div className="mt-3 space-y-2">
        {snapshot.todayBookings.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No hay reservas para hoy.
          </p>
        ) : (
          snapshot.todayBookings.slice(0, 10).map((booking) => (
            <a
              key={booking.id}
              href={todayLink ?? '#'}
              className="block"
            >
              <article className="rounded-lg border border-slate-200 p-3 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-blue-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{booking.publicCode}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                    {booking.operationalStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400 break-words">
                  {booking.serviceName} · {booking.variantName}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
                  {booking.resourceName ?? 'Sala por confirmar'} · {formatTime(booking.eventDate)}
                </p>
              </article>
            </a>
          ))
        )}
      </div>
    </section>
  )
}
