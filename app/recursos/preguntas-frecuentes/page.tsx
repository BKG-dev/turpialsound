import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildFAQSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { faqItems } from '@/content/faq'
import { PageHero } from '@/components/sections/PageHero'
import { SectionShell } from '@/components/sections/SectionShell'
import { FAQList } from '@/components/sections/FAQList'
import { CTASection } from '@/components/sections/CTASection'
import { siteConfig } from '@/content/site'

export const metadata: Metadata = generatePageMetadata({
  title: 'Preguntas frecuentes sobre grabación y ensayo en Caracas',
  description:
    'Respuestas a las preguntas más comunes sobre salas de ensayo, estudio de grabación y producción musical en Turpial Sound, Caracas.',
  path: '/recursos/preguntas-frecuentes',
})

export default function PreguntasFrecuentesPage() {
  const faqSchema = buildFAQSchema(faqItems.map((item) => ({
    question: item.question,
    answer: item.answer,
  })))
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Recursos', url: `${siteConfig.url}/recursos` },
    { name: 'Preguntas frecuentes', url: `${siteConfig.url}/recursos/preguntas-frecuentes` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Preguntas frecuentes"
        heading="Todo lo que necesitas saber."
      />

      <SectionShell>
        <div className="max-w-[720px]">
          <FAQList items={faqItems} />
        </div>
      </SectionShell>

      <CTASection
        heading="¿Tienes una pregunta diferente?"
        subheading="Escríbenos por WhatsApp y te respondemos directo."
        ctaLabel="Preguntar por WhatsApp"
      />
    </>
  )
}
