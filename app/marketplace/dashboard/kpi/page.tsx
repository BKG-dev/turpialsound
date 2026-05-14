import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { getDb } from '@/lib/marketplace/db'
import KPIDashboardClient from './KPIDashboardClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = generatePageMetadata({
  title: 'KPI Dashboard',
  description: 'Dashboard de indicadores clave de rendimiento del marketplace Turpial Sound.',
  path: '/marketplace/dashboard/kpi',
})

type KPI = { label: string; value: string; change: string; trend: 'up' | 'down' | 'neutral' }

async function getKPIStats() {
  const db = await getDb()
  if (!db) return []

  const [
    activeListings,
    totalTransactions,
    totalRevenue,
    pendingPayouts,
    escrowActive,
    totalUsers,
    profitMargin,
    bcvRate,
  ] = await Promise.all([
    db.mpListing.count({ where: { status: 'ACTIVE' } }),
    db.mpTransaction.count(),
    db.mpTransaction.aggregate({ where: { status: 'RELEASED' }, _sum: { amount: true } }),
    db.mpPayout.count({ where: { status: 'PENDING' } }),
    db.mpTransaction.count({ where: { status: 'IN_ESCROW' } }),
    db.mpUser.count(),
    db.mpTransaction.aggregate({
      where: { status: 'RELEASED' },
      _sum: { platformFeeAmount: true },
    }),
    db.mpReferenceRateSnapshot.findFirst({ orderBy: { capturedAt: 'desc' }, select: { rate: true } }),
  ])

  await db.$disconnect()

  const revenue = Number(totalRevenue._sum.amount || 0)
  const fees = Number(profitMargin._sum.platformFeeAmount || 0)
  const margin = revenue > 0 ? Math.round((fees / revenue) * 100) : 0

  return [
    { label: 'Listings Activos', value: String(activeListings), change: '', trend: 'neutral' as const },
    { label: 'Transacciones', value: String(totalTransactions), change: '', trend: 'neutral' as const },
    { label: 'Ingresos (USD)', value: `$${revenue.toFixed(0)}`, change: '', trend: 'up' as const },
    { label: 'Payouts Pendientes', value: String(pendingPayouts), change: '', trend: 'neutral' as const },
    { label: 'En Escrow', value: String(escrowActive), change: '', trend: 'neutral' as const },
    { label: 'Usuarios', value: String(totalUsers), change: '', trend: 'up' as const },
    { label: 'Margen Plataforma', value: `$${fees.toFixed(0)} (${margin}%)`, change: '', trend: 'up' as const },
    { label: 'Tasa BCV', value: bcvRate ? `${Number(bcvRate.rate).toFixed(2)} Bs/$` : 'N/D', change: '', trend: 'neutral' as const },
  ]
}

export default async function KPIDashboardPage() {
  const kpis = await getKPIStats()

  return <KPIDashboardClient kpis={kpis} />
}
