import type { Metadata } from 'next'

import { SectionShell } from '@/components/sections/SectionShell'
import { PaymentRecoveryGatewayClient } from '@/components/bookings/PaymentRecoveryGatewayClient'

interface ReservasPagoPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  referrer: 'no-referrer',
}

export default function ReservasPagoPage({ searchParams }: ReservasPagoPageProps) {
  const codeParam = searchParams?.code
  const code = Array.isArray(codeParam) ? codeParam[0] ?? '' : codeParam ?? ''

  return (
    <SectionShell background="surface" size="sm" className="pt-6 pb-4 md:py-5 lg:py-6">
      <PaymentRecoveryGatewayClient code={code} />
    </SectionShell>
  )
}
