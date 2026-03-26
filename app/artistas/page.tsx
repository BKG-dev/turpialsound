import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Artistas — Trayectoria verificable',
  description:
    'Artistas que han grabado y producido en Turpial Sound: Oscar D\'León, Domingo Quiñones, Dimensión Latina y más. Presencia en Caracas desde 2015.',
  path: '/artistas',
})

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
      />

      <SectionShell>
        <SectionHeading
          eyebrow="Trayectoria confirmada"
          heading="Algunos de los artistas que han trabajado aquí."
          subheading="Lista parcial — la nómina completa está sujeta a autorización de cada artista para publicación pública."
        />

        {/* CLIENT_REQUIRED: lista completa y autorizada de artistas con sus respectivos permisos */}
        <div className="mt-10 rounded-xl border border-brand-border bg-brand-surface p-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {['Oscar D\'León', 'Domingo Quiñones', 'Dimensión Latina'].map((artist) => (
              <li
                key={artist}
                className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-bg p-4"
              >
                {/* CLIENT_REQUIRED: imagen/logo del artista */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-brand-muted" aria-hidden="true" />
                <span className="font-medium text-text-primary">{artist}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-text-muted">
            + más artistas pendientes de autorización para publicación.{/* CLIENT_REQUIRED */}
          </p>
        </div>
      </SectionShell>

      <SectionShell background="surface" size="sm">
        <p className="text-sm font-medium uppercase tracking-widest text-text-muted">
          También puede interesarte
        </p>
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
