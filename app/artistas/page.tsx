import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getImageArray, IMAGE_PREFIXES } from '@/lib/imageArrays'

const artistasImages = getImageArray(IMAGE_PREFIXES.artistas, 0)

export const metadata: Metadata = generatePageMetadata({
  title: 'Artistas — Trayectoria verificable',
  description:
    "Artistas que han grabado y producido en Turpial Sound: Oscar D'León, Domingo Quiñones, Dimensión Latina y más. Presencia en Caracas desde 2015.",
  path: '/artistas',
})

const confirmedArtists = ["Oscar D'León", 'Domingo Quiñones', 'Dimensión Latina']

export default function ArtistasPage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Artistas', url: `${siteConfig.url}/artistas` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Artistas"
        heading="Trayectoria que habla por sí sola."
        subheading="Desde 2015, Turpial Sound ha sido el espacio de trabajo de artistas reconocidos en Venezuela y la región."
        accentColor="cyan"
      />

      <SectionShell>
        <SectionHeading
          eyebrow="Trayectoria confirmada"
          heading="Algunos de los artistas que han trabajado aquí."
          subheading="Lista parcial — la nómina completa está sujeta a autorización de cada artista para publicación pública."
          accentColor="cyan"
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {confirmedArtists.map((artist, i) => (
            <li
              key={artist}
              className="flex items-center gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 transition-all duration-250 hover:border-accent-cyan/30"
            >
              {/* Avatar placeholder */}
              <div
                className="h-12 w-12 shrink-0 rounded-full"
                style={{
                  background:
                    i % 2 === 0
                      ? 'radial-gradient(circle, rgba(255,193,7,0.15) 0%, rgba(255,193,7,0.03) 100%)'
                      : 'radial-gradient(circle, rgba(0,174,239,0.15) 0%, rgba(0,174,239,0.03) 100%)',
                  border: `1px solid ${i % 2 === 0 ? 'rgba(255,193,7,0.15)' : 'rgba(0,174,239,0.15)'}`,
                }}
                aria-hidden="true"
              />
              <span className="font-display text-sm text-text-primary">{artist}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-text-muted">
          + más artistas pendientes de autorización para publicación.
        </p>
      </SectionShell>

      {/* Photo gallery — 3D carousel */}
      <SectionShell>
        <Mac3DGallery
          images={artistasImages}
          title="Artistas · Turpial Sound"
        />
      </SectionShell>

      <SectionShell background="surface" size="sm">
        <div className="flex items-center gap-4">
          <span className="accent-line-animated" aria-hidden="true" />
          <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
            También puede interesarte
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button as="link" href="/nosotros" variant="secondary" size="sm">
            El equipo
          </Button>
          <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
            Estudio de grabación
          </Button>
        </div>
      </SectionShell>

      <CTASection
        heading="¿Listo para añadir tu nombre a esta lista?"
        subheading="Contáctanos y hablamos de tu proyecto."
      />
    </>
  )
}
