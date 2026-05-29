import type { Metadata } from 'next'
import Link from 'next/link'

const canonicalPath = '/salas-de-ensayo/arreglos-musicales-en-caracas'
const canonicalUrl = `https://www.turpialsound.com${canonicalPath}`
const heroImage = 'https://www.turpialsound.com/images/produccion6.jpg'

const faqItems = [
  {
    question: '¿Dónde puedo trabajar arreglos musicales en Caracas?',
    answer:
      'En Turpial Sound puedes solicitar arreglos musicales en Caracas para estructurar mejor tu canción.',
  },
  {
    question: '¿Qué son los arreglos musicales?',
    answer:
      'Son decisiones sobre estructura, instrumentación, dinámica y partes para fortalecer la intención musical del tema.',
  },
  {
    question: '¿Pueden ayudarme si solo tengo una idea?',
    answer:
      'Sí. Puedes llegar con una base o boceto y trabajar el arreglo para darle forma completa.',
  },
  {
    question: '¿Los arreglos son parte de la producción?',
    answer:
      'Se relacionan, pero aquí se trabaja de forma específica el arreglo musical como servicio puntual.',
  },
  {
    question: '¿Cómo reservo una sesión de arreglos?',
    answer:
      'Desde /reservas puedes iniciar la solicitud y detallar qué quieres desarrollar en tu canción.',
  },
  {
    question: '¿Sirve para bandas, solistas o productores?',
    answer:
      'Sí. Es útil para bandas, solistas y productores que necesitan reforzar la propuesta musical.',
  },
]

export const metadata: Metadata = {
  title: 'Arreglos musicales en Caracas',
  description:
    'Arreglos musicales en Caracas para fortalecer estructura, instrumentación y dinámica de tu canción en Turpial Sound.',
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: 'Arreglos musicales en Caracas | Turpial Sound',
    description:
      'Arreglos musicales en Caracas para fortalecer tu canción en Turpial Sound.',
    url: canonicalUrl,
    siteName: 'Turpial Sound',
    type: 'website',
    images: [{ url: heroImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arreglos musicales en Caracas | Turpial Sound',
    description:
      'Arreglos musicales en Caracas para fortalecer tu canción en Turpial Sound.',
    images: [heroImage],
  },
}

export default function ArreglosMusicalesEnCaracasPage() {
  const offerId = `${canonicalUrl}#offer`
  const imageId = `${canonicalUrl}#image`

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${canonicalUrl}#service`,
        name: 'Arreglos musicales en Caracas',
        serviceType: 'Arreglos musicales',
        description:
          'Servicio de arreglos musicales en Caracas para definir estructura, instrumentación y dinámica.',
        areaServed: { '@type': 'City', name: 'Caracas' },
        provider: {
          '@type': 'Organization',
          name: 'Turpial Sound',
          url: 'https://www.turpialsound.com',
        },
        url: canonicalUrl,
        image: { '@id': imageId },
        offers: { '@id': offerId },
      },
      {
        '@type': 'Offer',
        '@id': offerId,
        priceCurrency: 'USD',
        price: 200,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'USD',
          price: 200,
          unitText: 'tema',
        },
        description: 'Arreglos musicales desde 200 USD.',
        url: canonicalUrl,
      },
      {
        '@type': 'ImageObject',
        '@id': imageId,
        contentUrl: heroImage,
        url: heroImage,
        caption: 'Arreglos musicales en Turpial Sound, Caracas',
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.turpialsound.com' },
          { '@type': 'ListItem', position: 2, name: 'Salas de ensayo', item: 'https://www.turpialsound.com/salas-de-ensayo' },
          { '@type': 'ListItem', position: 3, name: 'Arreglos musicales en Caracas', item: canonicalUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }} />

      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <article className="space-y-8 text-white/90">
          <header className="space-y-4">
            <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold">
              Servicio transaccional en Caracas
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
              Arreglos musicales en Caracas para fortalecer tu canción
            </h1>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img src="/images/produccion6.jpg" alt="Arreglos musicales en Turpial Sound" className="h-64 w-full object-cover md:h-80" />
            </div>
          </header>

          <section className="rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
            <h2 className="text-xl font-semibold text-white">Respuesta rápida</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85 md:text-base">
              Si buscas arreglos musicales en Caracas, Turpial Sound te permite solicitar sesiones para
              trabajar estructura, partes, dinámica e instrumentación de tu canción. Desde /reservas
              puedes iniciar la solicitud según el estado de tu proyecto.
            </p>
            <p className="mt-4"><Link href="/reservas" className="text-sm font-semibold text-accent-gold hover:opacity-80">Reservar en Turpial Sound</Link></p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Datos clave del servicio</h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/85 md:grid-cols-2">
              <div><dt className="font-semibold text-white">Servicio:</dt><dd>Arreglos musicales en Caracas</dd></div>
              <div><dt className="font-semibold text-white">Ciudad:</dt><dd>Caracas, Venezuela</dd></div>
              <div><dt className="font-semibold text-white">Ubicación general:</dt><dd>Cerca de Colegio de Ingenieros</dd></div>
              <div><dt className="font-semibold text-white">Ideal para:</dt><dd>Proyectos que necesitan reforzar estructura e instrumentación</dd></div>
              <div><dt className="font-semibold text-white">Qué se puede reservar:</dt><dd>Sesión de arreglos por tema</dd></div>
              <div><dt className="font-semibold text-white">Precio desde:</dt><dd>200 USD</dd></div>
              <div><dt className="font-semibold text-white">CTA:</dt><dd>Reservar en Turpial Sound → /reservas</dd></div>
              <div><dt className="font-semibold text-white">Servicios relacionados:</dt><dd>/servicios/arreglos-musicales, /salas-de-ensayo</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Enlaces útiles</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/reservas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Reservar en Turpial Sound</Link>
              <Link href="/salas-de-ensayo" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Volver a salas de ensayo</Link>
              <Link href="/recursos/donde-reservar-sala-de-ensayo-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Guía para reservar en Caracas</Link>
              <Link href="/servicios/arreglos-musicales" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Ver arreglos musicales</Link>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Preguntas frecuentes</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-base font-semibold text-white">{item.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>
    </>
  )
}
