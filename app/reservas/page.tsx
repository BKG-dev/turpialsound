import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { SectionShell } from '@/components/sections/SectionShell'
import { BookingRequestModule } from '@/components/bookings/BookingRequestModule'
import { isPreviewDeployment } from '@/lib/bookings/environment'
import {
  getEnabledPaymentMethods,
  getPaymentWindowMinutes,
  getPrimaryPaymentMethod,
} from '@/lib/bookings/payment-settings'
import { getWhatsappVerificationConfigFromEnv } from '@/lib/bookings/whatsapp-verify-config'

export const metadata: Metadata = generatePageMetadata({
  title: 'Solicitar reserva',
  description:
    'Solicita y aparta tu fecha en Turpial Sound. Completa el formulario y el equipo revisará disponibilidad para confirmar tu sesión.',
  path: '/reservas',
})

export const dynamic = 'force-dynamic'

export default function ReservasPage() {
  const paymentMethods = getEnabledPaymentMethods()
  const primaryPaymentMethodSlug = getPrimaryPaymentMethod().slug
  const paymentWindowMinutes = getPaymentWindowMinutes()
  const whatsappVerificationConfig = getWhatsappVerificationConfigFromEnv()
  const isPreview = isPreviewDeployment()

  return (
    <SectionShell background="surface" size="sm" className="pt-6 pb-4 md:py-5 lg:py-6">
      <div className="mx-auto max-w-5xl xl:max-w-6xl">
        <BookingRequestModule
          paymentMethods={paymentMethods}
          primaryPaymentMethodSlug={primaryPaymentMethodSlug}
          paymentWindowMinutes={paymentWindowMinutes}
          whatsappVerificationConfig={whatsappVerificationConfig}
          isPreview={isPreview}
        />
      </div>
    </SectionShell>
  )
}
