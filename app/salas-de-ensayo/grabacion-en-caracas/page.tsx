import type { Metadata } from 'next'
import Link from 'next/link'

const canonicalPath = '/salas-de-ensayo/grabacion-en-caracas'
const canonicalUrl = `https://www.turpialsound.com${canonicalPath}`
const heroImage = 'https://www.turpialsound.com/images/estudio-grabacion.jpg'

const faqItems = [
  {
    question: '¿Dónde puedo grabar música en Caracas?',
    answer:
      'En Turpial Sound, Caracas. Puedes iniciar tu solicitud desde la sección de reservas para coordinar tu sesión de grabación.',
  },
  {
    question: '¿Puedo grabar después de ensayar?',
    answer:
      'Sí. Si tu proyecto lo necesita, puedes conectar ensayo y grabación dentro del mismo ecosistema de Turpial Sound.',
  },
  {
    question: '¿Qué tipo de proyectos puedo grabar?',
    answer:
      'Voces, instrumentos, demos, ideas en desarrollo y sesiones enfocadas en material musical listo para producción.',
  },
  {
    question: '¿Cómo reservo una sesión de grabación?',
    answer:
      'Entra en /reservas, selecciona el servicio y deja los datos de tu proyecto para avanzar con tu solicitud.',
  },
  {
    question: '¿La grabación es lo mismo que ensayo?',
    answer:
      'No. El ensayo se enfoca en práctica y coordinación; la grabación se enfoca en capturar audio con criterio técnico.',
  },
  {
    question: '¿Puedo preparar una demo en Turpial?',
    answer:
      'Sí. Turpial Sound puede ayudarte a registrar demos y material base para presentar o seguir produciendo.',
  },
]

export const metadata: Metadata = {
  title: 'Grabación en Caracas',
  description:
    'Grabación en Caracas para artistas y proyectos musicales. En Turpial Sound puedes reservar sesión para voces, instrumentos y demos.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: 'Grabación en Caracas | Turpial Sound',
    description:
      'Grabación en Caracas para artistas y proyectos musicales. Reserva sesión en Turpial Sound.',
    url: canonicalUrl,
    siteName: 'Turpial Sound',
    type: 'website',
    images: [{ url: heroImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grabación en Caracas | Turpial Sound',
    description:
      'Grabación en Caracas para artistas y proyectos musicales. Reserva sesión en Turpial Sound.',
    images: [heroImage],
  },
}

export default function GrabacionEnCaracasPage() {
  const offerId = `${canonicalUrl}#offer`
  const imageId = `${canonicalUrl}#image`

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${canonicalUrl}#service`,
        name: 'Grabación en Caracas',
        serviceType: 'Grabación musical',
        description:
          'Servicio de grabación en Caracas para voces, instrumentos, demos e ideas musicales en Turpial Sound.',
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
        price: 35,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'USD',
          price: 35,
          unitText: 'hora',
        },
        description: 'Grabación desde 35 USD.',
        url: canonicalUrl,
      },
      {
        '@type': 'ImageObject',
        '@id': imageId,
        contentUrl: heroImage,
        url: heroImage,
        caption: 'Grabación en Turpial Sound, Caracas',
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
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: 'https://www.turpialsound.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Salas de ensayo',
            item: 'https://www.turpialsound.com/salas-de-ensayo',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Grabación en Caracas',
            item: canonicalUrl,
          },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
      />

      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <article className="space-y-8 text-white/90">
          <header className="space-y-4">
            <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold">
              Servicio transaccional en Caracas
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
              Grabación en Caracas para artistas y proyectos musicales
            </h1>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img
                src="/images/estudio-grabacion.jpg"
                alt="Sesión de grabación en Turpial Sound"
                className="h-64 w-full object-cover md:h-80"
              />
            </div>
          </header>

          <section className="rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
            <h2 className="text-xl font-semibold text-white">Respuesta rápida</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85 md:text-base">
              Si buscas grabación en Caracas, Turpial Sound te permite reservar sesiones para voces,
              instrumentos, demos y material en desarrollo. Desde la web puedes solicitar el servicio
              y coordinar la modalidad que mejor encaja con tu proyecto musical.
            </p>
            <p className="mt-4">
              <Link href="/reservas" className="text-sm font-semibold text-accent-gold hover:opacity-80">
                Reservar en Turpial Sound
              </Link>
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Datos clave del servicio</h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/85 md:grid-cols-2">
              <div><dt className="font-semibold text-white">Servicio:</dt><dd>Grabación en Caracas</dd></div>
              <div><dt className="font-semibold text-white">Ciudad:</dt><dd>Caracas, Venezuela</dd></div>
              <div><dt className="font-semibold text-white">Ubicación general:</dt><dd>Cerca de Colegio de Ingenieros</dd></div>
              <div><dt className="font-semibold text-white">Ideal para:</dt><dd>Artistas, bandas, voces, demos y proyectos musicales</dd></div>
              <div><dt className="font-semibold text-white">Qué se puede reservar:</dt><dd>Sesión de grabación en Turpial Sound</dd></div>
              <div><dt className="font-semibold text-white">Precio desde:</dt><dd>35 USD</dd></div>
              <div><dt className="font-semibold text-white">CTA:</dt><dd>Reservar en Turpial Sound → /reservas</dd></div>
              <div><dt className="font-semibold text-white">Servicios relacionados:</dt><dd>/estudio-de-grabacion, /salas-de-ensayo</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Enlaces útiles</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/reservas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Reservar en Turpial Sound</Link>
              <Link href="/salas-de-ensayo" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Salas de ensayo en Caracas</Link>
              <Link href="/recursos/donde-reservar-sala-de-ensayo-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Guía para reservar en Caracas</Link>
              <Link href="/estudio-de-grabacion" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Ver estudio de grabación</Link>
            </div>
          </section>

          <section className="rounded-2xl border border-accent-gold/20 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Servicios relacionados en Caracas</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/salas-de-ensayo/produccion-musical-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Producción musical en Caracas</Link>
              <Link href="/salas-de-ensayo/mezcla-y-masterizacion-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Mezcla y masterización en Caracas</Link>
              <Link href="/salas-de-ensayo/podcast-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Podcast en Caracas</Link>
              <Link href="/salas-de-ensayo/locucion-en-caracas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Locución en Caracas</Link>
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
