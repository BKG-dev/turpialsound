import type { Metadata } from 'next'
import type { Route } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildLocalServiceOfferSchema } from '@/lib/schema'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import {
  salaEnsayoHubPath,
  salaEnsayoModalities,
} from '@/content/sala-de-ensayo-en-caracas'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Sala de ensayo en Caracas',
  description:
    'Sala de ensayo en Caracas con modalidades Flexible, Premium y Prioritaria, precios desde 20 USD/h y reserva online en Turpial Sound.',
  path: salaEnsayoHubPath,
})

const bookingModes = salaEnsayoModalities.filter((item) =>
  ['flexible', 'premium', 'prioritaria'].includes(item.slug),
)

const serviceModes = salaEnsayoModalities.filter(
  (item) => !['flexible', 'premium', 'prioritaria'].includes(item.slug),
)

export default function SalaDeEnsayoEnCaracasHubPage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Sala de ensayo en Caracas', url: `${siteConfig.url}${salaEnsayoHubPath}` },
  ])

  const serviceSchema = buildLocalServiceOfferSchema({
    name: 'Sala de ensayo en Caracas',
    description:
      'Hub de modalidades de ensayo, grabación, producción y contenido profesional en Turpial Sound Caracas.',
    path: salaEnsayoHubPath,
    offer: {
      price: 20,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      unitText: 'hora',
      description: 'Tarifa publicada desde 20 USD por hora para modalidad Flexible.',
    },
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <SectionShell>
        <SectionHeading
          eyebrow="Hub local en Caracas"
          heading="Sala de ensayo en Caracas: modalidades y servicios en un solo ecosistema."
          subheading="Turpial Sound ofrece distintas modalidades para ensayar, grabar, producir, crear contenido, hacer podcast, locución y video sessions desde un mismo ecosistema creativo en Caracas."
        />

        <div className="mt-8 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
          <p className="text-sm text-text-primary">
            Tarifa base publicada: <strong>desde 20 USD por hora</strong>.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Todas las modalidades listadas se encuentran disponibles para reserva o contratación.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button as="link" href="/reservas" size="sm">
              Reservar ahora
            </Button>
            <Button as="link" href="/servicios" variant="secondary" size="sm">
              Ver servicios
            </Button>
          </div>
        </div>
      </SectionShell>

      <SectionShell background="surface">
        <SectionHeading
          eyebrow="Modalidades de sala"
          heading="Elige cómo quieres reservar tu sesión."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {bookingModes.map((mode) => (
            <Link
              key={mode.slug}
              href={`${salaEnsayoHubPath}/${mode.slug}` as Route}
              className="card-premium-wrapper rounded-xl bg-brand-surface p-5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <h2 className="font-display text-lg text-text-primary">{mode.title}</h2>
              <p className="mt-3 text-sm text-text-secondary">{mode.differential}</p>
              <p className="mt-4 text-sm font-semibold text-accent-gold">{mode.priceDisplay}</p>
            </Link>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Modalidades por servicio"
          heading="Usa el ecosistema según tu objetivo creativo."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceModes.map((mode) => (
            <Link
              key={mode.slug}
              href={`${salaEnsayoHubPath}/${mode.slug}` as Route}
              className="card-premium-wrapper rounded-xl bg-brand-surface p-5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <h2 className="font-display text-base text-text-primary">{mode.title}</h2>
              <p className="mt-3 text-sm text-text-secondary">{mode.serviceDescription}</p>
              <p className="mt-4 text-sm font-semibold text-accent-cyan">{mode.priceDisplay}</p>
            </Link>
          ))}
        </div>
      </SectionShell>

      <CTASection
        heading="¿Listo para reservar tu modalidad?"
        subheading="Selecciona la modalidad ideal y continúa el proceso en reservas."
        ctaLabel="Ir a reservas"
        ctaHref="/reservas"
      />
    </>
  )
}
