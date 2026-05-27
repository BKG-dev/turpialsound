import { SectionShell } from '@/components/sections/SectionShell'
import { PaymentRecoveryGatewayClient } from '@/components/bookings/PaymentRecoveryGatewayClient'

interface ReservasPagoPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'

export default function ReservasPagoPage({ searchParams }: ReservasPagoPageProps) {
  const codeParam = searchParams?.code
  const tokenParam = searchParams?.token
  const code = Array.isArray(codeParam) ? codeParam[0] ?? '' : codeParam ?? ''
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? '' : tokenParam ?? ''

  return (
    <SectionShell background="surface" size="sm" className="pt-6 pb-4 md:py-5 lg:py-6">
      <PaymentRecoveryGatewayClient code={code} token={token} />
    </SectionShell>
  )
}
