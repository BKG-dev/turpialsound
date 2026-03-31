import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import { NuminousPersonCard } from '@/components/ui/NuminousPersonCard'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const artistasImages = getPublicImages('artista')

export const metadata: Metadata = generatePageMetadata({
  title: 'Artistas — Trayectoria verificable',
  description:
    "Artistas que han grabado y producido en Turpial Sound: Oscar D'León, Domingo Quiñones, Dimensión Latina y más. Presencia en Caracas desde 2015.",
  path: '/artistas',
})

const confirmedArtists: Array<{
  name: string
  role: string
  bio: string
  imageSrc: string
  accent: 'gold' | 'cyan'
}> = [
  {
    name: "Oscar D'León",
    bio: '[CLIENT_REQUIRED — biografía y créditos de grabación.]',
    role: 'Artista · Salsero · Caracas',
    imageSrc: '/images/odl_800.jpg',
    accent: 'gold',
  },
  {
    name: 'Domingo Quiñones',
    bio: '[CLIENT_REQUIRED — biografía y créditos de grabación.]',
    role: 'Artista · Salsero · Puerto Rico',
    imageSrc: '/images/dq_800.jpg',
    accent: 'cyan',
  },
  {
    name: 'Dimensión Latina',
    bio: '[CLIENT_REQUIRED — biografía y créditos de grabación.]',
    role: 'Agrupación · Salsa · Venezuela',
    imageSrc: '/images/dl_800.jpg',
    accent: 'gold',
  },
]

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

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {confirmedArtists.map((artist) => (
            <li key={artist.name}>
              <NuminousPersonCard
                name={artist.name}
                role={artist.role}
                bio={artist.bio}
                imageSrc={artist.imageSrc}
                accent={artist.accent}
              />
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-text-muted">
          + más artistas pendientes de autorización para publicación.
        </p>
      </SectionShell>

      {/* Photo gallery — group photo carousel */}
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
