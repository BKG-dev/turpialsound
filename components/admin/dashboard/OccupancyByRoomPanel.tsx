import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

export function OccupancyByRoomPanel({
  snapshot,
  getResourceLink,
}: {
  snapshot: AdminDashboardSnapshot
  getResourceLink?: (resourceId: string) => string | undefined
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Ocupacion por sala</h2>
      <div className="mt-3 space-y-2">
        {snapshot.occupancyByResource.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">No hay datos de ocupacion en el rango.</p>
        ) : (
          snapshot.occupancyByResource.map((room) => {
            const link = getResourceLink?.(room.resourceId)
            const content = (
              <article className={`rounded-lg border border-slate-200 p-3 dark:border-gray-700 ${link ? 'cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-600' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-gray-100 break-words">{room.resourceName}</p>
                  <p className="text-xs text-slate-600 dark:text-gray-400">{room.utilizationPct.toFixed(0)}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700">
                  <div className="h-full bg-slate-700 dark:bg-gray-300" style={{ width: `${Math.min(100, room.utilizationPct)}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-gray-400">
                  <span>Cfm: {room.confirmedHours.toFixed(1)}h</span>
                  <span>Hold: {room.blockedPendingHours.toFixed(1)}h</span>
                  <span>Rep: {room.pendingReportedHours.toFixed(1)}h</span>
                </div>
              </article>
            )
            if (link) return <a key={room.resourceId} href={link}>{content}</a>
            return <div key={room.resourceId}>{content}</div>
          })
        )}
      </div>
    </section>
  )
}
