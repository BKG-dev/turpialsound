import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { Wand2, Mic, Sliders, Disc } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell } from '@/components/sections/SectionShell'
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
  const serviceSchema = service ? buildServiceSchema(service, { path: '/produccion-musical' }) : null
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
        ctaLabel="Hablar con el equipo"
        ctaHref="/reservas"
      />

      {/* ── SPLIT LAYOUT: Proceso + "También puede interesarte" (izq) | Galería (der) ── */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          {/*
           * Desktop (≥1024px): dos columnas 45% / 55%
           * Mobile (<1024px): columna única — Proceso → Galería → Links
           */}
          <div className="grid gap-10 lg:grid-cols-[28%_72%] lg:gap-20 lg:items-start">

            {/* ── COLUMNA IZQUIERDA: Proceso + Links ── */}
            <div className="flex flex-col lg:-ml-4">
              {/* Eyebrow + Título */}
              <div className="mb-4 flex items-center gap-3">
                <span className="accent-line-animated" aria-hidden="true" />
                <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                  Proceso
                </span>
              </div>
              <h2 className="font-display text-display-md text-text-primary mb-8">
                Cada etapa cubierta.
              </h2>

              {/* Tarjetas verticales (lista) */}
              <div className="flex flex-col gap-4">
                {steps.map((item) => (
                  <div
                    key={item.title}
                    className={`card-premium-wrapper${item.accent === 'gold' ? ' card-premium-wrapper--gold' : ''} rounded-2xl bg-brand-surface px-5 py-4 flex items-start gap-4`}
                  >
                    <item.Icon
                      size={18}
                      className="mt-0.5 shrink-0"
                      style={{ color: item.accent === 'cyan' ? 'var(--color-cyan)' : 'var(--color-gold)' }}
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="font-display text-sm text-text-primary">{item.title}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── COLUMNA DERECHA: Galería 3D + "También puede interesarte" ── */}
            <div className="flex w-full flex-col gap-10">
              <Mac3DGallery
                images={produccionImages}
                title="Producción musical · Turpial Sound"
                className="w-full"
              />

              {/* "También puede interesarte" — debajo del carrusel, centrado */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  <span className="accent-line-animated" aria-hidden="true" />
                  <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
                    También puede interesarte
                  </span>
                  <span className="accent-line-animated" aria-hidden="true" />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
                    Estudio de grabación
                  </Button>
                  <Button as="link" href="/servicios/arreglos-musicales" variant="secondary" size="sm">
                    Arreglos musicales
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </SectionShell>
      </StackingSection>

      {/* CTA — panoramic strip with pm1.jpg */}
      <StackingSection index={1}>
        <CTASection
          heading="¿Tienes un proyecto de producción?"
          subheading="Cuéntanos dónde estás y a dónde quieres llegar. Construimos el camino contigo."
          ctaLabel="Iniciar proyecto"
          ctaHref="/reservas"
          imageSrc="/images/produccion1.jpg"
        />
      </StackingSection>
    </>
  )
}
