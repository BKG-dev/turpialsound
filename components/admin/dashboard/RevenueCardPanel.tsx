import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function formatUsd(value: number): string {
  return `USD ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function RevenueCardPanel({ snapshot }: { snapshot: AdminDashboardSnapshot }) {
  const cards = [
    { label: 'Confirmado', value: formatUsd(snapshot.revenue.confirmedRevenueUsd), tone: 'text-emerald-700' },
    { label: 'Pendiente', value: formatUsd(snapshot.revenue.pendingRevenueUsd), tone: 'text-amber-700' },
    { label: 'Hold activo', value: formatUsd(snapshot.revenue.activeHoldRevenueUsd), tone: 'text-slate-700' },
    { label: 'Pagos por revisar', value: String(snapshot.revenue.paymentReportedToReviewCount), tone: 'text-rose-700' },
  ]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Caja operativa</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Rango: {snapshot.range.key}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-1 break-words text-base font-semibold ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
