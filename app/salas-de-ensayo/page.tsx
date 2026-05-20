import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { Waves, Zap, Music2, Speaker, CalendarCheck, Guitar, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const salasImages = ['/images/se1.jpg', ...getPublicImages('salas-ensayo')]

export const metadata: Metadata = generatePageMetadata({
  title: 'Salas de ensayo en Caracas',
  description:
    'Salas de ensayo profesionales en Caracas. Tratamiento acústico, equipamiento incluido y disponibilidad flexible. Turpial Sound.',
  path: '/salas-de-ensayo',
})

const features: Array<{ Icon: LucideIcon; label: string }> = [
  { Icon: Waves,         label: 'Tratamiento acústico profesional' },
  { Icon: Zap,           label: 'Amplificadores de referencia' },
  { Icon: Music2,        label: 'Batería acústica completa' },
  { Icon: Speaker,       label: 'Sistema PA y monitoreo' },
  { Icon: CalendarCheck, label: 'Disponibilidad flexible' },
  { Icon: Guitar,        label: 'Ingreso con instrumento propio' },
]

const artistasDestacados = [
  { src: '/images/odl_800.jpg', name: "Oscar D'León" },
  { src: '/images/dq_800.jpg',  name: 'Domingo Quiñones' },
  { src: '/images/dl_800.jpg',  name: 'Dimensión Latina' },
  { src: '/images/FQ.JPG',      name: 'Frank Quintero' },
]

export default function SalasDeEnsayoPage() {
  const service = getServiceBySlug('salas-de-ensayo')
  const serviceSchema = service ? buildServiceSchema(service) : null
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Salas de ensayo', url: `${siteConfig.url}/salas-de-ensayo` },
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
        imageSrc="/images/SDE1.jpg"
        eyebrow="Salas de ensayo"
        heading="El Escenario Antes Del Escenario."
        subheading="Acústica milimétrica y backline de élite. Un espacio diseñado para la ejecución perfecta, la práctica profunda y la evolución de tu producción musical."
        ctaLabel="Reserva ahora"
        ctaHref="/reservas"
      />

      {/* Features — con iconografía y borde animado premium */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Lo que incluye"
            heading="Equipamiento y espacio diseñados para rendir."
            accentColor="gold"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, label }) => (
              <div
                key={label}
                className="card-premium-wrapper card-premium-wrapper--gold flex items-start gap-4 rounded-xl bg-brand-surface p-5"
              >
                <Icon
                  size={16}
                  className="mt-0.5 shrink-0 text-accent-gold"
                  aria-hidden="true"
                />
                <span className="text-sm text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </SectionShell>
      </StackingSection>

      {/* Galería 3D — wrapped in StackingSection for correct snap */}
      <StackingSection index={1} waves>
        <SectionShell background="none">
          <Mac3DGallery
            images={salasImages}
            title="Salas de ensayo · Turpial Sound"
          />
        </SectionShell>
      </StackingSection>

      {/* Artistas — clon de la sección del Home */}
      <StackingSection index={2} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Trayectoria verificable"
            heading="Artistas que nos han acompañado"
            subheading="Oscar D'León · Domingo Quiñones · Dimensión Latina · Frank Quintero"
            align="center"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {artistasDestacados.map(({ src, name }) => (
              <div
                key={name}
                className="card-premium-wrapper group rounded-2xl bg-brand-surface"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl">
                  <Image
                    src={src}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 via-transparent to-transparent" />
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="font-display text-sm font-semibold text-text-primary">{name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/artistas"
              className="font-display text-xs tracking-widest text-accent-cyan uppercase transition-opacity hover:opacity-70"
            >
              Ver trayectoria completa →
            </Link>
          </div>
        </SectionShell>
      </StackingSection>

      {/* Related services */}
      <StackingSection index={3} background="surface" waves>
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
            <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
              Producción musical
            </Button>
          </div>
        </SectionShell>
      </StackingSection>

      {/* CTA — panoramic strip with SDE2.jpg */}
      <StackingSection index={4}>
        <CTASection
          heading="¿Cuándo quieres ensayar?"
          subheading="Revisa disponibilidad y reserva tu sala. El espacio está listo cuando tú lo estés."
          ctaLabel="Reserva ahora"
          ctaHref="/reservas"
          imageSrc="/images/SDE2.jpg"
          className="py-20 sm:py-28"
        />
      </StackingSection>
    </>
  )
}
