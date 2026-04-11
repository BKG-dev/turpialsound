import type { Route } from 'next'
import type { NavItem } from '@/types'

export const mainNavItems: NavItem[] = [
  {
    label: 'Salas de ensayo',
    href: '/salas-de-ensayo',
  },
  {
    label: 'Estudio de grabación',
    href: '/estudio-de-grabacion',
  },
  {
    label: 'Producción',
    href: '/produccion-musical',
  },
  {
    label: 'Servicios',
    href: '/servicios',
    children: [
      { label: 'Podcast y locución', href: '/servicios/podcast-locucion' },
      { label: 'Video sessions', href: '/servicios/video-session' },
      { label: 'Mezcla y masterización', href: '/servicios/mezcla-masterizacion' },
      { label: 'Arreglos musicales', href: '/servicios/arreglos-musicales' },
    ],
  },
  {
    label: 'Artistas',
    href: '/artistas',
  },
  {
    label: 'Marketplace',
    href: '/marketplace' as Route,
  },
  {
    label: 'Recursos',
    href: '/recursos',
  },
]

export const ctaNav: { label: string; href: Route } = {
  label: 'Reservar por WhatsApp', // SUGGESTED — CLIENT_REQUIRED for final CTA text
  href: '/contacto',
}

export const footerNavItems: NavItem[] = [
  { label: 'Salas de ensayo', href: '/salas-de-ensayo' },
  { label: 'Estudio de grabación', href: '/estudio-de-grabacion' },
  { label: 'Producción musical', href: '/produccion-musical' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Artistas', href: '/artistas' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Recursos / FAQ', href: '/recursos' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Política de privacidad', href: '/politica-de-privacidad' },
]
