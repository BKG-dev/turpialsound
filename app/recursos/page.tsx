import type { Metadata } from 'next'
import Link from 'next/link'
import { generatePageMetadata } from '@/lib/metadata'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { faqItems } from '@/content/faq'
import { FAQList } from '@/components/sections/FAQList'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Recursos y preguntas frecuentes',
  description:
    'Preguntas frecuentes y recursos sobre grabación, ensayo y producción musical en Turpial Sound, Caracas.',
  path: '/recursos',
})

export default function RecursosPage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Recursos', url: `${siteConfig.url}/recursos` },
  ])

  // Show a preview — full FAQ on subpage
  const previewFAQ = faqItems.slice(0, 4)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Recursos"
        heading="Respuestas directas a tus preguntas."
        subheading="Todo lo que necesitas saber antes de reservar o empezar tu proyecto."
      />

      <SectionShell>
        <SectionHeading eyebrow="Preguntas frecuentes" heading="Lo que más nos preguntan." />
        <div className="mt-10 max-w-[720px]">
          <FAQList items={previewFAQ} />
        </div>
        <div className="mt-8">
          <Link
            href="/recursos/preguntas-frecuentes"
            className="text-sm font-medium text-accent-gold transition-opacity hover:opacity-70"
          >
            Ver todas las preguntas →
          </Link>
        </div>
      </SectionShell>

      <CTASection
        heading="¿No encontraste lo que buscabas?"
        subheading="Escríbenos directamente y te respondemos."
        ctaLabel="Preguntar por WhatsApp"
      />
    </>
  )
}
