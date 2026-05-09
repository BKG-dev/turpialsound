import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const studioImages = [
  ...getPublicImages('estudio-grabacion'),
  ...getPublicImages('salas-ensayo'),
]

export const metadata: Metadata = generatePageMetadata({
  title: 'Estudio de grabación en Caracas',
  description:
    "Estudio de grabación profesional en Caracas. Consola, microfonía de referencia y criterio técnico. El estudio de Oscar D'León, Domingo Quiñones y más. Turpial Sound.",
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

      {/* ── HERO NUMINOSO ─────────────────────────────────────────────── */}
      <NuminousHero
        imageSrc="/images/consola.jpg"
        eyebrow="Estudio de grabación"
        heading="Sonido de Estudio. Criterio Sin Concesiones."
        subheading="Consola de referencia, microfonía de alto nivel y sala de control tratada acústicamente. El mismo espacio donde grabaron Oscar D'León, Domingo Quiñones y Dimensión Latina. Más de 30 años de criterio técnico al servicio de tu obra."
        ctaLabel="Cotizar sesión"
        ctaHref="/reservas"
      />

      {/* Equipment */}
      <StackingSection index={0} background="surface" waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Equipamiento"
            heading="Herramientas que marcan la diferencia."
            subheading="Cada pieza fue elegida por criterio técnico, no por catálogo."
            accentColor="cyan"
          />
          <div className="mt-10 rounded-2xl border border-brand-border bg-brand-bg p-8">
            <div
              className="h-px w-full opacity-20 mb-6"
              style={{ background: 'linear-gradient(90deg, transparent, #00AEEF, transparent)' }}
              aria-hidden="true"
            />
            <p className="text-sm text-text-muted">
              Lista de equipamiento disponible próximamente. Contáctanos para detalles técnicos específicos.
            </p>
            <div
              className="h-px w-full opacity-20 mt-6"
              style={{ background: 'linear-gradient(90deg, transparent, #FFC107, transparent)' }}
              aria-hidden="true"
            />
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── SECCIÓN UNIFICADA: Artistas → Galería → "También puede interesarte" ── */}
      <StackingSection index={1} waves>
        <SectionShell background="none" size="sm">
          {/* PARTE SUPERIOR: Artistas */}
          <div className="flex flex-col items-center gap-4 text-center mb-4">
            <div className="flex items-center justify-center gap-4">
              <span className="accent-line-animated" aria-hidden="true" />
              <span className="font-display text-xs tracking-[0.3em] uppercase text-gradient-animated">
                Artistas que han grabado aquí
              </span>
            </div>
            <p className="font-display text-xl text-text-secondary">
              Oscar D&apos;León · Domingo Quiñones · Dimensión Latina
            </p>
            <Button as="link" href="/artistas" variant="ghost" size="sm">
              Ver todos los artistas →
            </Button>
          </div>

          {/* PARTE CENTRAL: Galería 3D */}
          <Mac3DGallery
            images={studioImages}
            title="Estudio de grabación · Turpial Sound"
            compact
          />

          {/* PARTE INFERIOR: "También puede interesarte" */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="accent-line-animated" aria-hidden="true" />
              <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                También puede interesarte
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
                Producción musical
              </Button>
              <Button as="link" href="/servicios/mezcla-masterizacion" variant="secondary" size="sm">
                Mezcla y masterización
              </Button>
            </div>
          </div>
        </SectionShell>
      </StackingSection>

      {/* CTA — panoramic strip */}
      <StackingSection index={2}>
        <CTASection
          heading="¿Cuándo empezamos a grabar?"
          subheading="Cuéntanos sobre tu proyecto y armamos la sesión ideal para tu obra."
          ctaLabel="Cotizar sesión"
          ctaHref="/reservas"
          imageSrc="/images/estudio-grabacion.jpg"
          className="py-20 sm:py-28"
        />
      </StackingSection>
    </>
  )
}
