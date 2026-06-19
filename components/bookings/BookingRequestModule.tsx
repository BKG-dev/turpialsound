'use client'

import { useState } from 'react'
import { SectionHeading } from '@/components/sections/SectionShell'
import { BookingWizard } from '@/components/bookings/BookingWizard'
import type {
  BookingPaymentMethodConfig,
  BookingPaymentMethodSlug,
} from '@/lib/bookings/payment-settings.types'
import type { WhatsappVerificationConfig } from '@/lib/bookings/whatsapp-verify-config'

type SubmissionState = 'idle' | 'loading' | 'success' | 'error'

interface BookingRequestModuleProps {
  paymentMethods: BookingPaymentMethodConfig[]
  primaryPaymentMethodSlug: BookingPaymentMethodSlug
  paymentWindowMinutes: number
  whatsappVerificationConfig: WhatsappVerificationConfig
  isPreview: boolean
}

export function BookingRequestModule({
  paymentMethods,
  primaryPaymentMethodSlug,
  paymentWindowMinutes,
  whatsappVerificationConfig,
  isPreview,
}: BookingRequestModuleProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const isSuccess = submissionState === 'success'

  return (
    <>
      {isPreview && (
        <div className="mb-3 rounded-lg border border-amber-300/60 bg-amber-400/10 px-3 py-2 text-[11px] leading-snug text-amber-100 md:text-xs">
          MODO PREVIEW — Las reservas, pagos y notificaciones están desactivadas. Esta prueba no
          modifica producción.
        </div>
      )}
      <div className={isSuccess ? 'mb-1 md:mb-1' : 'mb-2 md:mb-1.5'}>
        <SectionHeading
          eyebrow="Formulario de solicitud"
          heading="Arma tu solicitud paso a paso."
          className={
            isSuccess
              ? '[&_h2]:hidden [&_div]:mb-1 [&_span]:text-[10px] md:[&_span]:text-[11px]'
              : '[&_h2]:text-xl md:[&_h2]:text-2xl [&_h2]:leading-tight [&_div]:mb-2 [&_span]:text-[10px] md:[&_span]:text-[11px]'
          }
        />
      </div>
      <BookingWizard
        paymentMethods={paymentMethods}
        primaryPaymentMethodSlug={primaryPaymentMethodSlug}
        paymentWindowMinutes={paymentWindowMinutes}
        whatsappVerificationConfig={whatsappVerificationConfig}
        isPreview={isPreview}
        onSubmissionStateChange={setSubmissionState}
      />
    </>
  )
}
