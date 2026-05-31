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
  relatedExistingPath?: string
}

export const salaEnsayoModalities: SalaEnsayoModality[] = [
  {
    slug: 'flexible',
    title: 'Sala de ensayo Flexible en Caracas',
    description:
      'Modalidad flexible para ensayar en Caracas con reprogramación previa en caso de solicitudes prioritarias.',
    serviceName: 'Sala de ensayo Flexible en Caracas',
    serviceDescription:
      'Modalidad de sala de ensayo flexible en Turpial Sound para artistas y bandas en Caracas.',
    price: 15,
    priceCurrency: 'USD',
    priceDisplay: '15 USD por hora',
    unitText: 'hora',
    differential: 'Sesión reprogramable con aviso previo si entra una solicitud prioritaria.',
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
    relatedExistingPath: '/salas-de-ensayo',
  },
  {
    slug: 'prioritaria',
    title: 'Sala de ensayo Prioritaria en Caracas',
    description:
      'Modalidad prioritaria para acceder al espacio creativo de Turpial Sound cuando más lo necesitas.',
    serviceName: 'Sala de ensayo Prioritaria en Caracas',
    serviceDescription:
      'Modalidad prioritaria de sala de ensayo para músicos y proyectos en Caracas.',
    price: 25,
    priceCurrency: 'USD',
    priceDisplay: '25 USD por hora',
    unitText: 'hora',
    differential: 'Acceso prioritario al espacio cuando lo necesitas.',
    relatedExistingPath: '/salas-de-ensayo',
  },
  {
    slug: 'grabacion',
    title: 'Grabación en sala de ensayo y estudio en Caracas',
    description:
      'Grabación de voces, instrumentos, demos y sesiones dentro del ecosistema creativo Turpial Sound.',
    serviceName: 'Grabación en sala de ensayo y estudio en Caracas',
    serviceDescription:
      'Servicio de grabación en Caracas para artistas, bandas y creadores dentro del ecosistema Turpial Sound.',
    price: 35,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 35 USD por hora de estudio',
    unitText: 'hora',
    differential: 'Pensado para capturar audio profesional de voces, instrumentos y demos.',
    relatedExistingPath: '/estudio-de-grabacion',
  },
  {
    slug: 'produccion-musical',
    title: 'Producción musical en sala y estudio en Caracas',
    description:
      'Producción musical integral en Caracas para desarrollar temas desde la idea hasta la entrega final.',
    serviceName: 'Producción musical en sala y estudio en Caracas',
    serviceDescription:
      'Servicio de producción musical en Caracas dentro del ecosistema Turpial Sound.',
    price: 200,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 200 USD por tema',
    unitText: 'tema',
    differential: 'Acompañamiento creativo y técnico para estructurar y finalizar canciones.',
    relatedExistingPath: '/produccion-musical',
  },
  {
    slug: 'mezcla-y-masterizacion',
    title: 'Mezcla y masterización en Caracas',
    description:
      'Servicio de mezcla y masterización para material musical dentro del ecosistema Turpial Sound.',
    serviceName: 'Mezcla y masterización en Caracas',
    serviceDescription:
      'Servicio de mezcla y masterización para artistas y proyectos musicales en Caracas.',
    price: 150,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 150 USD por tema',
    unitText: 'tema',
    differential: 'Enfoque técnico para balance, claridad y entrega final.',
    relatedExistingPath: '/servicios/mezcla-masterizacion',
  },
  {
    slug: 'podcast',
    title: 'Podcast en sala de grabación en Caracas',
    description:
      'Producción de podcast en Caracas con enfoque profesional para episodios de audio claros y listos.',
    serviceName: 'Podcast en sala de grabación en Caracas',
    serviceDescription:
      'Servicio de grabación de podcast en Turpial Sound para creadores y marcas en Caracas.',
    price: 100,
    priceCurrency: 'USD',
    priceDisplay: '100 USD por episodio (máximo 4 horas)',
    unitText: 'episodio',
    differential: 'Formato por episodio con máximo de 4 horas de sesión.',
    relatedExistingPath: '/servicios/podcast-locucion',
  },
  {
    slug: 'locucion',
    title: 'Locución profesional en Caracas',
    description:
      'Locución profesional en Caracas para piezas comerciales, narrativas y contenido de marca.',
    serviceName: 'Locución profesional en Caracas',
    serviceDescription:
      'Servicio de locución profesional en Turpial Sound para proyectos audiovisuales y comerciales.',
    price: 50,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 50 USD por hora',
    unitText: 'hora',
    differential: 'Voz grabada con estándar técnico profesional.',
    relatedExistingPath: '/servicios/podcast-locucion',
  },
  {
    slug: 'video-session',
    title: 'Video session con sonido profesional en Caracas',
    description:
      'Video sessions en Caracas con captación de sonido profesional para contenido audiovisual musical.',
    serviceName: 'Video session con sonido profesional en Caracas',
    serviceDescription:
      'Servicio de video session en Turpial Sound con soporte de audio para creadores y artistas.',
    price: 60,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 60 USD por sesión/hora de sonido para video',
    unitText: 'sesión',
    differential: 'Orientado a contenido audiovisual musical con sonido profesional.',
    relatedExistingPath: '/servicios/video-session',
  },
  {
    slug: 'arreglos-musicales',
    title: 'Arreglos musicales en Caracas',
    description:
      'Servicio de arreglos musicales para fortalecer estructura, instrumentación y dirección creativa.',
    serviceName: 'Arreglos musicales en Caracas',
    serviceDescription:
      'Servicio de arreglos musicales en Caracas para proyectos en desarrollo y producción.',
    price: 200,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 200 USD por tema',
    unitText: 'tema',
    differential: 'Trabajo de arreglo enfocado en potenciar el resultado del tema.',
    relatedExistingPath: '/servicios/arreglos-musicales',
  },
  {
    slug: 'consultoria-musical',
    title: 'Consultoría musical en Caracas',
    description:
      'Consultoría musical para tomar decisiones creativas y técnicas dentro del ecosistema Turpial Sound.',
    serviceName: 'Consultoría musical en Caracas',
    serviceDescription:
      'Servicio de consultoría musical en Caracas para artistas, productores y proyectos creativos.',
    price: 80,
    priceCurrency: 'USD',
    priceDisplay: 'Desde 80 USD por hora',
    unitText: 'hora',
    differential: 'Sesión de consultoría para definir enfoque creativo y técnico.',
    relatedExistingPath: '/salas-de-ensayo/consultoria-musical-en-caracas',
  },
]

export function getSalaEnsayoModality(slug: string) {
  return salaEnsayoModalities.find((item) => item.slug === slug)
}
