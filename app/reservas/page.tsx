import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { SectionShell } from '@/components/sections/SectionShell'
import { BookingRequestModule } from '@/components/bookings/BookingRequestModule'
import {
  getEnabledPaymentMethods,
  getPaymentWindowMinutes,
  getPrimaryPaymentMethod,
} from '@/lib/bookings/payment-settings'

export const metadata: Metadata = generatePageMetadata({
  title: 'Solicitar reserva',
  description:
    'Solicita y aparta tu fecha en Turpial Sound. Completa el formulario y el equipo revisará disponibilidad para confirmar tu sesión.',
  path: '/reservas',
})

export default function ReservasPage() {
  const paymentMethods = getEnabledPaymentMethods()
  const primaryPaymentMethodSlug = getPrimaryPaymentMethod().slug
  const paymentWindowMinutes = getPaymentWindowMinutes()

  return (
    <SectionShell background="surface" size="sm" className="py-4 md:py-5 lg:py-6">
      <div className="mx-auto max-w-5xl xl:max-w-6xl">
        <BookingRequestModule
          paymentMethods={paymentMethods}
          primaryPaymentMethodSlug={primaryPaymentMethodSlug}
          paymentWindowMinutes={paymentWindowMinutes}
        />
      </div>
    </SectionShell>
  )
}
