import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
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
    role: 'Artista · Salsero · Caracas',
    bio: "Apodado «El Sonero del Mundo», Oscar D'León lleva más de cinco décadas electrizando escenarios con su voz inconfundible y su contrabajo. Con más de 50 álbumes grabados y estadios llenos en cinco continentes, es la mayor figura de la salsa venezolana de todos los tiempos.",
    imageSrc: '/images/odl_800.jpg',
    accent: 'gold',
  },
  {
    name: 'Domingo Quiñones',
    role: 'Artista · Salsero · Puerto Rico',
    bio: "Conocido como «El Gallito de Puerto Rico», Domingo Quiñones debutó con el Conjunto Clásico en los ochenta y conquistó las listas latinas con discos que definieron la salsa romántica. Su voz aguda y su presencia escénica lo convierten en referencia indiscutible del género.",
    imageSrc: '/images/dq_800.jpg',
    accent: 'cyan',
  },
  {
    name: 'Dimensión Latina',
    role: 'Agrupación · Salsa · Venezuela',
    bio: 'Orquesta fundada en Caracas en 1972, considerada el gran semillero de la salsa venezolana. Entre sus filas pasaron Oscar D\'León, Willy Colón y César Monge. Su sonido define una época dorada de la música tropical latinoamericana y sigue siendo referencia de generaciones.',
    imageSrc: '/images/dl_800.jpg',
    accent: 'gold',
  },
  {
    name: 'Frank Quintero',
    role: 'Artista · Balada · Venezuela',
    bio: 'Cantautor venezolano de balada romántica con más de tres décadas de trayectoria regional. Sus temas han dominado las listas de popularidad del género en Latinoamérica y lo consolidan como una de las voces más sólidas y reconocidas del pop latino venezolano.',
    imageSrc: '/images/FQ.JPG',
    accent: 'cyan',
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

      {/* ── HERO NUMINOSO ─────────────────────────────────────────────── */}
      <NuminousHero
        imageSrc="/images/artista-hero.jpg"
        eyebrow="Artistas"
        heading="Trayectoria Que Habla Por Sí Sola."
        subheading="Desde hace más de tres décadas, Turpial Sound ha sido el espacio de trabajo de artistas que definen la música latinoamericana. Nombres que no necesitan presentación; un estudio que está a su altura."
        ctaLabel="Conocer el estudio"
        ctaHref="/estudio-de-grabacion"
        imageAlign="right"
      />

      {/* Artist cards */}
      <StackingSection index={0} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Trayectoria confirmada"
            heading="Algunos de los artistas que han pasado por aquí."
            subheading="Una selección de los artistas que nos han acompañado en Turpial Sound. Cada nombre, una historia que nos enorgullece contar."
            accentColor="cyan"
          />

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

          <p className="mt-8 text-sm text-text-muted italic">
            Hay capítulos aún por revelar — la discreción también forma parte de lo que ofrecemos.
          </p>
        </SectionShell>
      </StackingSection>

      {/* Photo gallery — wrapped for snap */}
      <StackingSection index={1} waves>
        <SectionShell background="none">
          <Mac3DGallery
            images={artistasImages}
            title="Artistas · Turpial Sound"
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
            <Button as="link" href="/nosotros" variant="secondary" size="sm">
              El equipo
            </Button>
            <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
              Estudio de grabación
            </Button>
          </div>
        </SectionShell>
      </StackingSection>

      {/* CTA — panoramic strip */}
      <StackingSection index={3}>
        <CTASection
          heading="¿Listo para añadir tu nombre a esta lista?"
          subheading="Contáctanos y hablamos de tu proyecto. El estudio está listo."
          ctaLabel="Iniciar conversación"
          ctaHref="/contacto"
          imageSrc="/images/salas-ensayo10.jpg"
          className="py-20 sm:py-28"
        />
      </StackingSection>
    </>
  )
}
