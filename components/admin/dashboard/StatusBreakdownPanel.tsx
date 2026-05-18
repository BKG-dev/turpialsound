import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

export function StatusBreakdownPanel({
  snapshot,
  getStatusLink,
}: {
  snapshot: AdminDashboardSnapshot
  getStatusLink?: (status: string) => string
}) {
  const rows = Object.entries(snapshot.statuses.counts)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Estados operativos</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(([key, value]) => {
          const content = (
            <article className={`rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-gray-700 dark:bg-gray-800 ${getStatusLink ? 'cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-600' : ''}`}>
              <p className="truncate text-[11px] uppercase tracking-wide text-slate-500 dark:text-gray-400">{key}</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-gray-100">{value}</p>
            </article>
          )
          if (getStatusLink) {
            return <a key={key} href={getStatusLink(key)}>{content}</a>
          }
          return <div key={key}>{content}</div>
        })}
      </div>
    </section>
  )
}
