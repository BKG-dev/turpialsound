import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

const severityStyles = {
  high: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-600/30 dark:bg-rose-950/20 dark:text-rose-400',
  medium: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-400',
  low: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-600/30 dark:bg-sky-950/20 dark:text-sky-400',
} as const

function bcvBadgeClasses(tone: 'ok' | 'warning' | 'neutral'): string {
  if (tone === 'warning') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  if (tone === 'ok') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
  return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
}

export function CriticalAlertsPanel({
  snapshot,
  getAlertLink,
}: {
  snapshot: AdminDashboardSnapshot
  getAlertLink?: (alertId: string) => string | undefined
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Alertas criticas</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${bcvBadgeClasses(snapshot.bcvBadge.tone)}`}>{snapshot.bcvBadge.label}</span>
      </div>
      <div className="mt-3 space-y-2">
        {snapshot.criticalAlerts.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">Sin alertas criticas para este rango.</p>
        ) : (
          snapshot.criticalAlerts.map((alert) => {
            const link = getAlertLink ? getAlertLink(alert.id) : undefined
            const content = (
              <article className={`rounded-lg border p-3 ${severityStyles[alert.severity]} ${link ? 'cursor-pointer transition-all hover:opacity-80' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold dark:bg-black/20">{alert.count}</span>
                </div>
                <p className="mt-1 text-xs">{alert.description}</p>
              </article>
            )
            if (link) return <a key={alert.id} href={link}>{content}</a>
            return <div key={alert.id}>{content}</div>
          })
        )}
      </div>
    </section>
  )
}
