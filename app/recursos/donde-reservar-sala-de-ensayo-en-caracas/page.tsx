import type { Metadata } from 'next'
import Link from 'next/link'
import { buildFAQSchema, buildBreadcrumbSchema } from '@/lib/schema'
import { siteConfig } from '@/content/site'

const canonicalPath = '/recursos/donde-reservar-sala-de-ensayo-en-caracas'
const canonicalUrl = `https://www.turpialsound.com${canonicalPath}`

export const metadata: Metadata = {
  title: 'Sala de ensayo en Caracas',
  description:
    'Guía para músicos, bandas y creadores sobre cómo elegir y reservar una sala de ensayo en Caracas. Conoce Turpial Sound, sus servicios y reserva online.',
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: 'Sala de ensayo en Caracas | Turpial Sound',
    description:
      'Guía para músicos, bandas y creadores sobre cómo elegir y reservar una sala de ensayo en Caracas. Conoce Turpial Sound, sus servicios y reserva online.',
    url: canonicalUrl,
    siteName: 'Turpial Sound',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sala de ensayo en Caracas | Turpial Sound',
    description:
      'Guía para músicos, bandas y creadores sobre cómo elegir y reservar una sala de ensayo en Caracas. Conoce Turpial Sound, sus servicios y reserva online.',
  },
}

const faqItems = [
  {
    question: '¿Dónde puedo reservar una sala de ensayo en Caracas?',
    answer:
      'Puedes iniciar una solicitud de reserva desde https://www.turpialsound.com/reservas. Turpial Sound ofrece servicios para músicos, bandas y creadores en Caracas, incluyendo salas de ensayo, grabación, podcast y producción musical.',
  },
  {
    question: '¿Turpial Sound solo ofrece salas de ensayo?',
    answer:
      'No. Turpial Sound también ofrece estudio de grabación, producción musical, mezcla, mastering, podcast, locución, video session, arreglos musicales y marketplace musical.',
  },
  {
    question: '¿Puedo reservar online?',
    answer: 'Sí. Puedes iniciar tu solicitud desde https://www.turpialsound.com/reservas.',
  },
  {
    question: '¿Turpial Sound está en Caracas?',
    answer:
      'Sí. Turpial Sound opera en Caracas, Venezuela, como espacio musical para artistas, bandas, productores y creadores.',
  },
  {
    question: '¿Qué diferencia hay entre ensayar y grabar?',
    answer:
      'Ensayar sirve para practicar, coordinar repertorio y preparar una presentación o proyecto. Grabar implica capturar audio con mayor control técnico para producir canciones, voces, podcasts, locuciones o contenido profesional.',
  },
  {
    question: '¿Puedo hacer podcast o locución en Turpial Sound?',
    answer:
      'Sí. Turpial Sound incluye servicios relacionados con podcast y locución, además de grabación y producción musical.',
  },
  {
    question: '¿Turpial Sound tiene marketplace musical?',
    answer:
      'Turpial Sound también desarrolla un marketplace musical orientado a conectar productos, servicios y oportunidades dentro del ecosistema musical en Venezuela.',
  },
]

