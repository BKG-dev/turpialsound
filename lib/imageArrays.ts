/**
 * Generates an ordered array of image paths for a given prefix.
 *
 * Pattern: `${basePath}/${prefix}.jpg`, `…/${prefix}1.jpg`, … `…/${prefix}N.jpg`
 *
 * Example: getImageArray('estudio-grabacion', 3)
 * → ['/assets/images/estudio-grabacion.jpg', '…1.jpg', '…2.jpg', '…3.jpg']
 */
export function getImageArray(prefix: string, n: number, basePath = '/images'): string[] {
  return [
    `${basePath}/${prefix}.jpg`,
    ...Array.from({ length: n }, (_, i) => `${basePath}/${prefix}${i + 1}.jpg`),
  ]
}

export const IMAGE_PREFIXES = {
  estudioGrabacion: 'estudio-grabacion',
  salasEnsayo: 'salas-ensayo',
  produccion: 'produccion',
  artistas: 'artistas',
  instalaciones: 'instalaciones',
  experiencia: 'experiencia',
} as const
