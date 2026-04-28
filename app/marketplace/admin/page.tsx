import { redirect } from 'next/navigation'
import { getSession } from '@/lib/marketplace/auth'
import { AdminDashboard } from '@/components/marketplace/admin/AdminDashboard'
import { getAdminStats, getEscrowList } from '@/actions/marketplace/admin'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    redirect('/marketplace')
  }

  const [statsResult, escrowResult] = await Promise.all([
    getAdminStats(),
    getEscrowList('all'),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--mp-page-bg)' }}>
      <AdminDashboard
        initialStats={statsResult.data ?? null}
        initialEscrow={escrowResult.data ?? []}
      />
    </div>
  )
}
