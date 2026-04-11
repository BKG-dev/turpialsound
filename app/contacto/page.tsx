import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { Mic, Radio, Music, Mic2, Video, Sliders } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell } from '@/components/sections/SectionShell'
import { ContactBlock } from '@/components/sections/ContactBlock'
import { StackingSection } from '@/components/home/StackingSection'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Contacto — Reserva y consultas',
  description:
    'Reserva tu sala de ensayo, sesión de grabación o producción musical en Turpial Sound. Caracas, Venezuela. Respondemos por WhatsApp.',
  path: '/contacto',
})

const services: Array<{ name: string; Icon: LucideIcon }> = [
  { name: 'Salas de ensayo',       Icon: Mic    },
  { name: 'Estudio de grabación',  Icon: Radio  },
  { name: 'Producción musical',    Icon: Music  },
  { name: 'Podcast y locución',    Icon: Mic2   },
  { name: 'Video sessions',        Icon: Video  },
  { name: 'Mezcla y masterización',Icon: Sliders},
]

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
        accentColor="cyan"
      />

      <StackingSection index={0} waves>
        <SectionShell background="none">
        <div className="grid gap-12 lg:grid-cols-2">
          <ContactBlock
            heading="Escríbenos"
            subheading="La forma más rápida de coordinar es por WhatsApp. Respondemos en menos de 24 horas en días hábiles."
            showEmail
          />

          <div className="space-y-8">
            <div>
              <p className="font-display text-xs tracking-[0.25em] text-text-muted uppercase">
                Dónde estamos
              </p>
              <p className="mt-3 text-body-base text-text-secondary">
                {siteConfig.address.city}, {siteConfig.address.country}
                <br />
                <span className="text-sm text-text-muted">
                  Dirección exacta disponible al confirmar reserva.
                </span>
              </p>
            </div>

            <div>
              <p className="font-display text-xs tracking-[0.25em] text-text-muted uppercase">
                Servicios disponibles
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {services.map(({ name, Icon }) => (
                  <li key={name} className="flex items-center gap-3 text-sm text-text-secondary">
                    <Icon size={14} className="shrink-0 text-accent-cyan opacity-70" aria-hidden="true" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        </SectionShell>
      </StackingSection>
    </>
  )
}
