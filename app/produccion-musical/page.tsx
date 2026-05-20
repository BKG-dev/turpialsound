import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { Wand2, Mic, Sliders, Disc } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const produccionImages = getPublicImages('produccion')

export const metadata: Metadata = generatePageMetadata({
  title: 'Producción musical en Caracas',
  description:
    'Producción musical completa en Caracas: arreglos, grabación, mezcla y masterización en un solo lugar. 30 años de experiencia. Turpial Sound.',
  path: '/produccion-musical',
})

const steps: Array<{ Icon: LucideIcon; title: string; body: string; accent: 'gold' | 'cyan' }> = [
  {
    Icon: Wand2,
    title: 'Arreglos',
    body: 'Estructura armónica, orquestación y dirección musical del proyecto.',
    accent: 'gold',
  },
  {
    Icon: Mic,
    title: 'Grabación',
    body: 'Voces, instrumentos y samples en nuestro estudio tratado.',
    accent: 'cyan',
  },
  {
    Icon: Sliders,
    title: 'Mezcla',
    body: 'Balance, ecualización y dinámica para que cada elemento tenga su espacio.',
    accent: 'gold',
  },
  {
    Icon: Disc,
    title: 'Masterización',
    body: 'Entrega final optimizada para streaming, plataformas digitales y físico.',
    accent: 'cyan',
  },
]

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

      {/* ── HERO NUMINOSO ─────────────────────────────────────────────── */}
      <NuminousHero
        imageSrc="/images/produccion2.jpg"
        eyebrow="Producción musical"
        heading="Donde la Idea Se Convierte en Obra."
        subheading="Producción integral de alto nivel: arreglos, grabación, mezcla y masterización bajo un mismo criterio técnico. Más de 30 años materializando visiones musicales con estándar de exportación."
        ctaLabel="Reserva ahora"
        ctaHref="/reservas"
      />

      {/* Proceso */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Proceso"
            heading="Cada etapa cubierta."
            accentColor="gold"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {steps.map((item) => (
              <div
                key={item.title}
                className={`card-premium-wrapper${item.accent === 'gold' ? ' card-premium-wrapper--gold' : ''} rounded-2xl bg-brand-surface p-6`}
              >
                <item.Icon
                  size={22}
                  className="mb-4"
                  style={{ color: item.accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                  aria-hidden="true"
                />
                <h3 className="font-display text-sm text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* Photo gallery — 3D carousel, wrapped for correct snap */}
      <StackingSection index={1} waves>
        <SectionShell background="none">
          <Mac3DGallery
            images={produccionImages}
            title="Producción musical · Turpial Sound"
          />
        </SectionShell>
      </StackingSection>

      {/* Related services */}
      <StackingSection index={2} background="surface" waves>
        <SectionShell background="none" size="sm">
          <div className="flex items-center gap-4">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              También puede interesarte
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
              Estudio de grabación
            </Button>
            <Button as="link" href="/servicios/arreglos-musicales" variant="secondary" size="sm">
              Arreglos musicales
            </Button>
          </div>
        </SectionShell>
      </StackingSection>

      {/* CTA — panoramic strip with pm1.jpg */}
      <StackingSection index={3}>
        <CTASection
          heading="¿Tienes un proyecto de producción?"
          subheading="Cuéntanos dónde estás y a dónde quieres llegar. Construimos el camino contigo."
          ctaLabel="Reserva ahora"
          ctaHref="/reservas"
          imageSrc="/images/produccion1.jpg"
        />
      </StackingSection>
    </>
  )
}
