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
  title: 'Estudio de grabación en Caracas',
  description:
    'Estudio de grabación profesional en Caracas. Consola, microfonía de referencia y criterio técnico. El estudio de Oscar D\'León, Domingo Quiñones y más. Turpial Sound.',
  path: '/estudio-de-grabacion',
})

export default function EstudioDeGrabacionPage() {
  const service = getServiceBySlug('estudio-de-grabacion')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Estudio de grabación', url: `${siteConfig.url}/estudio-de-grabacion` },
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
        eyebrow="Estudio de grabación"
        heading="Sonido de estudio. Criterio sin concesiones."
        subheading="Consola de referencia, microfonía de alto nivel y sala de control tratada. El mismo espacio donde grabaron Oscar D'León, Domingo Quiñones y Dimensión Latina."
      >
        <Button as="link" href="/contacto" variant="primary" size="lg">
          Cotizar sesión
        </Button>
      </PageHero>

      {/* Equipment — CLIENT_REQUIRED: especificaciones reales */}
      <SectionShell>
        <SectionHeading
          eyebrow="Equipamiento"
          heading="Herramientas que marcan la diferencia."
          subheading="Cada pieza fue elegida por criterio técnico, no por catálogo."
        />
        <div className="mt-10 rounded-xl border border-brand-border bg-brand-surface p-8">
          <p className="text-sm text-text-muted">
            {/* CLIENT_REQUIRED: lista completa de equipamiento */}
            Lista de equipamiento disponible próximamente. Contáctanos para detalles técnicos
            específicos.
          </p>
        </div>
      </SectionShell>

      {/* Authority signal */}
      <SectionShell background="surface" size="sm">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
            Artistas que han grabado aquí
          </p>
          <p className="mt-4 font-display text-xl font-semibold text-text-secondary">
            Oscar D&apos;León · Domingo Quiñones · Dimensión Latina
            {/* CLIENT_REQUIRED: lista autorizada completa */}
          </p>
          <Button as="link" href="/artistas" variant="ghost" size="sm" className="mt-4">
            Ver todos los artistas →
          </Button>
        </div>
      </SectionShell>

      <SectionShell size="sm">
        <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
          También puede interesarte
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
            Producción musical
          </Button>
          <Button as="link" href="/servicios/mezcla-masterizacion" variant="secondary" size="sm">
            Mezcla y masterización
          </Button>
        </div>
      </SectionShell>

      <CTASection
        heading="¿Cuándo empezamos a grabar?"
        subheading="Cuéntanos sobre tu proyecto y armamos la sesión ideal."
      />
    </>
  )
}
