import { redirect } from 'next/navigation'

export default function MarketplaceDashboardLegacyTransactionPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/marketplace/dashboard?txId=${encodeURIComponent(params.id)}`)
}
