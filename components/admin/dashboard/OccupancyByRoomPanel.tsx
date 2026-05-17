import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

export function OccupancyByRoomPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Ocupacion por sala</h2>
      <div className="mt-3 space-y-2">
        {snapshot.occupancyByResource.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No hay datos de ocupacion en el rango.</p>
        ) : (
          snapshot.occupancyByResource.map((room) => (
            <article key={room.resourceId} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 break-words">{room.resourceName}</p>
                <p className="text-xs text-slate-600">{room.utilizationPct.toFixed(0)}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-slate-700" style={{ width: `${Math.min(100, room.utilizationPct)}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                <span>Cfm: {room.confirmedHours.toFixed(1)}h</span>
                <span>Hold: {room.blockedPendingHours.toFixed(1)}h</span>
                <span>Rep: {room.pendingReportedHours.toFixed(1)}h</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
