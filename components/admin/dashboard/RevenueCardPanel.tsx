import type { AdminDashboardSnapshot } from '@/lib/bookings/dashboard-queries'

function formatUsd(value: number): string {
  return `USD ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface RevenueCardLinks {
  confirmed?: string
  pending?: string
  hold?: string
  review?: string
}

export function RevenueCardPanel({ snapshot, cardLinks }: { snapshot: AdminDashboardSnapshot; cardLinks?: RevenueCardLinks }) {
  const cards = [
    { key: 'confirmed', label: 'Confirmado', value: formatUsd(snapshot.revenue.confirmedRevenueUsd), tone: 'text-emerald-700 dark:text-emerald-400', link: cardLinks?.confirmed },
    { key: 'pending', label: 'Pendiente', value: formatUsd(snapshot.revenue.pendingRevenueUsd), tone: 'text-amber-700 dark:text-amber-400', link: cardLinks?.pending },
    { key: 'hold', label: 'Hold activo', value: formatUsd(snapshot.revenue.activeHoldRevenueUsd), tone: 'text-slate-700 dark:text-slate-300', link: cardLinks?.hold },
    { key: 'review', label: 'Pagos por revisar', value: String(snapshot.revenue.paymentReportedToReviewCount), tone: 'text-rose-700 dark:text-rose-400', link: cardLinks?.review },
  ]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Caja operativa</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-gray-800 dark:text-gray-400">Rango: {snapshot.range.key}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <article className={`rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800 ${card.link ? 'cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-600' : ''}`}>
              <p className="text-xs text-slate-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 break-words text-base font-semibold ${card.tone}`}>{card.value}</p>
            </article>
          )
          if (card.link) {
            return <a key={card.key} href={card.link}>{content}</a>
          }
          return <div key={card.key}>{content}</div>
        })}
      </div>
    </section>
  )
}
