import type { Artist } from '@/types'

// CLIENT_REQUIRED: full list of artists authorized for public use
// The names below are CONFIRMED from intake; authorization to publish them
// publicly must be verified before this data is displayed on the site.

export const featuredArtists: Artist[] = [
  { id: 'oscar-dleon', name: 'Oscar D\'León', genre: 'Salsa', verified: true },
  { id: 'domingo-quinones', name: 'Domingo Quiñones', genre: 'Salsa', verified: true },
  { id: 'dimension-latina', name: 'Dimensión Latina', genre: 'Salsa', verified: true },
  // CLIENT_REQUIRED: complete list + authorization for each artist
]
