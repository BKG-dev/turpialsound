import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

const severityStyles = {
  high: 'border-rose-300 bg-rose-50 text-rose-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-800',
  low: 'border-sky-300 bg-sky-50 text-sky-800',
} as const

export function CriticalAlertsPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Alertas criticas</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${snapshot.bcvBadge.tone === 'warning' ? 'bg-amber-100 text-amber-800' : snapshot.bcvBadge.tone === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{snapshot.bcvBadge.label}</span>
      </div>
      <div className="mt-3 space-y-2">
        {snapshot.criticalAlerts.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Sin alertas criticas para este rango.</p>
        ) : (
          snapshot.criticalAlerts.map((alert) => (
            <article key={alert.id} className={`rounded-lg border p-3 ${severityStyles[alert.severity]}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{alert.title}</p>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">{alert.count}</span>
              </div>
              <p className="mt-1 text-xs">{alert.description}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