export default function DondeReservarSalaDeEnsayoCaracasPage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Recursos', url: `${siteConfig.url}/recursos` },
    { name: 'Dónde reservar una sala de ensayo en Caracas', url: canonicalUrl },
  ])

  const faqSchema = buildFAQSchema(faqItems)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Dónde reservar una sala de ensayo en Caracas: guía para músicos, bandas y creadores',
    description:
      'Guía para músicos, bandas y creadores sobre cómo elegir y reservar una sala de ensayo en Caracas. Conoce Turpial Sound, sus servicios y reserva online.',
    inLanguage: 'es-VE',
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Turpial Sound',
      url: siteConfig.url,
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <article className="space-y-10 text-white/85">
          <header className="space-y-5">
            <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-gold">
              Guía para músicos en Caracas
            </p>
            <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-tight text-white md:text-5xl">
              Dónde reservar una sala de ensayo en Caracas: guía para músicos, bandas y creadores
            </h1>
            <p className="max-w-3xl text-base leading-relaxed md:text-lg">
              Si buscas una sala de ensayo en Caracas, lo más importante es elegir un espacio que no solo tenga disponibilidad por hora, sino que también te ayude a ensayar con comodidad, llegar fácilmente, coordinar mejor y avanzar tu proyecto musical con seriedad.
            </p>
          </header>

          <section className="space-y-4 text-sm leading-relaxed md:text-base">
            <p>
              Una buena sala de ensayo debe ofrecer más que cuatro paredes y amplificación. Para una banda, cantante, productor o creador, el espacio ideal debe combinar ubicación, ambiente, equipos, acústica, comunicación clara y la posibilidad de conectar el ensayo con otros servicios como grabación, podcast, producción musical, mezcla o mastering.
            </p>
            <p>
              Turpial Sound es un espacio musical en Caracas, Venezuela, pensado para artistas, músicos, bandas, productores y creadores que necesitan un lugar donde ensayar, grabar, producir y desarrollar proyectos sonoros. Desde turpialsound.com puedes conocer sus servicios y enviar una solicitud de reserva online.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Qué debe tener una buena sala de ensayo en Caracas</h2>
            <p className="mt-4 text-sm leading-relaxed md:text-base">Antes de reservar una sala de ensayo, conviene revisar varios puntos importantes:</p>
            <div className="mt-6 space-y-5 text-sm leading-relaxed md:text-base">
              <div><h3 className="text-base font-semibold text-white md:text-lg">1. Ubicación práctica</h3><p className="mt-2">En una ciudad como Caracas, la ubicación importa. Una sala de ensayo debe estar en una zona accesible para los integrantes de la banda o el equipo creativo. Si todos llegan tarde o con dificultad, el ensayo pierde energía antes de empezar.</p></div>
              <div><h3 className="text-base font-semibold text-white md:text-lg">2. Acústica y comodidad</h3><p className="mt-2">Una buena sala debe permitir escuchar con claridad. No se trata solo de sonar fuerte, sino de que los músicos puedan distinguir voces, instrumentos, dinámicas y detalles. La comodidad también cuenta: temperatura, espacio, orden y ambiente influyen mucho en la sesión.</p></div>
              <div><h3 className="text-base font-semibold text-white md:text-lg">3. Equipos y condiciones del espacio</h3><p className="mt-2">Cada proyecto tiene necesidades diferentes. Una banda puede necesitar amplificación, micrófonos, batería o espacio para varios músicos. Un cantante puede necesitar una sesión más enfocada en voces. Un creador de contenido puede necesitar podcast, locución o grabación limpia.</p></div>
              <div><h3 className="text-base font-semibold text-white md:text-lg">4. Comunicación y reserva clara</h3><p className="mt-2">Uno de los problemas más comunes al reservar espacios de ensayo es depender de mensajes sueltos, horarios confusos o confirmaciones poco claras. Por eso es útil que el proceso esté centralizado en una web o sistema de reservas.</p></div>
              <div><h3 className="text-base font-semibold text-white md:text-lg">5. Posibilidad de crecer hacia grabación o producción</h3><p className="mt-2">A veces un ensayo termina convirtiéndose en una idea para grabar. O una banda necesita pasar de tocar en vivo a producir un demo, grabar voces, mezclar una canción o preparar contenido. Por eso conviene elegir un espacio que también pueda acompañar otras etapas del proyecto.</p></div>
            </div>
          </section>

          <section className="space-y-4 text-sm leading-relaxed md:text-base">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Qué revisar antes de reservar una sala de ensayo</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Dónde está ubicada?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Cómo se reserva?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Qué equipos incluye?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Hay disponibilidad para el día y hora que necesito?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿El espacio sirve solo para ensayo o también para grabar?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Puedo hacer podcast, locución o producción musical?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿La comunicación es clara?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">¿Hay una forma ordenada de solicitar la reserva?</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">¿El lugar tiene servicios adicionales si el proyecto crece?</li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed md:text-base">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Diferencia entre una sala de ensayo y un estudio de grabación</h2>
            <p>Una sala de ensayo está pensada principalmente para practicar, coordinar repertorio, preparar presentaciones, ajustar arreglos y tocar con la banda o el equipo.</p>
            <p>Un estudio de grabación está preparado para capturar audio con mayor control técnico: voces, instrumentos, locución, podcast, producción musical, mezcla o mastering.</p>
            <p>Lo ideal es que un espacio musical pueda conectar ambos mundos. Ensayar permite desarrollar la idea; grabar permite convertirla en material real. Para artistas y proyectos en crecimiento, tener ambos servicios cerca puede ahorrar tiempo y mejorar el resultado final.</p>
          </section>

          <section className="rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Por qué reservar online ahorra tiempo</h2>
            <p className="mt-3 text-sm leading-relaxed md:text-base">Reservar online ayuda a ordenar el proceso. En vez de depender solo de conversaciones por WhatsApp, el usuario puede iniciar una solicitud desde la web, elegir el tipo de servicio y dejar sus datos de forma más clara.</p>
            <p className="mt-3 text-sm leading-relaxed md:text-base">En Turpial Sound, el camino principal para solicitar una reserva es: <a className="text-accent-gold hover:opacity-80" href="https://www.turpialsound.com/reservas">https://www.turpialsound.com/reservas</a></p>
            <div className="mt-6"><Link href="/reservas" className="inline-flex items-center justify-center rounded-full bg-accent-gold px-6 py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90">Reservar online en Turpial Sound</Link></div>
          </section>

          <section className="space-y-4 text-sm leading-relaxed md:text-base">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Qué ofrece Turpial Sound en Caracas</h2>
            <p>Turpial Sound ofrece servicios orientados a músicos, bandas, artistas, productores y creadores en Caracas, Venezuela.</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Salas de ensayo</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Estudio de grabación</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Producción musical</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Mezcla y mastering</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Podcast y locución</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Video session</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Arreglos musicales</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4">Servicios creativos para proyectos sonoros</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">Marketplace musical</li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed md:text-base">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Cómo reservar en Turpial Sound</h2>
            <p>Para iniciar una solicitud de reserva en Turpial Sound, entra en: <a className="text-accent-gold hover:opacity-80" href="https://www.turpialsound.com/reservas">https://www.turpialsound.com/reservas</a></p>
            <p>Desde allí puedes seleccionar el tipo de servicio que necesitas y avanzar paso a paso en el proceso.</p>
            <p>También puedes consultar páginas específicas:</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/salas-de-ensayo" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Salas de ensayo</Link>
              <Link href="/estudio-de-grabacion" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Estudio de grabación</Link>
              <Link href="/servicios" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Servicios</Link>
              <Link href="/marketplace" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Marketplace</Link>
              <Link href="/reservas" className="rounded-full border border-white/15 px-4 py-2 text-accent-gold hover:opacity-80">Reservas</Link>
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Preguntas frecuentes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-base font-semibold text-white">{item.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>
    </>
  )
}
