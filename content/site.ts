import type { SiteConfig } from '@/types'

export const siteConfig: SiteConfig = {
  name: 'Turpial Sound',
  tagline: 'Estudio de grabación y producción musical en Caracas',
  description:
    'Reserva un estudio de grabación en Caracas, Venezuela, con salas de ensayo, producción musical, mezcla, mastering, podcast y servicios creativos en un solo lugar. Turpial Sound conecta artistas, músicos y proyectos con espacio, talento y tecnología para sonar pro.',
  url: 'https://www.turpialsound.com',
  locale: 'es',
  ogLocale: 'es_VE',
  phoneWhatsApp: '+584168017844',
  phoneDisplay: '+58 416-8017844',
  email: 'contacto@turpialsound.com',
  address: {
    street: 'G424+8WW, cerca de Colegio de Ingenieros, Caracas 1010, Distrito Capital, Venezuela',
    city: 'Caracas',
    country: 'Venezuela',
    countryCode: 'VE',
  },
  socialLinks: {
    instagram: "https://www.instagram.com/turpialsound/",
    youtube: "",   // CLIENT_REQUIRED
    spotify: "",   // CLIENT_REQUIRED
  },
}
