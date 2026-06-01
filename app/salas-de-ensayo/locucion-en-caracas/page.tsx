import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const canonicalPath = '/salas-de-ensayo/locucion-en-caracas'
const canonicalUrl = `https://www.turpialsound.com${canonicalPath}`
const heroImage = 'https://www.turpialsound.com/images/estudio-grabacion4.jpg'

const faqItems = [
  {
    question: '¿Dónde puedo grabar locución en Caracas?',
    answer:
      'En Turpial Sound puedes solicitar locución en Caracas para piezas comerciales, institucionales y contenido digital.',
  },
  {
    question: '¿Qué tipo de piezas puedo grabar?',
    answer:
      'Puedes grabar voz en off, cuñas, narraciones para contenido, piezas corporativas y recursos de audio para campañas.',
  },
  {
    question: '¿Puedo grabar voz para comerciales o redes?',
    answer:
      'Sí. Puedes trabajar materiales para anuncios, redes sociales y piezas de marca con enfoque en claridad vocal.',
  },
  {
    question: '¿Necesito llevar guion?',
    answer:
      'Es recomendable llevar una base de guion para optimizar tiempos y dejar clara la intención de la pieza.',
  },
  {
    question: '¿Cómo reservo una sesión de locución?',
    answer:
      'Desde /reservas puedes iniciar la solicitud y especificar que necesitas una sesión de locución.',
  },
  {
    question: '¿Locución y podcast son lo mismo?',
    answer:
      'No. La locución se orienta a piezas de voz puntuales; el podcast se orienta a episodios y conversación.',
  },
]

export const metadata: Metadata = {
  title: 'Locución en Caracas',
  description:
    'Locución en Caracas para voz en off, cuñas y contenido comercial o creativo en Turpial Sound.',
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: 'Locución en Caracas | Turpial Sound',
    description:
      'Locución en Caracas para voces comerciales y creativas en Turpial Sound.',
    url: canonicalUrl,
    siteName: 'Turpial Sound',
    type: 'website',
    images: [{ url: heroImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Locución en Caracas | Turpial Sound',
    description:
      'Locución en Caracas para voces comerciales y creativas en Turpial Sound.',
    images: [heroImage],
  },
}

export default function LocucionEnCaracasPage() {
  const offerId = `${canonicalUrl}#offer`
  const imageId = `${canonicalUrl}#image`

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${canonicalUrl}#service`,
        name: 'Locución en Caracas',
        serviceType: 'Locución comercial y creativa',
        description:
          'Servicio de locución en Caracas para voz en off, cuñas, narración y piezas de contenido.',
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
        price: 50,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'USD',
          price: 50,
          unitText: 'hora',
        },
        description: 'Locución desde 50 USD.',
        url: canonicalUrl,
        availability: 'https://schema.org/InStock',
        itemOffered: { '@id': `${canonicalUrl}#service` },
      },
      {
        '@type': 'ImageObject',
        '@id': imageId,
        contentUrl: heroImage,
        url: heroImage,
        caption: 'Locución en Turpial Sound, Caracas',
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
          { '@type': 'ListItem', position: 3, name: 'Locución en Caracas', item: canonicalUrl },
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
              Locución en Caracas para voces comerciales y creativas
            </h1>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/images/estudio-grabacion4.jpg"
                alt="Locución en Turpial Sound"
                width={1600}
                height={900}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="h-64 w-full object-cover md:h-80"
              />
            </div>
          </header>

          <section className="rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
            <h2 className="text-xl font-semibold text-white">Respuesta rápida</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85 md:text-base">
              Si buscas locución en Caracas, Turpial Sound te permite solicitar sesiones para voz en
              off, cuñas, reels y piezas comerciales o institucionales. Desde /reservas puedes indicar
              el tipo de pieza y coordinar tu grabación.
            </p>
            <p className="mt-4"><Link href="/reservas" className="text-sm font-semibold text-accent-gold hover:opacity-80">Reservar en Turpial Sound</Link></p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Datos clave del servicio</h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/85 md:grid-cols-2">
              <div><dt className="font-semibold text-white">Servicio:</dt><dd>Locución en Caracas</dd></div>
              <div><dt className="font-semibold text-white">Ciudad:</dt><dd>Caracas, Venezuela</dd></div>
              <div><dt className="font-semibold text-white">Ubicación general:</dt><dd>Cerca de Colegio de Ingenieros</dd></div>
              <div><dt className="font-semibold text-white">Ideal para:</dt><dd>Marcas, creadores y proyectos de voz comercial</dd></div>
              <div><dt className="font-semibold text-white">Qué se puede reservar:</dt><dd>Sesión de locución por hora</dd></div>
              <div><dt className="font-semibold text-white">Precio desde:</dt><dd>50 USD</dd></div>
              <div><dt className="font-semibold text-white">CTA:</dt><dd>Reservar en Turpial Sound → /reservas</dd></div>
              <div><dt className="font-semibold text-white">Servicios relacionados:</dt><dd>/servicios/podcast-locucion, /salas-de-ensayo</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Enlaces útiles</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/reservas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Reservar en Turpial Sound</Link>
              <Link href="/salas-de-ensayo" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Salas de ensayo en Caracas</Link>
              <Link href="/recursos/donde-reservar-sala-de-ensayo-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Guía para reservar en Caracas</Link>
              <Link href="/servicios/podcast-locucion" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Ver podcast y locución</Link>
            </div>
          </section>

          <section className="rounded-2xl border border-accent-gold/20 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Servicios relacionados en Caracas</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/salas-de-ensayo/grabacion-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Grabación en Caracas</Link>
              <Link href="/salas-de-ensayo/produccion-musical-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Producción musical en Caracas</Link>
              <Link href="/salas-de-ensayo/mezcla-y-masterizacion-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Mezcla y masterización en Caracas</Link>
              <Link href="/salas-de-ensayo/podcast-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Podcast en Caracas</Link>
              <Link href="/salas-de-ensayo/video-session-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Video session en Caracas</Link>
              <Link href="/salas-de-ensayo/arreglos-musicales-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Arreglos musicales en Caracas</Link>
              <Link href="/salas-de-ensayo/consultoria-musical-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Consultoría musical en Caracas</Link>
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
