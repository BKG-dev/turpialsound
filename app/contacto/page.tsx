import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell } from '@/components/sections/SectionShell'
import { ContactBlock } from '@/components/sections/ContactBlock'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Contacto — Reserva y consultas',
  description:
    'Reserva tu sala de ensayo, sesión de grabación o producción musical en Turpial Sound. Caracas, Venezuela. Respondemos por WhatsApp.',
  path: '/contacto',
})

export default function ContactoPage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Contacto', url: `${siteConfig.url}/contacto` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Contacto"
        heading="Hablemos de tu proyecto."
        subheading="Cuéntanos qué necesitas. Te ayudamos a definir el servicio correcto y revisamos disponibilidad."
      />

      <SectionShell>
        <div className="grid gap-12 lg:grid-cols-2">
          <ContactBlock
            heading="Escríbenos"
            subheading="La forma más rápida de coordinar es por WhatsApp. Respondemos en menos de 24 horas en días hábiles."
            showEmail
          />

          <div className="space-y-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
                Dónde estamos
              </p>
              <p className="mt-3 text-body-base text-text-secondary">
                {siteConfig.address.city}, {siteConfig.address.country}
                <br />
                <span className="text-text-muted text-sm">
                  Dirección exacta disponible al confirmar reserva.{/* CLIENT_REQUIRED */}
                </span>
              </p>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
                Servicios disponibles
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-text-secondary">
                <li>Salas de ensayo</li>
                <li>Estudio de grabación</li>
                <li>Producción musical</li>
                <li>Podcast y locución</li>
                <li>Video sessions</li>
                <li>Mezcla y masterización</li>
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>
    </>
  )
}
