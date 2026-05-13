import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function asCompact(value: number): string {
  return value.toLocaleString('es-VE', { maximumFractionDigits: 0 })
}

export function QuickRevenueHistoryPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  const maxValue = Math.max(1, ...snapshot.revenueHistory.map((point) => Math.max(point.confirmedUsd, point.pendingUsd)))

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Revenue rapido ({snapshot.revenueHistory.length}d)</h2>
      <div className="mt-3 space-y-2">
        {snapshot.revenueHistory.map((point) => {
          const confirmedWidth = Math.max(2, (point.confirmedUsd / maxValue) * 100)
          const pendingWidth = Math.max(2, (point.pendingUsd / maxValue) * 100)
          return (
            <article key={point.dayLabel} className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>{point.dayLabel}</span>
                <span>C: {asCompact(point.confirmedUsd)} / P: {asCompact(point.pendingUsd)}</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${confirmedWidth}%` }} />
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pendingWidth}%` }} />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
