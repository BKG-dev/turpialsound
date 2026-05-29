import type { Route } from 'next'
import type { NavItem } from '@/types'

export const mainNavItems: NavItem[] = [
  {
    label: 'Salas de ensayo',
    href: '/salas-de-ensayo',
    children: [
      { label: 'Salas de ensayo', href: '/salas-de-ensayo' },
      { label: 'Grabación en Caracas', href: '/salas-de-ensayo/grabacion-en-caracas' },
      { label: 'Producción musical', href: '/salas-de-ensayo/produccion-musical-en-caracas' },
      { label: 'Mezcla y masterización', href: '/salas-de-ensayo/mezcla-y-masterizacion-en-caracas' },
      { label: 'Podcast', href: '/salas-de-ensayo/podcast-en-caracas' },
      { label: 'Locución', href: '/salas-de-ensayo/locucion-en-caracas' },
      { label: 'Video session', href: '/salas-de-ensayo/video-session-en-caracas' },
      { label: 'Arreglos musicales', href: '/salas-de-ensayo/arreglos-musicales-en-caracas' },
      { label: 'Consultoría musical', href: '/salas-de-ensayo/consultoria-musical-en-caracas' },
    ],
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
  label: 'Reservar ahora',
  href: '/reservas',
}

export const ctaWaHref = 'https://wa.me/58414133305'

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
