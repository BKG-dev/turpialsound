export const salaEnsayoHubPath = '/sala-de-ensayo-en-caracas' as const

export type SalaEnsayoModality = {
  slug:
    | 'flexible'
    | 'premium'
    | 'prioritaria'
    | 'grabacion'
    | 'produccion-musical'
    | 'mezcla-y-masterizacion'
    | 'podcast'
    | 'locucion'
    | 'video-session'
    | 'arreglos-musicales'
    | 'consultoria-musical'
  title: string
  description: string
  serviceName: string
  serviceDescription: string
  price: number
  priceCurrency: 'USD'
  priceDisplay: string
  unitText: string
  differential: string
  productDescription?: string
  relatedExistingPath?: string
}

export const salaEnsayoProductImage = {
  path: '/images/seo/sala-de-ensayo-turpial-product.jpg',
  width: 1200,
  height: 675,
} as const

export const salaEnsayoModalities: SalaEnsayoModality[] = [
  {
    slug: 'flexible',
    title: 'Sala de ensayo Flexible en Caracas',
    description:
      'Sala de ensayo en Caracas desde 15 USD por hora, con reserva online en Turpial Sound, horarios reservables y opción flexible para bandas y músicos.',
    serviceName: 'Sala de ensayo Flexible en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para reservar tu pauta desde la web en una sala de ensayo y estudio en Caracas con Turpial Sound.',
    price: 15,
    priceCurrency: 'USD',
    priceDisplay: '15 USD por hora',
    unitText: 'hora',
    differential:
      'Reserva tu pauta desde la web con precio publicado y opción reprogramable si entra una solicitud prioritaria.',
    productDescription:
      'Modalidad flexible de sala de ensayo en Caracas para bandas y musicos que necesitan reservar por hora con opcion de reprogramacion bajo condiciones.',
    relatedExistingPath: '/salas-de-ensayo',
  },
  {
    slug: 'premium',
    title: 'Sala de ensayo Premium en Caracas',
    description:
      'Modalidad premium para ensayar con horario fijo y garantizado dentro del ecosistema Turpial Sound.',
    serviceName: 'Sala de ensayo Premium en Caracas',
    serviceDescription:
      'Modalidad premium de sala de ensayo con horario garantizado en Turpial Sound Caracas.',
    price: 20,
    priceCurrency: 'USD',
    priceDisplay: '20 USD por hora',
    unitText: 'hora',
    differential: 'Horario fijo y garantizado, no sujeto a cambios.',
    productDescription:
      'Modalidad premium de sala de ensayo en Caracas con horario fijo y garantizado dentro del ecosistema Turpial Sound.',
    relatedExistingPath: '/salas-de-ensayo',
  },
  {
    slug: 'prioritaria',
    title: 'Sala de ensayo Prioritaria en Caracas',
    description:
      'Sala de ensayo prioritaria en Caracas desde 25 USD por hora, con reserva online y horarios reservables para proyectos que necesitan mayor prioridad.',
    serviceName: 'Sala de ensayo Prioritaria en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para músicos, bandas y equipos que necesitan reservar online una sesión prioritaria en Turpial Sound.',
    price: 25,
    priceCurrency: 'USD',
    priceDisplay: '25 USD por hora',
    unitText: 'hora',
    differential:
      'Precio publicado y prioridad de horario para reservar tu pauta desde la web cuando el proyecto necesita mayor urgencia.',
    productDescription:
      'Modalidad prioritaria de sala de ensayo en Caracas para solicitudes urgentes o acceso preferente al espacio creativo de Turpial Sound.',
    relatedExistingPath: '/salas-de-ensayo',
  },
  {
    slug: 'grabacion',
    title: 'Grabación en sala de ensayo y estudio en Caracas',
    description:
      'Grabación en sala de ensayo y estudio en Caracas desde 35 USD por hora de estudio, con reserva online de sesión dentro del ecosistema Turpial Sound.',
    serviceName: 'Grabación en sala de ensayo y estudio en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para reservar una sesión de grabación de voces, instrumentos, demos y pautas creativas desde la web.',
    price: 35,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 35 USD por hora de estudio',
    unitText: 'hora',
    differential:
      'Reserva online en Turpial Sound para capturar audio profesional en una sala de ensayo y estudio en Caracas.',
    relatedExistingPath: '/estudio-de-grabacion',
  },
  {
    slug: 'produccion-musical',
    title: 'Producción musical en sala y estudio en Caracas',
    description:
      'Producción musical en Caracas desde 200 USD por tema, con solicitud o reserva de sesión dentro del ecosistema Turpial Sound.',
    serviceName: 'Producción musical en sala y estudio en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para desarrollar canciones y proyectos con precio publicado dentro de la sala de ensayo y estudio de Turpial Sound.',
    price: 200,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 200 USD por tema',
    unitText: 'tema',
    differential:
      'Sesiones reservables para avanzar arreglos, estructura y dirección creativa con acompañamiento técnico.',
    relatedExistingPath: '/produccion-musical',
  },
  {
    slug: 'mezcla-y-masterizacion',
    title: 'Mezcla y masterización en Caracas',
    description:
      'Mezcla y masterización en Caracas desde 150 USD por tema, con solicitud o reserva de sesión profesional en Turpial Sound.',
    serviceName: 'Mezcla y masterización en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para proyectos musicales que necesitan mezcla, masterización y precio publicado dentro del ecosistema Turpial Sound.',
    price: 150,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 150 USD por tema',
    unitText: 'tema',
    differential:
      'Reserva o solicita tu sesión profesional para mejorar balance, claridad y entrega final.',
    relatedExistingPath: '/servicios/mezcla-masterizacion',
  },
  {
    slug: 'podcast',
    title: 'Podcast en sala de grabación en Caracas',
    description:
      'Podcast en sala de grabación en Caracas por 100 USD por episodio de hasta 4 horas, con reserva online en Turpial Sound.',
    serviceName: 'Podcast en sala de grabación en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para creadores, marcas y equipos que necesitan horarios reservables para grabar podcast desde la web.',
    price: 100,
    priceCurrency: 'USD',
    priceDisplay: '100 USD por episodio (máximo 4 horas)',
    unitText: 'episodio',
    differential:
      'Precio publicado por episodio y reserva online de sesión en sala de grabación y estudio en Caracas.',
    relatedExistingPath: '/servicios/podcast-locucion',
  },
  {
    slug: 'locucion',
    title: 'Locución profesional en Caracas',
    description:
      'Locución profesional en Caracas desde 50 USD por hora, con reserva de sesión de voz dentro del ecosistema Turpial Sound.',
    serviceName: 'Locución profesional en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para reservar online una sesión de locución profesional para piezas comerciales, narrativas y contenido de marca.',
    price: 50,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 50 USD por hora',
    unitText: 'hora',
    differential:
      'Solicitud o reserva de sesión con precio publicado para grabar voz con estándar técnico profesional.',
    relatedExistingPath: '/servicios/podcast-locucion',
  },
  {
    slug: 'video-session',
    title: 'Video session con sonido profesional en Caracas',
    description:
      'Video session con sonido profesional en Caracas desde 60 USD por sesión u hora de sonido para video, con reserva online en Turpial Sound.',
    serviceName: 'Video session con sonido profesional en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para artistas y creadores que necesitan reservar una sesión audiovisual con sonido profesional desde la web.',
    price: 60,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 60 USD por sesión/hora de sonido para video',
    unitText: 'sesión',
    differential:
      'Horarios reservables para grabar contenido musical con soporte técnico y audio profesional.',
    relatedExistingPath: '/servicios/video-session',
  },
  {
    slug: 'arreglos-musicales',
    title: 'Arreglos musicales en Caracas',
    description:
      'Arreglos musicales en Caracas desde 200 USD por tema, con solicitud o reserva de sesión para proyectos musicales en Turpial Sound.',
    serviceName: 'Arreglos musicales en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para trabajar arreglos, estructura e instrumentación con precio publicado dentro del ecosistema creativo.',
    price: 200,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 200 USD por tema',
    unitText: 'tema',
    differential:
      'Reserva o solicita una sesión para fortalecer el tema antes de grabar, producir o lanzar el proyecto.',
    relatedExistingPath: '/servicios/arreglos-musicales',
  },
  {
    slug: 'consultoria-musical',
    title: 'Consultoría musical en Caracas',
    description:
      'Consultoría musical en Caracas desde 80 USD por hora, con reserva de sesión de orientación profesional en Turpial Sound.',
    serviceName: 'Consultoría musical en Caracas',
    serviceDescription:
      'Modalidad disponible en Caracas para artistas, productores y proyectos que necesitan reservar online una sesión de consultoría musical con precio publicado.',
    price: 80,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 80 USD por hora',
    unitText: 'hora',
    differential:
      'Solicitud o reserva de sesión para tomar decisiones creativas y técnicas dentro de la sala de ensayo y estudio en Caracas.',
    relatedExistingPath: '/salas-de-ensayo/consultoria-musical-en-caracas',
  },
]

export function getSalaEnsayoModality(slug: string) {
  return salaEnsayoModalities.find((item) => item.slug === slug)
}
