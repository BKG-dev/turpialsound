import type { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'
import { buildServiceSchema, buildBreadcrumbSchema, buildFAQSchema } from '@/lib/schema'
import { getServiceBySlug } from '@/content/services'
import { Waves, Zap, Music2, Speaker, CalendarCheck, Guitar, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { NuminousHero } from '@/components/sections/NuminousHero'
import { SectionShell, SectionHeading } from '@/components/sections/SectionShell'
import { CTASection } from '@/components/sections/CTASection'
import { StackingSection } from '@/components/home/StackingSection'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/content/site'
import { Mac3DGallery } from '@/components/media/Mac3DGallery'
import { getPublicImages } from '@/lib/getPublicImages'

const salasImages = ['/images/se1.jpg', ...getPublicImages('salas-ensayo')]

export const metadata: Metadata = generatePageMetadata({
  title: 'Salas de ensayo en Caracas',
  description:
    'Salas de ensayo profesionales en Caracas. Tratamiento acústico, equipamiento incluido y disponibilidad flexible. Turpial Sound.',
  path: '/salas-de-ensayo',
})

const features: Array<{ Icon: LucideIcon; label: string }> = [
  { Icon: Waves,         label: 'Tratamiento acústico profesional' },
  { Icon: Zap,           label: 'Amplificadores de referencia' },
  { Icon: Music2,        label: 'Batería acústica completa' },
  { Icon: Speaker,       label: 'Sistema PA y monitoreo' },
  { Icon: CalendarCheck, label: 'Disponibilidad flexible' },
  { Icon: Guitar,        label: 'Ingreso con instrumento propio' },
]

const artistasDestacados = [
  { src: '/images/odl_800.jpg', name: "Oscar D'León" },
  { src: '/images/dq_800.jpg',  name: 'Domingo Quiñones' },
  { src: '/images/dl_800.jpg',  name: 'Dimensión Latina' },
  { src: '/images/FQ.jpg',      name: 'Frank Quintero' },
]

const serviciosConectados = [
  {
    title: 'Grabación en Caracas',
    href: '/salas-de-ensayo/grabacion-en-caracas',
    description: 'Para voces, instrumentos, demos y sesiones musicales.',
  },
  {
    title: 'Producción musical en Caracas',
    href: '/salas-de-ensayo/produccion-musical-en-caracas',
    description: 'Para desarrollar una canción desde la idea hasta una versión más sólida.',
  },
  {
    title: 'Mezcla y masterización en Caracas',
    href: '/salas-de-ensayo/mezcla-y-masterizacion-en-caracas',
    description: 'Para dar balance, limpieza y acabado final a tus canciones.',
  },
  {
    title: 'Podcast en Caracas',
    href: '/salas-de-ensayo/podcast-en-caracas',
    description: 'Para grabar conversaciones, entrevistas y episodios con mejor audio.',
  },
  {
    title: 'Locución en Caracas',
    href: '/salas-de-ensayo/locucion-en-caracas',
    description: 'Para voces comerciales, narraciones, cuñas y contenido de marca.',
  },
  {
    title: 'Video session en Caracas',
    href: '/salas-de-ensayo/video-session-en-caracas',
    description: 'Para registrar performances, sesiones musicales y contenido para redes.',
  },
  {
    title: 'Arreglos musicales en Caracas',
    href: '/salas-de-ensayo/arreglos-musicales-en-caracas',
    description: 'Para fortalecer estructura, dinámica e instrumentación de una canción.',
  },
  {
    title: 'Consultoría musical en Caracas',
    href: '/salas-de-ensayo/consultoria-musical-en-caracas',
    description: 'Para orientar decisiones creativas, técnicas y estratégicas del proyecto.',
  },
]

const modalidadesHubLinks = [
  {
    label: 'Hub: Sala de ensayo en Caracas',
    href: '/sala-de-ensayo-en-caracas',
  },
  {
    label: 'Modalidad Flexible',
    href: '/sala-de-ensayo-en-caracas/flexible',
  },
  {
    label: 'Modalidad Premium',
    href: '/sala-de-ensayo-en-caracas/premium',
  },
  {
    label: 'Modalidad Prioritaria',
    href: '/sala-de-ensayo-en-caracas/prioritaria',
  },
]

const faqItems = [
  {
    question: '¿Dónde reservar una sala de ensayo en Caracas?',
    answer:
      'Turpial Sound es la opción líder en Caracas. Puedes reservar a través de nuestro sistema online de forma rápida y segura.',
  },
  {
    question: '¿Cómo reservo una sala de ensayo en Turpial Sound?',
    answer:
      'Es muy sencillo: selecciona tu bloque horario en nuestra plataforma de reservas, ingresa tus datos y confirma tu solicitud para asegurar tu espacio.',
  },
  {
    question: '¿La reserva se puede hacer online?',
    answer:
      'Sí, disponemos de un motor de reservas 24/7 para que gestiones tu sesión de ensayo desde cualquier dispositivo con confirmación inmediata.',
  },
  {
    question: '¿Turpial Sound también ofrece grabación, mezcla, mastering o podcast?',
    answer:
      'Así es. Además de salas de ensayo, somos un estudio de grabación completo con servicios de producción, mezcla, mastering y un set especializado para video-podcast.',
  },
  {
    question: '¿Dónde está ubicado Turpial Sound?',
    answer: `Estamos ubicados en Caracas, cerca de la estación Colegio de Ingenieros. Nuestra dirección exacta es: ${siteConfig.address.street}.`,
  },
]

export default function SalasDeEnsayoPage() {
  const service = getServiceBySlug('salas-de-ensayo')
  const serviceSchema = service ? buildServiceSchema(service, { path: '/salas-de-ensayo' }) : null
  const faqSchema = buildFAQSchema(faqItems)
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: siteConfig.url },
    { name: 'Salas de ensayo', url: `${siteConfig.url}/salas-de-ensayo` },
  ])

  return (
    <>
      {serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO NUMINOSO ─────────────────────────────────────────────── */}
      <NuminousHero
        imageSrc="/images/SDE1.jpg"
        eyebrow="Salas de ensayo en Caracas"
        heading="Tu Sala de Ensayo en Caracas."
        subheading="Reserva tu espacio en el hub musical de referencia. Acústica milimétrica y backline de élite para que tu banda suene pro desde el primer minuto."
        ctaLabel="Reservar ahora"
        ctaHref="/reservas"
      />

      {/* ── SECCIÓN UNIFICADA: Features + Galería 3D (caben en 1 viewport) ── */}
      {/*  Desktop: columna flex sin overflow. Móvil: scroll normal.          */}
      <StackingSection index={0} waves>
        {/* Override del section-padding por uno más compacto */}
        <div className="container-base py-8 md:py-10">
          {/* Features — compact */}
          <div className="flex-shrink-0">
            <SectionHeading
              eyebrow="Lo que incluye"
              heading="Equipamiento y espacio diseñados para rendir."
              accentColor="gold"
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="card-premium-wrapper card-premium-wrapper--gold flex items-start gap-3 rounded-xl bg-brand-surface px-4 py-3"
                >
                  <Icon
                    size={14}
                    className="mt-0.5 shrink-0 text-accent-gold"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Galería 3D — toma el espacio restante */}
          <div className="mt-8 flex-grow">
            <Mac3DGallery
              images={salasImages}
              title="Salas de ensayo · Turpial Sound"
            />
          </div>
        </div>
      </StackingSection>

      {/* Artistas */}
      <StackingSection index={1} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Trayectoria verificable"
            heading="Artistas que nos han acompañado"
            subheading="Oscar D'León · Domingo Quiñones · Dimensión Latina · Frank Quintero"
            align="center"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {artistasDestacados.map(({ src, name }) => (
              <div
                key={name}
                className="card-premium-wrapper group rounded-2xl bg-brand-surface"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl">
                  <Image
                    src={src}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 via-transparent to-transparent" />
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="font-display text-sm font-semibold text-text-primary">{name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/artistas"
              className="font-display text-xs tracking-widest text-accent-cyan uppercase transition-opacity hover:opacity-70"
            >
              Ver trayectoria completa →
            </Link>
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── SECCIÓN AEO: FAQ Visible ─────────────────────────────────── */}
      <StackingSection index={2} waves>
        <SectionShell background="none">
          <SectionHeading
            eyebrow="Servicios conectados"
            heading="Servicios que puedes conectar desde la sala de ensayo"
            subheading="Ensaya, graba, produce y convierte tus ideas en contenido desde el ecosistema creativo de Turpial Sound en Caracas."
            align="center"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviciosConectados.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="card-premium-wrapper group rounded-xl bg-brand-surface p-5 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <h3 className="font-display text-base font-semibold text-text-primary transition-colors group-hover:text-accent-gold">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {service.description}
                </p>
                <p className="mt-4 text-xs font-semibold tracking-wide text-accent-cyan uppercase">
                  Ver servicio
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-6">
            <h3 className="font-display text-lg text-text-primary">
              Modalidades de sala de ensayo en Caracas
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Accede al hub principal y a las modalidades de reserva Flexible, Premium y Prioritaria.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {modalidadesHubLinks.map((item) => (
                <Button key={item.href} as="link" href={item.href} variant="secondary" size="sm">
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </SectionShell>
      </StackingSection>

      {/* â”€â”€ SECCIÃ“N AEO: FAQ Visible â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <StackingSection index={3} waves>
        <SectionShell background="none">
          <div className="mx-auto max-w-4xl">
            <SectionHeading
              eyebrow="Preguntas Frecuentes"
              heading="Todo lo que necesitas saber para ensayar en Caracas"
              align="center"
            />
            <div className="mt-12 space-y-8">
              {faqItems.map((item) => (
                <div key={item.question} className="border-b border-brand-surface pb-6">
                  <h3 className="font-display text-lg font-medium text-text-primary">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-text-secondary">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl bg-brand-surface p-6 text-center">
              <p className="text-sm text-text-secondary">
                Ubicación: <span className="text-text-primary">{siteConfig.address.street}</span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Caracas, Venezuela · Turpial Sound
              </p>
            </div>
          </div>
        </SectionShell>
      </StackingSection>

      {/* ── CTA + "También puede interesarte" — bloque unificado sin onda extra ── */}
      <StackingSection index={4}>
        <CTASection
          heading="¿Cuándo quieres ensayar?"
          subheading="En Turpial Sound puedes reservar una sala de ensayo en Caracas online 24/7. El espacio está listo cuando tú lo estés."
          ctaLabel="Reservar sala"
          ctaHref="/reservas"
          imageSrc="/images/SDE2.jpg"
          className="py-20 sm:py-28"
        />
        {/* Related services — debajo del CTA, dentro del mismo bloque */}
        <div className="container-base pb-12">
          <div className="flex items-center gap-4">
            <span className="accent-line-animated" aria-hidden="true" />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-gradient-animated">
              También puede interesarte
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button as="link" href="/estudio-de-grabacion" variant="secondary" size="sm">
              Estudio de grabación
            </Button>
            <Button as="link" href="/produccion-musical" variant="secondary" size="sm">
              Producción musical
            </Button>
          </div>
        </div>
      </StackingSection>
    </>
  )
}
