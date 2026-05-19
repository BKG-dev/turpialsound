import { SectionShell } from '@/components/sections/SectionShell'
import { SecureLinkContinueClient } from '@/components/bookings/SecureLinkContinueClient'

interface ContinuePageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'

export default function ReservasContinuarPage({ searchParams }: ContinuePageProps) {
  const tokenParam = searchParams?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? '' : tokenParam ?? ''

  return (
    <SectionShell background="surface" size="sm" className="pt-6 pb-4 md:py-5 lg:py-6">
      <SecureLinkContinueClient token={token} />
    </SectionShell>
  )
}
