import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

export function StatusBreakdownPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  const rows = Object.entries(snapshot.statuses.counts)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Estados operativos</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(([key, value]) => (
          <article key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{key}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
