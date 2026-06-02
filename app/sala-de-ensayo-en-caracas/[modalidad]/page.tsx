import type { Metadata } from 'next'
import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/metadata'
import {
  buildBreadcrumbSchema,
  buildLocalServiceOfferSchema,
  buildReservableProductOfferSchema,
} from '@/lib/schema'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import {
  getSalaEnsayoModality,
  salaEnsayoHubPath,
  salaEnsayoModalities,
  salaEnsayoProductImage,
} from '@/content/sala-de-ensayo-en-caracas'
import { siteConfig } from '@/content/site'

type ModalityPageParams = {
  params: { modalidad: string }
}

const reservableProductSlugs = new Set(['flexible', 'premium', 'prioritaria'])

export function generateStaticParams() {
  return salaEnsayoModalities.map((item) => ({ modalidad: item.slug }))
}

export function generateMetadata({ params }: ModalityPageParams): Metadata {
  const modality = getSalaEnsayoModality(params.modalidad)

  if (!modality) {
    return {
      title: 'Modalidad no encontrada',
      robots: { index: false, follow: false },
    }
  }

  const isReservableProduct = reservableProductSlugs.has(modality.slug)

  return generatePageMetadata({
    title: modality.title,
    description: `${modality.description} Precio publicado: ${modality.priceDisplay}.`,
    path: `${salaEnsayoHubPath}/${modality.slug}`,
    ...(isReservableProduct
      ? {
          ogImagePath: salaEnsayoProductImage.path,
          ogImageWidth: salaEnsayoProductImage.width,
          ogImageHeight: salaEnsayoProductImage.height,
        }
      : {}),
  })
}

export default function SalaDeEnsayoModalityPage({ params }: ModalityPageParams) {
  const modality = getSalaEnsayoModality(params.modalidad)
  if (!modality) notFound()

  const path = `${salaEnsayoHubPath}/${modality.slug}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Sala de ensayo en Caracas', url: `${siteConfig.url}${salaEnsayoHubPath}` },
    { name: modality.title, url: `${siteConfig.url}${path}` },
  ])

  const serviceSchema = buildLocalServiceOfferSchema({
    name: modality.serviceName,
    description: modality.serviceDescription,
    path,
    offer: {
      price: modality.price,
      priceCurrency: modality.priceCurrency,
      availability: 'https://schema.org/InStock',
      unitText: modality.unitText,
      description: modality.priceDisplay,
    },
  })

  const productSchema = reservableProductSlugs.has(modality.slug)
    ? buildReservableProductOfferSchema({
        name: modality.title,
        description: modality.productDescription ?? modality.serviceDescription,
        path,
        imagePath: salaEnsayoProductImage.path,
        imageWidth: salaEnsayoProductImage.width,
        imageHeight: salaEnsayoProductImage.height,
        category: 'Sala de ensayo en Caracas',
        offer: {
          price: modality.price,
          priceCurrency: modality.priceCurrency,
          availability: 'https://schema.org/InStock',
        },
      })
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <SectionShell>
        <SectionHeading
          eyebrow="Modalidad disponible en Caracas"
          heading={modality.title}
          subheading={modality.description}
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
            <h2 className="font-display text-lg text-text-primary">Precio publicado</h2>
            <p className="mt-3 text-sm text-text-secondary">{modality.priceDisplay}</p>
            <p className="mt-3 text-sm text-text-secondary">
              Disponibilidad actual: <strong>Disponible</strong>.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
            <h2 className="font-display text-lg text-text-primary">Diferencial</h2>
            <p className="mt-3 text-sm text-text-secondary">{modality.differential}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button as="link" href="/reservas" size="sm">
            Reservar ahora
          </Button>
          <Button as="link" href={salaEnsayoHubPath} variant="secondary" size="sm">
            Ver hub principal
          </Button>
          {modality.relatedExistingPath && (
            <Link
              href={modality.relatedExistingPath as Route}
              className="inline-flex items-center justify-center px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Ver página relacionada
            </Link>
          )}
        </div>
      </SectionShell>

      <SectionShell background="surface">
        <SectionHeading
          eyebrow="Ecosistema Turpial"
          heading="Una misma base creativa, varias formas de usarla."
          subheading="Esta modalidad forma parte del ecosistema de Turpial Sound para ensayar, grabar, producir y crear contenido profesional en Caracas."
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {salaEnsayoModalities
            .filter((item) => item.slug !== modality.slug)
            .map((item) => (
              <Link
                key={item.slug}
                href={`${salaEnsayoHubPath}/${item.slug}` as Route}
                className="card-premium-wrapper rounded-xl bg-brand-surface p-4 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <h3 className="font-display text-sm text-text-primary">{item.title}</h3>
                <p className="mt-2 text-xs text-text-secondary">{item.priceDisplay}</p>
              </Link>
            ))}
        </div>
      </SectionShell>

      <CTASection
        heading="¿Quieres avanzar con esta modalidad?"
        subheading="Continúa en reservas y envía tu solicitud con la opción que mejor se adapte a tu proyecto."
        ctaLabel="Ir a reservas"
        ctaHref="/reservas"
      />
    </>
  )
}
