/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { getSession } from '@/lib/marketplace/auth'
import { getMyProfile } from '@/actions/marketplace/users'
import { getMyTransactions } from '@/actions/marketplace/transactions'
import { getMyThreads } from '@/actions/marketplace/chat'
import { getUserListings } from '@/actions/marketplace/listings'
import UserDashboardPreviewClient from './UserDashboardPreviewClient'

export const metadata = { title: 'UX Preview — User Dashboard' }
export const dynamic = 'force-dynamic'

export default async function UserDashboardPreviewPage() {
  const session = await getSession()
  if (!session) return <LoginPrompt />

  const [profileRes, purchasesRes, salesRes, threadsRes, myListingsRes] = await Promise.all([
    getMyProfile(), getMyTransactions('buyer'), getMyTransactions('seller'),
    getMyThreads(), getUserListings(),
  ])

  const purchases = purchasesRes.success ? (purchasesRes.data as any[]) : []
  const sales = salesRes.success ? (salesRes.data as any[]) : []
  const threads = threadsRes.success ? (threadsRes.data as any[]) : []
  const myListings = myListingsRes.success ? (myListingsRes.data as any[]) : []
  const profile = profileRes.success ? profileRes.data : null

  return (
    <UserDashboardPreviewClient
      profile={profile}
      purchases={purchases}
      sales={sales}
      threads={threads}
      myListings={myListings}
    />
  )
}

function LoginPrompt() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#f2f2f2' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>UX Preview — User Dashboard</h2>
        <p style={{ color: '#9a9a9a', fontSize: 14 }}>Inicia sesion en /marketplace para ver tus datos reales aqui.</p>
        <a href="/marketplace" style={{ color: '#00aeef', fontSize: 14, marginTop: 12, display: 'inline-block' }}>Ir al Marketplace</a>
      </div>
    </div>
  )
}
