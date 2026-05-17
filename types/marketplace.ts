// ─── Turpial Sound Marketplace — Type System ──────────────────────────────────
// Arquitectura tipada para Matchmaking + Escrow de productos y servicios musicales.
// No se implementa Stripe Connect aún — estructura lista para integración backend.

// ─── Enums & Unions ───────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'pending' | 'sold' | 'escrow' | 'draft'
export type ListingType = 'product' | 'service'
export type ProductCondition = 'new' | 'used-like-new' | 'used-good' | 'used-fair'
export type TransactionStatus =
  | 'pending'
  | 'escrow'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled'

export type ProductCategory =
  | 'instrumentos-nuevos'
  | 'instrumentos-usados'
  | 'audio-pro-estudio'
  | 'consumibles'
  | 'alquiler-equipos'

export type ServiceCategory =
  | 'musicos-sesion'
  | 'bandas-eventos'
  | 'tecnicos-audio-iluminacion'
  | 'productores-arreglistas'

export type ModalFlow = 'buy' | 'sell' | 'find-talent' | 'offer-talent' | null
export type ModalStep =
  | 'intent'
  | 'category'
  | 'browse'
  | 'detail'
  | 'form'
  | 'preview'
  | 'success'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface MarketplaceUser {
  id: string
  name: string
  avatar?: string
  initials: string
  role: 'buyer' | 'seller' | 'talent' | 'admin'
  verified: boolean
  rating: number        // 0–5
  reviewCount: number
  joinedAt: string      // ISO date
  location: string
  responseTime?: string // e.g. "< 1 hora"
  bio?: string
  completedDeals?: number
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export type MpTransactionStatus =
  | 'INITIATED'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'VALIDATING'
  | 'PAYMENT_FAILED'
  | 'IN_ESCROW'
  | 'DELIVERY_CONFIRMED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'CANCELLED'

export interface ProductListing {
  id: string
  slug: string
  type: 'product'
  title: string
  description: string
  category: ProductCategory
  subcategory: string
  price: number
  currency: 'USD' | 'VES'
  condition: ProductCondition
  images: string[]          // URLs o placeholders
  quantity?: number         // inventario disponible (default 1)
  seller: MarketplaceUser
  status: ListingStatus
  activeTransactionStatus?: MpTransactionStatus
  createdAt: string
  location: string
  tags: string[]
  rentalAvailable?: boolean
  rentalPricePerDay?: number
  rentalMinDays?: number
  badge?: string            // "NUEVO", "OFERTA", "ALQUILER"
}

export interface ServiceListing {
  id: string
  slug: string
  type: 'service'
  title: string
  description: string
  category: ServiceCategory
  subcategory: string
  priceFrom: number
  priceTo?: number
  currency: 'USD' | 'VES'
  priceLabel: string        // "por sesión", "por evento", etc.
  deliveryDays?: number
  talent: MarketplaceUser
  status: ListingStatus
  activeTransactionStatus?: MpTransactionStatus
  createdAt: string
  tags: string[]
  portfolio?: string[]
  instruments?: string[]
  genres?: string[]
  badge?: string
  availableFrom?: string
}

export type Listing = ProductListing | ServiceListing

// ─── Messaging & Quotes ───────────────────────────────────────────────────────

export interface FormalQuote {
  id: string
  listingId: string
  listingTitle: string
  basePrice: number
  commissionRate: number      // Siempre 0.05 (5%)
  commissionAmount: number    // basePrice * 0.05
  sellerReceives: number      // basePrice - commissionAmount
  buyerPays: number           // = basePrice (comprador paga precio base íntegro)
  currency: 'USD' | 'VES'
  description: string
  validUntil: string          // ISO date
  status: 'pending' | 'accepted' | 'rejected' | 'paid'
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  senderInitials: string
  content: string
  type: 'text' | 'quote' | 'system-warning' | 'system-info'
  quote?: FormalQuote
  createdAt: string
  read: boolean
}

export interface MessageThread {
  id: string
  listingId: string
  listing: Listing
  participants: [MarketplaceUser, MarketplaceUser]  // [buyer, seller]
  messages: Message[]
  transaction?: Transaction
  createdAt: string
  updatedAt: string
}

// ─── Transaction (Escrow) ─────────────────────────────────────────────────────

export interface Transaction {
  id: string
  listingId: string
  listing: Listing
  buyerId: string
  sellerId: string
  quote: FormalQuote
  status: TransactionStatus
  escrowAmount: number
  currency: 'USD' | 'VES'
  createdAt: string
  updatedAt: string
  completedAt?: string
  releasedAt?: string
  disputeReason?: string
  // Stripe Connect — pendiente de implementación
  stripePaymentIntentId?: string
  stripeTransferId?: string
}

// ─── Modal State Machine ──────────────────────────────────────────────────────

export interface ModalState {
  flow: ModalFlow
  step: ModalStep
  selectedCategory?: ProductCategory | ServiceCategory
  selectedListing?: Listing
  formData?: Record<string, unknown>
}

// ─── Category Metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  id: ProductCategory | ServiceCategory
  label: string
  description: string
  icon: string                // Lucide icon name
  accent: 'gold' | 'cyan'
  listingCount?: number
}

// ─── Platform Config ──────────────────────────────────────────────────────────

// ─── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  listingId: string
  slug: string
  title: string
  price: number
  image: string | null
  sellerName: string
  sellerId: string
  quantity: number
  availableQuantity: number
}

export const MARKETPLACE_CONFIG = {
  COMMISSION_RATE: 0.05,         // 5% — asume el vendedor/talento
  MIN_LISTING_PRICE_USD: 1,
  MAX_LISTING_PRICE_USD: 50000,
  ESCROW_HOLD_DAYS: 7,           // Días antes de liberar fondos al vendedor
  PLATFORM_NAME: 'Turpial Market',
  CURRENCY_DEFAULT: 'USD' as const,
} as const
