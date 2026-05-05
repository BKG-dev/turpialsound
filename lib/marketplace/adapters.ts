import type {
  Listing,
  ProductListing,
  ServiceListing,
  MarketplaceUser,
} from '@/types/marketplace'

const SERVICE_CATEGORY_IDS = new Set([
  'musicos-sesion',
  'bandas-eventos',
  'tecnicos-audio-iluminacion',
  'productores-arreglistas',
  'beats',
  'mixing',
  'mastering',
  'vocals',
  'production',
  'arreglos',
  'podcast',
])

const CATEGORY_LABELS: Record<string, string> = {
  'instrumentos-nuevos': 'Instrumentos Nuevos',
  'instrumentos-usados': 'Instrumentos Usados',
  'audio-pro-estudio': 'Audio Pro & Estudio',
  'consumibles': 'Consumibles',
  'alquiler-equipos': 'Alquiler de Equipos',
  'musicos-sesion': 'Musicos de Sesion',
  'bandas-eventos': 'Bandas para Eventos',
  'tecnicos-audio-iluminacion': 'Tecnicos de Audio/Iluminacion',
  'productores-arreglistas': 'Productores & Arreglistas',
  'beats': 'Beats',
  'mixing': 'Mixing',
  'mastering': 'Mastering',
  'vocals': 'Vocals',
  'production': 'Produccion',
  'arreglos': 'Arreglos',
  'podcast': 'Podcast',
}

function buildMarketplaceUser(
  id: string,
  displayName: string,
  isVerified: boolean,
  sellerRating: number | null,
  createdAt: string,
  isService: boolean,
): MarketplaceUser {
  return {
    id,
    name: displayName,
    initials: displayName.slice(0, 2).toUpperCase(),
    role: isService ? 'talent' : 'seller',
    verified: isVerified,
    rating: sellerRating ?? 0,
    reviewCount: 0,
    joinedAt: createdAt,
    location: 'Venezuela',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptDbListing(l: any): Listing {
  const isService = SERVICE_CATEGORY_IDS.has(l.category)
  const price = Number(l.price)
  const createdAtStr =
    l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt)
  const sellerCreatedAtStr =
    l.seller.createdAt instanceof Date
      ? l.seller.createdAt.toISOString()
      : String(l.seller.createdAt)

  const user = buildMarketplaceUser(
    l.seller.id,
    l.seller.displayName,
    l.seller.isVerified,
    l.seller.sellerRating ? Number(l.seller.sellerRating) : null,
    sellerCreatedAtStr,
    isService,
  )

  const images: string[] = l.coverImageUrl
    ? [l.coverImageUrl, ...l.mediaUrls]
    : l.mediaUrls

  // Derive active transaction status
  // We expect l.transactions to be included in the query if we want this to work.
  const activeTx = (l.transactions as Array<{ status: string }> | undefined)?.find((tx) =>
    ![
      'RELEASED',
      'REFUNDED',
      'PAYMENT_FAILED',
      'CANCELLED',
    ].includes(tx.status),
  )

  const activeTransactionStatus = activeTx?.status

  const categoryLabel = CATEGORY_LABELS[l.category] ?? l.category

  let mappedStatus: string = 'active'
  if (l.status === 'SOLD_OUT') mappedStatus = 'sold'
  else if (l.status === 'ARCHIVED') mappedStatus = 'sold'
  else if (l.status === 'PAUSED') mappedStatus = 'draft'
  else if (l.status === 'DRAFT') mappedStatus = 'draft'

  if (isService) {
    return {
      id: l.id,
      slug: l.slug ?? '',
      type: 'service',
      title: l.title,
      description: l.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: l.category as any,
      subcategory: categoryLabel,
      priceFrom: price,
      priceTo: undefined,
      priceLabel: 'por proyecto',
      currency: (l.currency as 'USD' | 'VES') ?? 'USD',
      badge: l.status === 'ACTIVE' ? 'DISPONIBLE' : undefined,
      talent: user,
      status: mappedStatus as Listing['status'],
      activeTransactionStatus,
      createdAt: createdAtStr,
      tags: l.tags ?? [],
    } as ServiceListing
  }

  return {
    id: l.id,
    slug: l.slug ?? '',
    type: 'product',
    title: l.title,
    description: l.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category: l.category as any,
    subcategory: categoryLabel,
    price,
    currency: (l.currency as 'USD' | 'VES') ?? 'USD',
    condition: 'used-good',
    images,
    badge: l.status === 'ACTIVE' ? 'DISPONIBLE' : undefined,
    seller: user,
    status: mappedStatus as Listing['status'],
    activeTransactionStatus,
    createdAt: createdAtStr,
    location: 'Venezuela',
    tags: l.tags ?? [],
  } as ProductListing
}
