import { redirect } from 'next/navigation'
import { getSession } from '@/lib/marketplace/auth'
import { getMyProfile } from '@/actions/marketplace/users'
import { getPayoutMethods } from '@/actions/marketplace/users'
import { getMyTransactions } from '@/actions/marketplace/transactions'
import { getMyThreads } from '@/actions/marketplace/chat'
import { getUserListings } from '@/actions/marketplace/listings'
import { getMyFavorites } from '@/actions/marketplace/favorites'
import { getMyInteractedListings } from '@/actions/marketplace/questions'
import { DashboardClient } from '@/components/marketplace/dashboard/DashboardClient'

export const metadata = {
  title: 'Mi Cuenta — Turpial Market',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/marketplace')

  const [profileRes, purchasesRes, salesRes, threadsRes, myListingsRes, myFavoritesRes, myInteractedRes, payoutMethodsRes] =
    await Promise.all([
      getMyProfile(),
      getMyTransactions('buyer'),
      getMyTransactions('seller'),
      getMyThreads(),
      getUserListings(),
      getMyFavorites(),
      getMyInteractedListings(),
      getPayoutMethods(),
    ])

  const validTabs = ['my_store', 'sales', 'purchases', 'messages', 'favorites', 'payouts'] as const
  type Tab = typeof validTabs[number]
  const initialTab = validTabs.includes(searchParams.tab as Tab)
    ? (searchParams.tab as Tab)
    : undefined

  return (
    <DashboardClient
      session={session}
      profile={profileRes.success ? (profileRes.data as object) : null}
      purchases={(purchasesRes.success ? (purchasesRes.data as object[]) : []) ?? []}
      sales={(salesRes.success ? (salesRes.data as object[]) : []) ?? []}
      threads={(threadsRes.success ? (threadsRes.data as object[]) : []) ?? []}
      myListings={(myListingsRes.success ? (myListingsRes.data as object[]) : []) ?? []}
      myFavorites={(myFavoritesRes.success ? (myFavoritesRes.data as object[]) : []) ?? []}
      myInteracted={(myInteractedRes.success ? (myInteractedRes.data as object[]) : []) ?? []}
      payoutMethods={(payoutMethodsRes.success ? (payoutMethodsRes.data as object[]) : []) ?? []}
      initialTab={initialTab}
    />
  )
}
