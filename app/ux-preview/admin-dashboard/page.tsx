import { getSession } from '@/lib/marketplace/auth'
import AdminDashboardPreviewClient from './AdminDashboardPreviewClient'

export const metadata = { title: 'UX Preview — Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPreviewPage() {
  const session = await getSession()
  if (!session) return <LoginPrompt />

  return <AdminDashboardPreviewClient userId={session.userId} />
}

function LoginPrompt() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#f2f2f2' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>UX Preview — Admin Dashboard</h2>
        <p style={{ color: '#9a9a9a', fontSize: 14 }}>Inicia sesion en /marketplace para ver el dashboard admin.</p>
        <a href="/marketplace" style={{ color: '#00aeef', fontSize: 14, marginTop: 12, display: 'inline-block' }}>Ir al Marketplace</a>
      </div>
    </div>
  )
}
