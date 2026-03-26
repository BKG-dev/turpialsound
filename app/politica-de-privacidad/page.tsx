import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell } from '@/components/sections/SectionShell'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Política de privacidad',
  description: `Política de privacidad de ${siteConfig.name}.`,
  path: '/politica-de-privacidad',
  noIndex: true,
})

export default function PoliticaDePrivacidadPage() {
  return (
    <>
      <PageHero eyebrow="Legal" heading="Política de privacidad." />

      <SectionShell>
        <div className="prose prose-invert max-w-prose">
          {/* CLIENT_REQUIRED: texto legal real revisado por asesor */}
          <p className="text-text-secondary">
            Este documento describe cómo {siteConfig.name} recopila, usa y protege la información
            personal de los usuarios que interactúan con este sitio web.
          </p>

          <h2 className="font-display text-xl font-bold text-text-primary mt-8">
            Información que recopilamos
          </h2>
          <p className="text-text-secondary">
            {/* CLIENT_REQUIRED: política de privacidad real */}
            Contenido pendiente de revisión legal.
          </p>

          <h2 className="font-display text-xl font-bold text-text-primary mt-8">
            Uso de la información
          </h2>
          <p className="text-text-secondary">
            {/* CLIENT_REQUIRED */}
            Contenido pendiente de revisión legal.
          </p>

          <h2 className="font-display text-xl font-bold text-text-primary mt-8">
            Contacto
          </h2>
          <p className="text-text-secondary">
            Para consultas sobre privacidad, escríbenos a{' '}
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-accent-gold hover:underline"
            >
              {siteConfig.email}
            </a>
          </p>
        </div>
      </SectionShell>
    </>
  )
}
