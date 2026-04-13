import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { BookingProcessSteps } from '@/components/bookings/BookingProcessSteps'
import { BookingWizard } from '@/components/bookings/BookingWizard'

export const metadata: Metadata = generatePageMetadata({
  title: 'Solicitar reserva',
  description:
    'Solicita y aparta tu fecha en Turpial Sound. Completa el formulario y el equipo revisará disponibilidad para confirmar tu sesión.',
  path: '/reservas',
})

export default function ReservasPage() {
  return (
    <>
      <PageHero
        eyebrow="Reservas"
        heading="Solicita y aparta tu fecha."
        subheading="Completa el formulario con los detalles de tu proyecto. El equipo revisará disponibilidad y te confirmaremos las condiciones antes de agendar."
      />

      {/* Cómo funciona el proceso */}
      <SectionShell background="default">
        <SectionHeading
          eyebrow="Cómo funciona"
          heading="Del formulario a la confirmación."
          subheading="Las reservas en Turpial Sound pasan por un proceso de revisión interna. No es reserva instantánea — es una solicitud con aprobación, para garantizar que tu sesión esté bien planificada."
        />
        <div className="mt-10">
          <BookingProcessSteps />
        </div>
      </SectionShell>

      {/* Wizard de solicitud */}
      <SectionShell background="surface">
        <div className="mx-auto max-w-5xl xl:max-w-6xl">
          <div className="mb-4 md:mb-2">
            <SectionHeading
              eyebrow="Formulario de solicitud"
              heading="Arma tu solicitud paso a paso."
            />
          </div>
          <div className="mt-4 md:mt-2">
            <BookingWizard />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Al enviar tu solicitud no estás reservando todavía. El equipo la revisará y te
            contactará para confirmar disponibilidad y condiciones.
          </p>
        </div>
      </SectionShell>
    </>
  )
}
