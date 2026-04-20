'use client'

import { useState } from 'react'
import { SectionHeading } from '@/components/sections/SectionShell'
import { BookingWizard } from '@/components/bookings/BookingWizard'
import type {
  BookingPaymentMethodConfig,
  BookingPaymentMethodSlug,
} from '@/lib/bookings/payment-settings'

type SubmissionState = 'idle' | 'loading' | 'success' | 'error'

interface BookingRequestModuleProps {
  paymentMethods: BookingPaymentMethodConfig[]
  primaryPaymentMethodSlug: BookingPaymentMethodSlug
  paymentWindowMinutes: number
}

export function BookingRequestModule({
  paymentMethods,
  primaryPaymentMethodSlug,
  paymentWindowMinutes,
}: BookingRequestModuleProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const isSuccess = submissionState === 'success'

  return (
    <>
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
        onSubmissionStateChange={setSubmissionState}
      />
    </>
  )
}
