import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Producción musical en Caracas',
  description:
    'Producción musical completa en Caracas: arreglos, grabación, mezcla y masterización en un solo lugar. 30 años de experiencia. Turpial Sound.',
  path: '/produccion-musical',
})

export default function ProduccionMusicalPage() {
  const service = getServiceBySlug('produccion-musical')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Producción musical', url: `${siteConfig.url}/produccion-musical` },
  ])

  return (
    <>
      {serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Producción musical"
        heading="De la idea al master en un solo lugar."
        subheading="Producción integral con el equipo de Turpial Sound. Más de 30 años de experiencia acumulada en géneros tropicales, pop y producción contemporánea."
      >
        <Button as="link" href="/contacto" variant="primary" size="lg">
          Hablar con el equipo
        </Button>
      </PageHero>

      <SectionShell>
        <SectionHeading
          eyebrow="Proceso"
          heading="Cada etapa cubierta."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              step: '01',
              title: 'Arreglos',
              body: 'Estructura armónica, orquestación y dirección musical del proyecto.',
            },
            {
              step: '02',
              title: 'Grabación',
              body: 'Voces, instrumentos y samples en nuestro estudio tratado.',
            },
            {
              step: '03',
              title: 'Mezcla',
              body: 'Balance, ecualización y dinámica para que cada elemento tenga su espacio.',
            },
            {
              step: '04',
              title: 'Masterización',
              body: 'Entrega final optimizada para streaming, plataformas digitales y físico.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-brand-border bg-brand-surface p-6"
            >
              <span className="font-display text-4xl font-bold text-brand-muted">{item.step}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell background="surface" size="sm">
        <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
          También puede interesarte
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
            Estudio de grabación
          </Button>
          <Button as="link" href="/servicios/arreglos-musicales" variant="secondary" size="sm">
            Arreglos musicales
          </Button>
        </div>
      </SectionShell>

      <CTASection
        heading="¿Tienes un proyecto de producción?"
        subheading="Cuéntanos dónde estás y a dónde quieres llegar."
      />
    </>
  )
}
