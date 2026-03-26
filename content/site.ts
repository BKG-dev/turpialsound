import type { SiteConfig } from '@/types'

export const siteConfig: SiteConfig = {
  name: 'Turpial Sound',
  tagline: 'Estudio de grabación y producción musical en Caracas', // SUGGESTED
  description:
    'Hub premium de ensayo, grabación y producción musical en Caracas. Más de 10 años construyendo sonido con artistas reconocidos en Venezuela.', // SUGGESTED
  url: 'https://turpialsound.com', // CLIENT_REQUIRED — confirmar dominio oficial
  locale: 'es',
  phoneWhatsApp: '+58XXXXXXXXXX', // CLIENT_REQUIRED
  phoneDisplay: '+58 XXX XXX XXXX', // CLIENT_REQUIRED
  email: 'info@turpialsound.com', // CLIENT_REQUIRED
  address: {
    street: 'PLACEHOLDER — CLIENT_REQUIRED',
    city: 'Caracas',
    country: 'Venezuela',
    countryCode: 'VE',
  },
  socialLinks: {
    instagram: undefined, // CLIENT_REQUIRED
    youtube: undefined,   // CLIENT_REQUIRED
    spotify: undefined,   // CLIENT_REQUIRED
  },
}
